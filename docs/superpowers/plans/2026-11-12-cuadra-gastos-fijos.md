# Cuadra: gastos fijos — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los cargos mensuales de importe fijo que el banco no avisa (alquiler, seguro, gimnasio…) se creen solos en Cuadra el día del cargo.

**Architecture:** Tabla nueva `gastos_fijos` (plantillas) y columna `transactions.gasto_fijo_id`. Una función pura (`lib/fijos.ts`) calcula qué movimientos faltan para cada fijo; `lib/generar-fijos.ts` los inserta con `upsert` al cargar Inicio, Estadísticas y Pendientes, y avanza `ultimo_mes`. Los fijos se crean desde Añadir con "Repetir cada mes" y se gestionan en `/fijos`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript 5.9, Supabase (Postgres + `@supabase/ssr`), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-12-cuadra-gastos-fijos-design.md`

## Global Constraints

- Sin dependencias npm nuevas. Solo modo claro. Identidad "libreta de cuadros" (tokens de `app/globals.css`).
- Valores de `origen` en base de datos: exactamente `'manual'`, `'wallet'`, `'sms'`, `'fijo'`.
- `importe` siempre positivo. Un fijo siempre es `tipo = 'gasto'`.
- Fechas en hora de Madrid con los helpers de `lib/dates.ts` (`ZONA`, `horaLocalAUtc`, `mesActual`). Nunca `new Date(y, m, d)` en hora local del servidor.
- `ultimo_mes` se guarda como texto `"YYYY-MM-01"` (columna `date`).
- Tope de recuperación: 12 meses (`MAX_MESES_ATRASADOS = 12`).
- Imports entre archivos de `lib/` con extensión `.ts`; los componentes usan el alias `@/`.
- Antes de escribir código de Next, leer la guía relevante en `node_modules/next/dist/docs/01-app/` (Server Actions / `useActionState`, `params` como Promise) y seguir los patrones ya presentes en `app/`.
- Commits locales en la rama `gastos-fijos`. **Nada de `git push` sin permiso explícito del usuario**, y nunca antes de que el usuario confirme que la migración `0004` está aplicada en Supabase.
- Al terminar, actualizar `STATUS.md` (regla de `CLAUDE.md`).

## Review Focus

1. Fijo creado desde Añadir con una fecha de un mes pasado (p. ej. septiembre, hoy noviembre): debe generar octubre y noviembre (si ya pasó el día), no duplicar septiembre (Task 2, test "alta con fecha pasada").
2. Reactivar un fijo que se pausó después de generar el mes actual: no debe volver a crear el de este mes (Task 2, test `ultimoMesAlGuardar` con `ultimo_mes` = mes actual).
3. Día 31 en meses cortos y en febrero bisiesto/no bisiesto, y día de cargo justo a medianoche de Madrid en cambio de hora (Task 2).
4. "Repetir cada mes" marcado en una devolución o al editar: se ignora sin error (Task 3).
5. Fallo al insertar el movimiento tras crear el fijo: no debe quedar un fijo huérfano (Task 5, paso de rollback); fallo de generación: la página carga igualmente (Task 4).

---

### Task 1: Rama, migración `0004` y tipos

**Files:**
- Create: `supabase/migrations/0004_gastos_fijos.sql`
- Modify: `lib/types.ts`, `app/FilaMovimiento.tsx:19`, `SETUP.md:53`

**Interfaces:**
- Produces (en `lib/types.ts`):
  - `Movimiento.origen: "manual" | "wallet" | "sms" | "fijo"` y `Movimiento.gasto_fijo_id?: string | null`.
  - `COLUMNAS_MOVIMIENTO` incluye `gasto_fijo_id`.
  - `type GastoFijo = { id: string; comercio: string; importe: number; categoria_id: string | null; dia: number; activo: boolean; ultimo_mes: string; categories: { nombre: string } | null }`
  - `const COLUMNAS_FIJO = "id, comercio, importe, categoria_id, dia, activo, ultimo_mes, categories(nombre)"`
  - (`EstadoFijo` se añade en Task 3, junto a `ValoresFijo`.)

- [ ] **Step 1: Crear la rama**

```bash
git checkout -b gastos-fijos
```

- [ ] **Step 2: Comprobar el nombre de la restricción de `origen`**

En `supabase/migrations/0001_init.sql` la restricción es inline (`check (origen in (...))`) sin nombre, así que Postgres la llama `transactions_origen_check`. Si el usuario puede, que lo confirme en Supabase con:

```sql
select conname from pg_constraint where conrelid = 'public.transactions'::regclass and contype = 'c';
```

- [ ] **Step 3: Escribir la migración**

`supabase/migrations/0004_gastos_fijos.sql`:

```sql
-- Gastos fijos: cargos mensuales del mismo importe que el banco no avisa (alquiler, seguro, gimnasio…).
-- Cuadra crea el movimiento de cada mes al abrir la app. Se puede ejecutar varias veces.
-- Ejecutar en Supabase: SQL Editor → pegar → Run. Primero la migración y después desplegar el código.

create table if not exists public.gastos_fijos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  comercio text not null check (length(trim(comercio)) > 0),
  importe numeric(12, 2) not null check (importe > 0),
  categoria_id uuid references public.categories (id) on delete set null,
  dia smallint not null check (dia between 1 and 31),
  activo boolean not null default true,
  -- Primer día del último mes ya generado (o en el que se creó). Nunca se rellena antes de él.
  ultimo_mes date not null,
  created_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists gasto_fijo_id uuid references public.gastos_fijos (id) on delete set null;

alter table public.transactions drop constraint if exists transactions_origen_check;
alter table public.transactions
  add constraint transactions_origen_check check (origen in ('manual', 'wallet', 'sms', 'fijo'));

-- Un fijo no puede generar dos movimientos en el mismo instante: evita duplicados si dos cargas coinciden.
-- No es parcial a propósito: el upsert de PostgREST (ON CONFLICT) no encaja con un índice parcial.
-- Los movimientos sin fijo no chocan entre sí porque en Postgres los NULL son distintos.
create unique index if not exists transactions_fijo_fecha_idx
  on public.transactions (gasto_fijo_id, fecha);

grant select, insert, update, delete on public.gastos_fijos to authenticated, service_role;

alter table public.gastos_fijos enable row level security;
drop policy if exists "gastos_fijos: solo el propietario" on public.gastos_fijos;
create policy "gastos_fijos: solo el propietario"
  on public.gastos_fijos for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

notify pgrst, 'reload schema';
```

- [ ] **Step 4: Tipos en `lib/types.ts`**

Cambiar `origen` y añadir el campo y las columnas:

```ts
export type Movimiento = {
  id: string;
  fecha: string;
  importe: number | null;
  moneda: string;
  comercio: string | null;
  categoria_id: string | null;
  origen: "manual" | "wallet" | "sms" | "fijo";
  texto_original: string | null;
  revisado: boolean;
  tipo: TipoMovimiento;
  /** Fijo del que viene (creado desde Añadir con "Repetir cada mes" o generado cada mes). */
  gasto_fijo_id?: string | null;
  categories: { nombre: string } | null;
};

export const COLUMNAS_MOVIMIENTO =
  "id, fecha, importe, moneda, comercio, categoria_id, origen, texto_original, revisado, tipo, gasto_fijo_id, categories(nombre)";

/** Plantilla de un gasto que se repite cada mes por el mismo importe. */
export type GastoFijo = {
  id: string;
  comercio: string;
  importe: number;
  categoria_id: string | null;
  /** Día del cargo (1–31). En meses más cortos, el último día del mes. */
  dia: number;
  activo: boolean;
  /** "YYYY-MM-01": último mes ya generado. */
  ultimo_mes: string;
  categories: { nombre: string } | null;
};

export const COLUMNAS_FIJO = "id, comercio, importe, categoria_id, dia, activo, ultimo_mes, categories(nombre)";
```

- [ ] **Step 5: `FilaMovimiento` acepta el origen nuevo**

En `app/FilaMovimiento.tsx`, sustituir la línea 19 `origen: "manual" | "wallet" | "sms";` por:

```ts
  origen: Movimiento["origen"];
```

y añadir `import type { Movimiento } from "@/lib/types";`.

- [ ] **Step 6: Icono de origen "fijo"**

En `app/Iconos.tsx`, añadir a `ORIGEN` (flechas en círculo):

```ts
  fijo: { titulo: "Gasto fijo", d: "M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" },
```

- [ ] **Step 7: SETUP.md**

En `SETUP.md:53`, tras `0003_categoria_deporte.sql (la categoría Deporte)`, añadir: `, y después con supabase/migrations/0004_gastos_fijos.sql (los gastos fijos)` — manteniendo la frase sobre migraciones futuras con `0005_…`.

- [ ] **Step 8: Comprobar tipos y tests**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores; todos los tests pasan (nada usa todavía el origen nuevo).

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/0004_gastos_fijos.sql lib/types.ts app/FilaMovimiento.tsx app/Iconos.tsx SETUP.md
git commit -m "Gastos fijos: migración 0004, tipos e icono de origen"
```

---

### Task 2: Lógica pura de fijos (`lib/fijos.ts`)

**Files:**
- Create: `lib/fijos.ts`
- Test: `tests/fijos.test.ts`

**Interfaces:**
- Consumes: `horaLocalAUtc`, `mesActual`, `desplazarMes`, `type Mes` de `lib/dates.ts`.
- Produces:
  - `const MAX_MESES_ATRASADOS = 12`
  - `type FijoParaGenerar = { id: string; comercio: string; importe: number; categoria_id: string | null; dia: number; activo: boolean; ultimo_mes: string }`
  - `type FilaFijo = { tipo: "gasto"; origen: "fijo"; revisado: true; moneda: "EUR"; importe: number; comercio: string; categoria_id: string | null; gasto_fijo_id: string; fecha: string }`
  - `primerDiaDeMes(mes: Mes): string` → `"YYYY-MM-01"`
  - `diaDeCargo(mes: Mes, dia: number): number`
  - `generacionPendiente(fijo: FijoParaGenerar, ahora: Date): { filas: FilaFijo[]; ultimo_mes: string } | null`
  - `ultimoMesAlGuardar(antes: { activo: boolean; ultimo_mes: string }, activoAhora: boolean, ahora: Date): string`
  - `resumenFijos(fijos: { importe: number; activo: boolean }[]): { cuantos: number; alMes: number }`
  - `ordenarFijos<T extends { activo: boolean; dia: number; comercio: string }>(fijos: T[]): T[]`

- [ ] **Step 1: Escribir los tests**

`tests/fijos.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diaDeCargo,
  generacionPendiente,
  ordenarFijos,
  primerDiaDeMes,
  resumenFijos,
  ultimoMesAlGuardar,
  type FijoParaGenerar,
} from "../lib/fijos.ts";

const fijo = (extra: Partial<FijoParaGenerar> = {}): FijoParaGenerar => ({
  id: "f1",
  comercio: "Alquiler",
  importe: 650,
  categoria_id: "hogar",
  dia: 5,
  activo: true,
  ultimo_mes: "2026-10-01",
  ...extra,
});
const fechas = (r: ReturnType<typeof generacionPendiente>) => r?.filas.map((f) => f.fecha) ?? [];

test("primerDiaDeMes y diaDeCargo", () => {
  assert.equal(primerDiaDeMes({ y: 2026, m: 3 }), "2026-03-01");
  assert.equal(diaDeCargo({ y: 2026, m: 4 }, 31), 30);
  assert.equal(diaDeCargo({ y: 2027, m: 2 }, 31), 28);
  assert.equal(diaDeCargo({ y: 2028, m: 2 }, 30), 29);
  assert.equal(diaDeCargo({ y: 2026, m: 11 }, 5), 5);
});

test("antes del día de cargo no hay nada; a medianoche de Madrid, sí", () => {
  // 4 nov, 23:00 en Madrid (CET, +1)
  assert.equal(generacionPendiente(fijo(), new Date("2026-11-04T22:00:00Z")), null);
  // 5 nov, 00:00 en Madrid
  const r = generacionPendiente(fijo(), new Date("2026-11-04T23:00:00Z"));
  assert.deepEqual(r, {
    ultimo_mes: "2026-11-01",
    filas: [
      {
        tipo: "gasto",
        origen: "fijo",
        revisado: true,
        moneda: "EUR",
        importe: 650,
        comercio: "Alquiler",
        categoria_id: "hogar",
        gasto_fijo_id: "f1",
        fecha: "2026-11-05T11:00:00.000Z", // 12:00 en Madrid
      },
    ],
  });
});

test("en horario de verano la fecha sigue siendo las 12:00 de Madrid", () => {
  const r = generacionPendiente(fijo({ dia: 15, ultimo_mes: "2026-06-01" }), new Date("2026-07-20T10:00:00Z"));
  assert.deepEqual(fechas(r), ["2026-07-15T10:00:00.000Z"]);
});

test("recupera varios meses atrasados, cruzando el cambio de hora", () => {
  const r = generacionPendiente(fijo({ dia: 1, ultimo_mes: "2026-08-01" }), new Date("2026-11-12T10:00:00Z"));
  assert.deepEqual(fechas(r), ["2026-09-01T10:00:00.000Z", "2026-10-01T10:00:00.000Z", "2026-11-01T11:00:00.000Z"]);
  assert.equal(r?.ultimo_mes, "2026-11-01");
});

test("si este mes aún no toca, ultimo_mes queda en el último generado", () => {
  const r = generacionPendiente(fijo({ dia: 20, ultimo_mes: "2026-09-01" }), new Date("2026-11-12T10:00:00Z"));
  assert.deepEqual(fechas(r), ["2026-10-20T10:00:00.000Z"]);
  assert.equal(r?.ultimo_mes, "2026-10-01");
});

test("alta con fecha pasada: no repite el mes del alta y sigue desde el siguiente", () => {
  // Creado desde Añadir con un movimiento de septiembre: ultimo_mes = septiembre.
  const r = generacionPendiente(fijo({ dia: 10, ultimo_mes: "2026-09-01" }), new Date("2026-11-12T10:00:00Z"));
  assert.deepEqual(fechas(r), ["2026-10-10T10:00:00.000Z", "2026-11-10T11:00:00.000Z"]);
});

test("como mucho recupera los 12 meses más recientes", () => {
  const r = generacionPendiente(fijo({ dia: 1, ultimo_mes: "2024-01-01" }), new Date("2026-11-12T10:00:00Z"));
  assert.equal(r?.filas.length, 12);
  assert.equal(r?.filas[0].fecha, "2025-12-01T11:00:00.000Z");
  assert.equal(r?.filas[11].fecha, "2026-11-01T11:00:00.000Z");
  assert.equal(r?.ultimo_mes, "2026-11-01");
});

test("día 31 en febrero: el último día del mes, bisiesto o no", () => {
  const f27 = fijo({ dia: 31, ultimo_mes: "2027-01-01" });
  assert.equal(generacionPendiente(f27, new Date("2027-02-27T12:00:00Z")), null);
  assert.deepEqual(fechas(generacionPendiente(f27, new Date("2027-02-28T12:00:00Z"))), ["2027-02-28T11:00:00.000Z"]);
  const f28 = fijo({ dia: 31, ultimo_mes: "2028-01-01" });
  assert.equal(generacionPendiente(f28, new Date("2028-02-28T12:00:00Z")), null);
  assert.deepEqual(fechas(generacionPendiente(f28, new Date("2028-02-29T12:00:00Z"))), ["2028-02-29T11:00:00.000Z"]);
});

test("cambio de año", () => {
  const r = generacionPendiente(fijo({ dia: 10, ultimo_mes: "2026-12-01" }), new Date("2027-01-15T10:00:00Z"));
  assert.deepEqual(fechas(r), ["2027-01-10T11:00:00.000Z"]);
  assert.equal(r?.ultimo_mes, "2027-01-01");
});

test("pausado, ya generado o con ultimo_mes futuro: nada", () => {
  const ahora = new Date("2026-11-12T10:00:00Z");
  assert.equal(generacionPendiente(fijo({ activo: false, ultimo_mes: "2026-08-01" }), ahora), null);
  assert.equal(generacionPendiente(fijo({ ultimo_mes: "2026-11-01" }), ahora), null);
  assert.equal(generacionPendiente(fijo({ ultimo_mes: "2027-03-01" }), ahora), null);
});

test("ultimoMesAlGuardar: al reactivar no rellena la pausa ni repite este mes", () => {
  const ahora = new Date("2026-11-12T10:00:00Z");
  assert.equal(ultimoMesAlGuardar({ activo: true, ultimo_mes: "2026-08-01" }, true, ahora), "2026-08-01");
  assert.equal(ultimoMesAlGuardar({ activo: true, ultimo_mes: "2026-08-01" }, false, ahora), "2026-08-01");
  assert.equal(ultimoMesAlGuardar({ activo: false, ultimo_mes: "2026-05-01" }, true, ahora), "2026-10-01");
  assert.equal(ultimoMesAlGuardar({ activo: false, ultimo_mes: "2026-11-01" }, true, ahora), "2026-11-01");
});

test("resumenFijos cuenta todos y suma solo los activos", () => {
  assert.deepEqual(
    resumenFijos([
      { importe: 650, activo: true },
      { importe: 29.99, activo: true },
      { importe: 45, activo: false },
    ]),
    { cuantos: 3, alMes: 679.99 },
  );
  assert.deepEqual(resumenFijos([]), { cuantos: 0, alMes: 0 });
});

test("ordenarFijos: activos por día y después los pausados", () => {
  const orden = ordenarFijos([
    { comercio: "Inglés", dia: 2, activo: false },
    { comercio: "Gimnasio", dia: 5, activo: true },
    { comercio: "Alquiler", dia: 1, activo: true },
    { comercio: "Seguro", dia: 5, activo: true },
  ]).map((f) => f.comercio);
  assert.deepEqual(orden, ["Alquiler", "Gimnasio", "Seguro", "Inglés"]);
});
```

- [ ] **Step 2: Ver que fallan**

Run: `node --test tests/fijos.test.ts`
Expected: FAIL, `Cannot find module '../lib/fijos.ts'`.

- [ ] **Step 3: Implementar `lib/fijos.ts`**

```ts
import { desplazarMes, horaLocalAUtc, mesActual, type Mes } from "./dates.ts";

/** Si hace mucho que no se abre la app, solo se recuperan los últimos 12 meses. */
export const MAX_MESES_ATRASADOS = 12;

export type FijoParaGenerar = {
  id: string;
  comercio: string;
  importe: number;
  categoria_id: string | null;
  dia: number;
  activo: boolean;
  /** "YYYY-MM-01": último mes ya generado. */
  ultimo_mes: string;
};

/** Fila lista para insertar en `transactions`. */
export type FilaFijo = {
  tipo: "gasto";
  origen: "fijo";
  revisado: true;
  moneda: "EUR";
  importe: number;
  comercio: string;
  categoria_id: string | null;
  gasto_fijo_id: string;
  fecha: string;
};

const z2 = (n: number) => String(n).padStart(2, "0");
const indice = (mes: Mes) => mes.y * 12 + (mes.m - 1);
const deIndice = (i: number): Mes => ({ y: Math.floor(i / 12), m: (i % 12) + 1 });

export function primerDiaDeMes(mes: Mes): string {
  return `${mes.y}-${z2(mes.m)}-01`;
}

function mesDeFecha(fecha: string): Mes {
  const [y, m] = fecha.split("-").map(Number);
  return { y, m };
}

/** Día del cargo en ese mes: si el mes es más corto (31 en febrero), el último día. */
export function diaDeCargo(mes: Mes, dia: number): number {
  const diasDelMes = new Date(Date.UTC(mes.y, mes.m, 0)).getUTCDate();
  return Math.min(dia, diasDelMes);
}

/**
 * Movimientos que faltan de un fijo hasta `ahora` (hora de Madrid) y el nuevo `ultimo_mes`,
 * o null si no falta ninguno. Un mes cuenta desde las 00:00 de su día de cargo; el movimiento
 * se fecha ese día a las 12:00.
 */
export function generacionPendiente(
  fijo: FijoParaGenerar,
  ahora: Date,
): { filas: FilaFijo[]; ultimo_mes: string } | null {
  if (!fijo.activo) return null;
  const actual = indice(mesActual(ahora));
  const desde = Math.max(indice(mesDeFecha(fijo.ultimo_mes)) + 1, actual - (MAX_MESES_ATRASADOS - 1));

  const filas: FilaFijo[] = [];
  let ultimo: Mes | null = null;
  for (let i = desde; i <= actual; i++) {
    const mes = deIndice(i);
    const dia = `${mes.y}-${z2(mes.m)}-${z2(diaDeCargo(mes, fijo.dia))}`;
    if (ahora < horaLocalAUtc(`${dia}T00:00`)!) break;
    filas.push({
      tipo: "gasto",
      origen: "fijo",
      revisado: true,
      moneda: "EUR",
      importe: fijo.importe,
      comercio: fijo.comercio,
      categoria_id: fijo.categoria_id,
      gasto_fijo_id: fijo.id,
      fecha: horaLocalAUtc(`${dia}T12:00`)!.toISOString(),
    });
    ultimo = mes;
  }
  return ultimo ? { filas, ultimo_mes: primerDiaDeMes(ultimo) } : null;
}

/**
 * `ultimo_mes` al guardar un fijo. Al reactivarlo no se rellenan los meses en pausa: pasa al mes
 * anterior al actual, salvo que ya se hubiera generado este mes (entonces se queda, para no repetirlo).
 */
export function ultimoMesAlGuardar(antes: { activo: boolean; ultimo_mes: string }, activoAhora: boolean, ahora: Date): string {
  if (antes.activo || !activoAhora) return antes.ultimo_mes;
  const anterior = primerDiaDeMes(desplazarMes(mesActual(ahora), -1));
  return antes.ultimo_mes > anterior ? antes.ultimo_mes : anterior;
}

/** Cuántos fijos hay y cuánto suman al mes los activos. */
export function resumenFijos(fijos: { importe: number; activo: boolean }[]): { cuantos: number; alMes: number } {
  const alMes = fijos.filter((f) => f.activo).reduce((s, f) => s + Number(f.importe), 0);
  return { cuantos: fijos.length, alMes: Math.round(alMes * 100) / 100 };
}

/** Activos primero, por día del cargo y nombre; después los pausados, igual. */
export function ordenarFijos<T extends { activo: boolean; dia: number; comercio: string }>(fijos: T[]): T[] {
  return [...fijos].sort(
    (a, b) => Number(b.activo) - Number(a.activo) || a.dia - b.dia || a.comercio.localeCompare(b.comercio, "es"),
  );
}
```

- [ ] **Step 4: Ver que pasan**

Run: `node --test tests/fijos.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/fijos.ts tests/fijos.test.ts
git commit -m "Gastos fijos: cálculo de los movimientos pendientes de cada mes"
```

---

### Task 3: Lectura de formularios (`lib/formulario.ts`)

**Files:**
- Modify: `lib/formulario.ts`, `lib/types.ts`
- Test: `tests/formulario.test.ts`

**Interfaces:**
- Produces:
  - `DatosMovimiento.repetir: { dia: number; comercio: string } | null`
  - `ValoresFormulario` gana `repetir: boolean; dia: string`
  - `type DatosFijo = { importe: number; comercio: string; categoria_id: string | null; dia: number; activo: boolean }`
  - `leerFormularioFijo(fd: FormData): { ok: true; datos: DatosFijo } | { ok: false; error: string }`
  - `type ValoresFijo = { importe: string; comercio: string; categoria_id: string; dia: string; activo: boolean }`
  - `valoresFijoEnviados(fd: FormData): ValoresFijo`
  - En `lib/types.ts`: `type EstadoFijo = { error: string | null; valores?: ValoresFijo; intento?: number }`

- [ ] **Step 1: Escribir los tests**

En `tests/formulario.test.ts`, cambiar el import a:

```ts
import { leerFormularioFijo, leerFormularioMovimiento, valoresEnviados, valoresFijoEnviados } from "../lib/formulario.ts";
```

En el test "valoresEnviados conserva lo escrito…", añadir al objeto esperado `repetir: false, dia: "",` (después de `personas: "1",`).

Añadir al final:

```ts
test("repetir cada mes: un gasto nuevo con comercio y día", () => {
  const r = leerFormularioMovimiento(fd({ ...base, tipo: "gasto", comercio: "Alquiler", repetir: "on", dia: "1" }));
  assert.ok(r.ok);
  assert.deepEqual(r.datos.repetir, { dia: 1, comercio: "Alquiler" });
  const sin = leerFormularioMovimiento(fd({ ...base, tipo: "gasto" }));
  assert.ok(sin.ok && sin.datos.repetir === null);
});

test("repetir cada mes exige comercio y un día de 1 a 31", () => {
  assert.deepEqual(leerFormularioMovimiento(fd({ ...base, tipo: "gasto", comercio: "", repetir: "on", dia: "1" })), {
    ok: false,
    error: "Escribe el comercio para repetirlo cada mes",
  });
  for (const dia of ["0", "32", "", "abc", "1.5"]) {
    assert.deepEqual(leerFormularioMovimiento(fd({ ...base, tipo: "gasto", repetir: "on", dia })), {
      ok: false,
      error: "Elige el día del cargo (del 1 al 31)",
    });
  }
});

test("repetir se ignora en devoluciones y al editar", () => {
  const devolucion = leerFormularioMovimiento(fd({ ...base, tipo: "reembolso", repetir: "on", dia: "99" }));
  assert.ok(devolucion.ok && devolucion.datos.repetir === null);
  const editando = leerFormularioMovimiento(fd({ ...base, tipo: "gasto", id: "x", repetir: "on", dia: "99" }));
  assert.ok(editando.ok && editando.datos.repetir === null);
});

test("valoresEnviados conserva repetir y el día", () => {
  const v = valoresEnviados(fd({ ...base, repetir: "on", dia: "7" }));
  assert.equal(v.repetir, true);
  assert.equal(v.dia, "7");
});

const baseFijo = { importe: "650", comercio: "Alquiler", categoria_id: "hogar", dia: "1", activo: "on" };

test("formulario de fijo válido", () => {
  assert.deepEqual(leerFormularioFijo(fd(baseFijo)), {
    ok: true,
    datos: { importe: 650, comercio: "Alquiler", categoria_id: "hogar", dia: 1, activo: true },
  });
  const pausado = leerFormularioFijo(fd({ ...baseFijo, activo: "", categoria_id: "" }));
  assert.ok(pausado.ok && pausado.datos.activo === false && pausado.datos.categoria_id === null);
});

test("formulario de fijo: errores", () => {
  assert.deepEqual(leerFormularioFijo(fd({ ...baseFijo, importe: "abc" })), {
    ok: false,
    error: "Importe no válido (ej.: 12,50)",
  });
  assert.deepEqual(leerFormularioFijo(fd({ ...baseFijo, comercio: "  " })), { ok: false, error: "Escribe el comercio" });
  assert.deepEqual(leerFormularioFijo(fd({ ...baseFijo, dia: "32" })), {
    ok: false,
    error: "Elige el día del cargo (del 1 al 31)",
  });
});

test("valoresFijoEnviados conserva lo escrito", () => {
  assert.deepEqual(valoresFijoEnviados(fd({ ...baseFijo, importe: "6,5,0" })), {
    importe: "6,5,0",
    comercio: "Alquiler",
    categoria_id: "hogar",
    dia: "1",
    activo: true,
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `node --test tests/formulario.test.ts`
Expected: FAIL (`leerFormularioFijo` no exportado / `repetir` undefined).

- [ ] **Step 3: Implementar**

En `lib/formulario.ts`:

1. Añadir a `DatosMovimiento`:

```ts
  /** "Repetir cada mes" (solo al crear un gasto): día del cargo y nombre del fijo. */
  repetir: { dia: number; comercio: string } | null;
```

2. Añadir un helper al principio del archivo (tras los imports):

```ts
/** "1".."31" → número; cualquier otra cosa → null. */
function leerDia(valor: FormDataEntryValue | null): number | null {
  const texto = typeof valor === "string" ? valor : "";
  if (!/^\d{1,2}$/.test(texto)) return null;
  const dia = Number(texto);
  return dia >= 1 && dia <= 31 ? dia : null;
}

const ERROR_DIA = "Elige el día del cargo (del 1 al 31)";
```

3. En `leerFormularioMovimiento`, justo antes del `return { ok: true, ... }`:

```ts
  // "Repetir cada mes": solo al crear un gasto. En devoluciones y al editar se ignora.
  let repetir: { dia: number; comercio: string } | null = null;
  if (fd.get("repetir") === "on" && tipoCrudo === "gasto" && !fd.get("id")) {
    if (!comercio) return { ok: false, error: "Escribe el comercio para repetirlo cada mes" };
    const dia = leerDia(fd.get("dia"));
    if (dia === null) return { ok: false, error: ERROR_DIA };
    repetir = { dia, comercio };
  }
```

y añadir `repetir` al objeto `datos` del `return`.

4. `ValoresFormulario` gana `repetir: boolean; dia: string;` y `valoresEnviados` devuelve además `repetir: fd.get("repetir") === "on", dia: texto("dia"),`.

5. Al final del archivo:

```ts
// ---------- Gasto fijo (pantalla /fijos/[id]) ----------

export type DatosFijo = { importe: number; comercio: string; categoria_id: string | null; dia: number; activo: boolean };

export function leerFormularioFijo(fd: FormData): { ok: true; datos: DatosFijo } | { ok: false; error: string } {
  const importe = parseAmount(String(fd.get("importe") ?? ""));
  if (importe === null) return { ok: false, error: "Importe no válido (ej.: 12,50)" };
  const comercio = limpiarComercio(String(fd.get("comercio") ?? ""));
  if (!comercio) return { ok: false, error: "Escribe el comercio" };
  const dia = leerDia(fd.get("dia"));
  if (dia === null) return { ok: false, error: ERROR_DIA };
  const categoria_id = String(fd.get("categoria_id") ?? "") || null;
  return { ok: true, datos: { importe, comercio, categoria_id, dia, activo: fd.get("activo") === "on" } };
}

export type ValoresFijo = { importe: string; comercio: string; categoria_id: string; dia: string; activo: boolean };

export function valoresFijoEnviados(fd: FormData): ValoresFijo {
  const texto = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    importe: texto("importe"),
    comercio: texto("comercio"),
    categoria_id: texto("categoria_id"),
    dia: texto("dia"),
    activo: fd.get("activo") === "on",
  };
}
```

(`limpiarComercio` ya devuelve `null` para texto vacío o solo espacios.)

6. En `lib/types.ts`, cambiar el import a `import type { ValoresFijo, ValoresFormulario } from "./formulario.ts";` y añadir:

```ts
/** Estado del formulario de un gasto fijo, igual que EstadoFormulario. */
export type EstadoFijo = { error: string | null; valores?: ValoresFijo; intento?: number };
```

- [ ] **Step 4: Ver que pasan**

Run: `node --test tests/formulario.test.ts && npx tsc --noEmit`
Expected: PASS y sin errores de tipos (`app/actions.ts` desestructura `leido.datos` sin `repetir`: no es error).

- [ ] **Step 5: Commit**

```bash
git add lib/formulario.ts lib/types.ts tests/formulario.test.ts
git commit -m "Gastos fijos: leer Repetir cada mes y el formulario de fijo"
```

---

### Task 4: Generación al abrir la app

**Files:**
- Create: `lib/generar-fijos.ts`
- Modify: `app/page.tsx`, `app/estadisticas/page.tsx`, `app/pendientes/page.tsx`

**Interfaces:**
- Consumes: `generacionPendiente`, `primerDiaDeMes`, `type FijoParaGenerar` (Task 2).
- Produces: `generarFijos(supabase: SupabaseClient, ahora?: Date): Promise<void>` — nunca lanza.

- [ ] **Step 1: Implementar `lib/generar-fijos.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { mesActual } from "./dates.ts";
import { generacionPendiente, primerDiaDeMes, type FijoParaGenerar } from "./fijos.ts";

/**
 * Crea los movimientos de los gastos fijos que ya tocan. Se llama al cargar las páginas principales.
 * Nunca lanza: si falla, se registra y la página carga igual; la siguiente carga lo reintenta y el
 * índice único (gasto_fijo_id, fecha) evita duplicados.
 */
export async function generarFijos(supabase: SupabaseClient, ahora = new Date()): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("gastos_fijos")
      .select("id, comercio, importe, categoria_id, dia, activo, ultimo_mes")
      .eq("activo", true)
      .lt("ultimo_mes", primerDiaDeMes(mesActual(ahora)));
    if (error) throw error;

    for (const fijo of (data ?? []) as FijoParaGenerar[]) {
      const pendiente = generacionPendiente({ ...fijo, importe: Number(fijo.importe) }, ahora);
      if (!pendiente) continue;
      const insertado = await supabase
        .from("transactions")
        .upsert(pendiente.filas, { onConflict: "gasto_fijo_id,fecha", ignoreDuplicates: true });
      if (insertado.error) {
        console.error("[fijos] insertar", fijo.id, insertado.error.message);
        continue;
      }
      const actualizado = await supabase.from("gastos_fijos").update({ ultimo_mes: pendiente.ultimo_mes }).eq("id", fijo.id);
      if (actualizado.error) console.error("[fijos] ultimo_mes", fijo.id, actualizado.error.message);
    }
  } catch (e) {
    console.error("[fijos]", e instanceof Error ? e.message : e);
  }
}
```

- [ ] **Step 2: Llamarla en las tres páginas**

En `app/page.tsx`, `app/estadisticas/page.tsx` y `app/pendientes/page.tsx`, justo después de `const supabase = await createClient();`:

```ts
  await generarFijos(supabase, ahora); // en pendientes/page.tsx: generarFijos(supabase)
```

con `import { generarFijos } from "@/lib/generar-fijos";`. Va antes del `Promise.all` para que lo generado salga ya en esta carga.

- [ ] **Step 3: Tipos y tests**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores. Si el tipo de `createClient()` no encaja con `SupabaseClient`, tipar el parámetro como `Awaited<ReturnType<typeof createClient>>` importando de `./supabase/server.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/generar-fijos.ts app/page.tsx app/estadisticas/page.tsx app/pendientes/page.tsx
git commit -m "Gastos fijos: crear los movimientos que tocan al abrir la app"
```

---

### Task 5: Alta desde Añadir

**Files:**
- Create: `app/ChipsCategoria.tsx`
- Modify: `app/movimiento/MovimientoForm.tsx`, `app/actions.ts`, `app/globals.css`

**Interfaces:**
- Consumes: `DatosMovimiento.repetir`, `ValoresFormulario.repetir/dia` (Task 3); `primerDiaDeMes` (Task 2).
- Produces: `ChipsCategoria({ categorias, seleccionada, conAutomatica }: { categorias: Categoria[]; seleccionada: string; conAutomatica?: boolean })` — radios `name="categoria_id"`; con `conAutomatica` añade "Automática" (`value="auto"`, clase `solo-gasto`).

- [ ] **Step 1: Extraer `ChipsCategoria`**

`app/ChipsCategoria.tsx` (mueve aquí el bloque `opciones` y el `<fieldset className="chips">` de `MovimientoForm.tsx`, sin cambiar el marcado):

```tsx
import { estiloCategoria, GRIS, ICONO_AUTOMATICA } from "@/lib/categorias-ui";
import type { Categoria } from "@/lib/types";
import { Trazo } from "./Iconos";

type Props = {
  categorias: Categoria[];
  /** "auto", "" (sin categoría) o un id. */
  seleccionada: string;
  /** Con la opción "Automática" (solo en movimientos). */
  conAutomatica?: boolean;
};

/** Categorías como botones de radio (name="categoria_id"). */
export function ChipsCategoria({ categorias, seleccionada, conAutomatica }: Props) {
  const opciones = [
    ...(conAutomatica ? [{ valor: "auto", texto: "Automática", color: GRIS, icono: ICONO_AUTOMATICA as string | null }] : []),
    ...categorias.map((c) => {
      const { color, icono } = estiloCategoria(c.nombre);
      return { valor: c.id, texto: c.nombre, color, icono };
    }),
    { valor: "", texto: "Sin categoría", color: GRIS, icono: "M6 12h12" as string | null },
  ];
  return (
    <fieldset className="chips">
      <legend>Categoría</legend>
      {opciones.map((o) => (
        <label
          key={o.valor || "sin"}
          className={`chip${o.valor === "auto" ? " solo-gasto" : ""}`}
          style={{ "--cat": o.color } as React.CSSProperties}
        >
          <input type="radio" name="categoria_id" value={o.valor} defaultChecked={o.valor === seleccionada} />
          <span>
            {o.icono ? <Trazo d={o.icono} tamaño={18} /> : <span className="chip-inicial">{o.texto.charAt(0)}</span>}
            {o.texto}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
```

En `MovimientoForm.tsx`: borrar `opciones` y el `<fieldset className="chips">…</fieldset>`, poner `<ChipsCategoria categorias={categorias} seleccionada={categoriaId} conAutomatica />`, y quitar los imports que queden sin uso (`estiloCategoria`, `GRIS`, `ICONO_AUTOMATICA`; `Trazo` sigue usándose si lo usa otra parte — comprobar).

- [ ] **Step 2: Casilla "Repetir cada mes" en el formulario**

En `MovimientoForm.tsx`, tras calcular `fecha`:

```tsx
  // "Repetir cada mes" (solo al crear): el día del cargo empieza en el día de la fecha elegida.
  const [repetir, setRepetir] = useState(v?.repetir ?? false);
  useEffect(() => setRepetir(v?.repetir ?? false), [v?.repetir, estado.intento]);
  const diaInicial = v?.dia || String(Number(fecha.slice(8, 10)) || 1);
```

y dentro de `<div className="tarjeta campos">`, justo después del `<details className="campo campo-fecha">…</details>`:

```tsx
        {!editando && (
          <label className="campo interruptor solo-gasto">
            <span>Repetir cada mes</span>
            <input
              name="repetir"
              type="checkbox"
              role="switch"
              defaultChecked={repetir}
              onChange={(e) => setRepetir(e.target.checked)}
            />
          </label>
        )}
        {!editando && repetir && (
          <label className="campo solo-gasto">
            <span>Día del cargo</span>
            <select name="dia" defaultValue={diaInicial}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
```

- [ ] **Step 3: Guardar el fijo en `guardarMovimientoManual`**

En `app/actions.ts`:
- Importar `primerDiaDeMes` de `@/lib/fijos` y `mesActual` de `@/lib/dates`.
- Desestructurar también `repetir` de `leido.datos`.
- Sustituir la rama `else { … insert … }` por:

```ts
  } else {
    // "Repetir cada mes": primero el fijo, para enlazar el movimiento. Este movimiento cuenta como
    // el del mes de su fecha, así que ultimo_mes empieza ahí.
    let gasto_fijo_id: string | null = null;
    if (repetir) {
      const { data: fijo, error } = await supabase
        .from("gastos_fijos")
        .insert({
          comercio: repetir.comercio,
          importe,
          categoria_id,
          dia: repetir.dia,
          ultimo_mes: primerDiaDeMes(mesActual(fecha)),
        })
        .select("id")
        .single();
      if (error) return fallo(`No se pudo crear el gasto fijo: ${error.message}`);
      gasto_fijo_id = fijo.id;
    }
    const { error } = await supabase.from("transactions").insert({
      ...campos,
      texto_original: combinarNota(null, reparto),
      moneda: "EUR",
      origen: "manual",
      revisado: true,
      gasto_fijo_id,
    });
    if (error) {
      // Sin movimiento no debe quedar un fijo a medias: al reintentar se crearía otro.
      if (gasto_fijo_id) await supabase.from("gastos_fijos").delete().eq("id", gasto_fijo_id);
      return fallo(`No se pudo guardar: ${error.message}`);
    }
  }
```

- Añadir `revalidatePath("/fijos");` junto a los otros `revalidatePath`.

`categoria_id` aquí ya está resuelto (la rama `"auto"` → `categorize` va antes), así que el fijo guarda la categoría concreta; `importe` ya es tu parte si hubo reparto.

- [ ] **Step 4: Tipos, tests y build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 5: Probar en el navegador** (requiere la migración `0004` aplicada; si el usuario no la ha aplicado, pedírselo y saltar a Task 6)

`npm run dev`, entrar, Añadir → gasto 650, comercio "Alquiler (prueba)", Hogar, "Repetir cada mes" con día 1 → Guardar. Comprobar en Supabase (Table Editor) una fila en `gastos_fijos` con `ultimo_mes` = mes actual y el movimiento con su `gasto_fijo_id`. Recargar Inicio: no aparece un segundo movimiento. Probar también: marcar "Me devuelven" oculta la casilla; casilla con comercio vacío → error y valores conservados.

- [ ] **Step 6: Commit**

```bash
git add app/ChipsCategoria.tsx app/movimiento/MovimientoForm.tsx app/actions.ts
git commit -m "Gastos fijos: Repetir cada mes al añadir un gasto"
```

---

### Task 6: Pantallas `/fijos`, enlaces desde Inicio y Editar

**Files:**
- Create: `app/fijos/page.tsx`, `app/fijos/[id]/page.tsx`, `app/fijos/FijoForm.tsx`, `app/fijos/BorrarFijoBoton.tsx`, `app/vistas/FijosVista.tsx`, `app/vistas/FijoVista.tsx`
- Modify: `app/actions.ts`, `app/page.tsx`, `app/vistas/InicioVista.tsx`, `app/vistas/EditarVista.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `GastoFijo`, `COLUMNAS_FIJO`, `EstadoFijo` (Tasks 1, 3); `leerFormularioFijo`, `valoresFijoEnviados` (Task 3); `ultimoMesAlGuardar`, `resumenFijos`, `ordenarFijos` (Task 2); `ChipsCategoria` (Task 5).
- Produces:
  - Acciones: `guardarGastoFijo(_prev: EstadoFijo, fd: FormData): Promise<EstadoFijo>`, `borrarGastoFijo(fd: FormData): Promise<void>`.
  - `FijosVista({ fijos, error, base }: { fijos: GastoFijo[]; error?: string; base?: string })`
  - `FijoVista({ fijo, categorias, base }: { fijo: GastoFijo; categorias: Categoria[]; base?: string })`
  - `InicioVista` gana la prop `fijos?: { cuantos: number; alMes: number }`.

- [ ] **Step 1: Acciones en `app/actions.ts`**

Imports: `leerFormularioFijo`, `valoresFijoEnviados` de `@/lib/formulario`; `ultimoMesAlGuardar` de `@/lib/fijos`; `EstadoFijo` de `@/lib/types`.

```ts
// ---------- Gastos fijos ----------

export async function guardarGastoFijo(_prev: EstadoFijo, formData: FormData): Promise<EstadoFijo> {
  const { supabase } = await requireUser();
  const fallo = (error: string): EstadoFijo => ({ error, valores: valoresFijoEnviados(formData), intento: Date.now() });

  const id = String(formData.get("id") ?? "");
  const leido = leerFormularioFijo(formData);
  if (!leido.ok) return fallo(leido.error);

  const { data: antes, error: errorLeer } = await supabase
    .from("gastos_fijos")
    .select("activo, ultimo_mes")
    .eq("id", id)
    .maybeSingle();
  if (errorLeer) return fallo(`No se pudo guardar: ${errorLeer.message}`);
  if (!antes) return fallo("Este gasto fijo ya no existe");

  const ultimo_mes = ultimoMesAlGuardar(antes, leido.datos.activo, new Date());
  const { error } = await supabase.from("gastos_fijos").update({ ...leido.datos, ultimo_mes }).eq("id", id);
  if (error) return fallo(`No se pudo guardar: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/fijos");
  redirect("/fijos");
}

/** Borra el fijo. Sus movimientos ya creados se quedan (gasto_fijo_id pasa a null). */
export async function borrarGastoFijo(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("gastos_fijos").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/fijos");
  redirect("/fijos");
}
```

- [ ] **Step 2: Vista de la lista `app/vistas/FijosVista.tsx`**

```tsx
import Link from "next/link";
import { formatearImporte } from "@/lib/dates";
import { ordenarFijos, resumenFijos } from "@/lib/fijos";
import { conBase } from "@/lib/rutas";
import type { GastoFijo } from "@/lib/types";
import { CabeceraLibreta } from "../CabeceraLibreta";
import { IconoCategoria } from "../Iconos";

export type DatosFijos = { fijos: GastoFijo[]; error?: string; base?: string };

/** Lista de gastos fijos ya leídos: no consulta nada. */
export function FijosVista({ fijos, error, base = "" }: DatosFijos) {
  const { alMes } = resumenFijos(fijos);
  return (
    <main className="page">
      <nav className="barra-superior">
        <Link href={conBase(base, "/")} className="volver">
          ‹ Inicio
        </Link>
        <span className="titulo-barra">Gastos fijos</span>
        <span />
      </nav>

      <CabeceraLibreta>
        <p className="etiqueta-total">Cada mes</p>
        <p className="total">
          <span className="subrayado">{formatearImporte(alMes)}</span>
        </p>
      </CabeceraLibreta>

      {error && <p className="error">Error cargando datos: {error}</p>}

      {fijos.length === 0 ? (
        <p className="vacio">
          Aún no hay gastos fijos. Se crean desde <Link href={conBase(base, "/movimiento/nuevo")}>Añadir</Link>, con
          «Repetir cada mes».
        </p>
      ) : (
        <ul className="tarjeta lista lista-fijos">
          {ordenarFijos(fijos).map((f) => (
            <li key={f.id} className={f.activo ? undefined : "pausado"}>
              <Link href={conBase(base, `/fijos/${f.id}`)} className="fila">
                <IconoCategoria nombre={f.categories?.nombre} />
                <span className="fila-info">
                  <span className="fila-comercio">{f.comercio}</span>
                  <span className="fila-detalle">
                    Día {f.dia} · {f.categories?.nombre ?? "Sin categoría"}
                    {f.activo ? "" : " · En pausa"}
                  </span>
                </span>
                <span className="fila-importe">{formatearImporte(Number(f.importe))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

`app/fijos/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { COLUMNAS_FIJO, type GastoFijo } from "@/lib/types";
import { FijosVista } from "../vistas/FijosVista";

export default async function FijosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gastos_fijos").select(COLUMNAS_FIJO);
  return <FijosVista fijos={(data ?? []) as unknown as GastoFijo[]} error={error?.message} />;
}
```

- [ ] **Step 3: Formulario y edición**

`app/fijos/FijoForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { guardarGastoFijo } from "@/app/actions";
import { ChipsCategoria } from "@/app/ChipsCategoria";
import { AVISO_DEMO } from "@/lib/demo";
import type { Categoria, EstadoFijo, GastoFijo } from "@/lib/types";

type Props = { fijo: GastoFijo; categorias: Categoria[]; demo?: boolean };

export function FijoForm({ fijo, categorias, demo }: Props) {
  const [estado, accion, guardando] = useActionState<EstadoFijo, FormData>(guardarGastoFijo, { error: null });
  // Tras un error se muestra lo enviado (React reinicia el formulario).
  const v = estado.valores;
  const importe = v?.importe ?? String(fijo.importe).replace(".", ",");
  const comercio = v?.comercio ?? fijo.comercio;
  const dia = v?.dia ?? String(fijo.dia);
  const activo = v?.activo ?? fijo.activo;
  const categoriaId = v?.categoria_id ?? fijo.categoria_id ?? "";

  return (
    <form
      key={estado.intento ?? 0}
      action={demo ? undefined : accion}
      onSubmit={
        demo
          ? (e) => {
              e.preventDefault();
              alert(AVISO_DEMO);
            }
          : undefined
      }
      className="form-rapido"
    >
      <input type="hidden" name="id" value={fijo.id} />

      <div className="importe-libreta">
        <label className="importe-grande">
          <span className="sr-only">Importe en euros</span>
          <input name="importe" inputMode="decimal" placeholder="0,00" defaultValue={importe} autoComplete="off" required />
          <span aria-hidden>€</span>
        </label>
      </div>

      <div className="tarjeta campos">
        <label className="campo">
          <span>Comercio</span>
          <input name="comercio" defaultValue={comercio} autoComplete="off" required />
        </label>
        <label className="campo">
          <span>Día del cargo</span>
          <select name="dia" defaultValue={dia}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="campo interruptor">
          <span>Activo</span>
          <input name="activo" type="checkbox" role="switch" defaultChecked={activo} />
        </label>
      </div>

      <ChipsCategoria categorias={categorias} seleccionada={categoriaId} />

      <p className="subtitulo">Los cambios cuentan desde el próximo cargo; los meses ya creados no cambian.</p>

      {estado.error && <p className="error">{estado.error}</p>}
      <button className="btn btn-grande" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
```

`app/fijos/BorrarFijoBoton.tsx`:

```tsx
"use client";

import { borrarGastoFijo } from "@/app/actions";
import { AVISO_DEMO } from "@/lib/demo";

export function BorrarFijoBoton({ id, demo }: { id: string; demo?: boolean }) {
  if (demo) {
    return (
      <button type="button" className="btn btn-peligro" onClick={() => alert(AVISO_DEMO)}>
        Borrar gasto fijo
      </button>
    );
  }
  return (
    <form
      action={borrarGastoFijo}
      onSubmit={(e) => {
        if (!confirm("¿Borrar este gasto fijo? Los movimientos ya creados se quedan.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-peligro">Borrar gasto fijo</button>
    </form>
  );
}
```

`app/vistas/FijoVista.tsx`:

```tsx
import Link from "next/link";
import { conBase } from "@/lib/rutas";
import type { Categoria, GastoFijo } from "@/lib/types";
import { FijoForm } from "../fijos/FijoForm";
import { BorrarFijoBoton } from "../fijos/BorrarFijoBoton";

export type DatosFijo = { fijo: GastoFijo; categorias: Categoria[]; base?: string };

/** Editar un gasto fijo ya leído: no consulta nada. */
export function FijoVista({ fijo, categorias, base = "" }: DatosFijo) {
  const demo = Boolean(base);
  return (
    <main className="page">
      <nav className="barra-superior">
        <Link href={conBase(base, "/fijos")} className="volver">
          ‹ Volver
        </Link>
        <span className="titulo-barra">Gasto fijo</span>
        <span />
      </nav>
      <FijoForm fijo={fijo} categorias={categorias} demo={demo} />
      <BorrarFijoBoton id={fijo.id} demo={demo} />
    </main>
  );
}
```

`app/fijos/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COLUMNAS_FIJO, type GastoFijo } from "@/lib/types";
import { FijoVista } from "../../vistas/FijoVista";

export default async function FijoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: categorias }] = await Promise.all([
    supabase.from("gastos_fijos").select(COLUMNAS_FIJO).eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, nombre").order("nombre"),
  ]);
  if (!data) notFound();
  return <FijoVista fijo={data as unknown as GastoFijo} categorias={categorias ?? []} />;
}
```

- [ ] **Step 4: Enlace en Inicio**

`app/page.tsx`: añadir al `Promise.all` `supabase.from("gastos_fijos").select("importe, activo")` como cuarto elemento (`fijos`), incluir `fijos.error` en `error`, y pasar `fijos={resumenFijos(fijos.data ?? [])}` a `InicioVista` (import de `@/lib/fijos`).

`app/vistas/InicioVista.tsx`: añadir a `DatosInicio`

```ts
  /** Cuántos gastos fijos hay y cuánto suman al mes los activos. */
  fijos?: { cuantos: number; alMes: number };
```

desestructurarla y, justo después de `</CabeceraLibreta>`:

```tsx
        {fijos && fijos.cuantos > 0 && (
          <Link href={conBase(base, "/fijos")} className="tarjeta enlace-fijos">
            <span>Gastos fijos · {fijos.cuantos}</span>
            <span className="subtitulo">{formatearImporte(fijos.alMes)} al mes ›</span>
          </Link>
        )}
```

(importar `Link` de `next/link` si no está).

- [ ] **Step 5: Enlace en Editar**

`app/vistas/EditarVista.tsx`: importar `conBase`, `BASE_DEMO` de `@/lib/rutas`; antes de `<MovimientoForm`:

```tsx
      {m.gasto_fijo_id && (
        <Link href={conBase(demo ? BASE_DEMO : "", "/fijos")} className="tarjeta enlace-fijos">
          <span>Gasto fijo</span>
          <span className="subtitulo">ver fijos ›</span>
        </Link>
      )}
```

- [ ] **Step 6: Estilos**

Al final de `app/globals.css`:

```css
/* Gastos fijos */
.enlace-fijos {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

.lista-fijos li + li .fila {
  border-top: 1px solid var(--relleno);
}

.lista-fijos .pausado {
  opacity: 0.55;
}
```

Comprobar el margen vertical de `.enlace-fijos` respecto a la cabecera y al desglose: si `.tarjeta` no deja separación, añadir `margin: 0 0 12px` (mirar cómo separa `.page` a sus hijos, `app/globals.css:58`).

- [ ] **Step 7: Tipos, tests y build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 8: Probar en el navegador** (con la migración aplicada)

Inicio muestra "Gastos fijos · 1"; `/fijos` lista el de prueba; editar importe → vuelve a la lista con el nuevo; pausar → atenuado y "En pausa", al final; reactivar no crea el de este mes otra vez; abrir el movimiento creado → "Gasto fijo · ver fijos ›"; borrar el fijo → el movimiento sigue en Inicio. Ancho de móvil (375 px) sin scroll horizontal.

- [ ] **Step 9: Commit**

```bash
git add app/fijos app/vistas/FijosVista.tsx app/vistas/FijoVista.tsx app/actions.ts app/page.tsx app/vistas/InicioVista.tsx app/vistas/EditarVista.tsx app/globals.css
git commit -m "Gastos fijos: pantalla para verlos, editarlos, pausarlos y borrarlos"
```

---

### Task 7: Demo

**Files:**
- Create: `app/demo/fijos/page.tsx`, `app/demo/fijos/[id]/page.tsx`
- Modify: `lib/demo.ts`, `app/demo/page.tsx`
- Test: `tests/demo.test.ts`

**Interfaces:**
- Produces: `GASTOS_FIJOS_DEMO: GastoFijo[]` y `fijoDemoPorId(id: string): GastoFijo | null` en `lib/demo.ts`.

- [ ] **Step 1: Tests**

En `tests/demo.test.ts`, importar `GASTOS_FIJOS_DEMO, fijoDemoPorId` y añadir:

```ts
test("demo: los gastos fijos salen como movimientos del mes con su fijo", () => {
  const movs = movimientosDemo(SEPT, AHORA);
  const activos = GASTOS_FIJOS_DEMO.filter((f) => f.activo);
  assert.ok(activos.length >= 2 && GASTOS_FIJOS_DEMO.some((f) => !f.activo), "activos y uno en pausa");
  for (const f of activos) {
    const m = movs.find((x) => x.gasto_fijo_id === f.id);
    assert.ok(m, f.comercio);
    assert.equal(m.origen, "fijo");
    assert.equal(m.importe, f.importe);
    assert.equal(m.comercio, f.comercio);
    assert.equal(Number(m.fecha.slice(8, 10)), f.dia);
  }
  for (const f of GASTOS_FIJOS_DEMO.filter((x) => !x.activo)) {
    assert.ok(!movs.some((x) => x.gasto_fijo_id === f.id), "un fijo en pausa no genera nada");
  }
  assert.equal(fijoDemoPorId(GASTOS_FIJOS_DEMO[0].id), GASTOS_FIJOS_DEMO[0]);
  assert.equal(fijoDemoPorId("no-existe"), null);
});
```

(Los fijos activos de la demo deben tener `dia` ≤ 28 y una hora que no cambie de día en UTC, como las 12:00.)

- [ ] **Step 2: Ver que falla**

Run: `node --test tests/demo.test.ts`
Expected: FAIL (`GASTOS_FIJOS_DEMO` no exportado).

- [ ] **Step 3: Implementar en `lib/demo.ts`**

- Renombrar el tipo interno `Fijo` → `Recurrente` y la constante `FIJOS` → `RECURRENTES` (ahora "fijo" significa otra cosa), con el campo opcional `gasto_fijo_id?: string`.
- Añadir, antes de `RECURRENTES`:

```ts
/** Gastos fijos de la demo: dos activos y uno en pausa. */
export const GASTOS_FIJOS_DEMO: GastoFijo[] = [
  { id: "demo-fijo-alquiler", comercio: "Alquiler piso", importe: 650, categoria_id: idCategoria("Hogar"), dia: 1, activo: true, ultimo_mes: "2000-01-01", categories: { nombre: "Hogar" } },
  { id: "demo-fijo-gimnasio", comercio: "Basic-Fit", importe: 29.99, categoria_id: idCategoria("Deporte"), dia: 1, activo: true, ultimo_mes: "2000-01-01", categories: { nombre: "Deporte" } },
  { id: "demo-fijo-ingles", comercio: "Academia de inglés", importe: 45, categoria_id: idCategoria("Ocio"), dia: 5, activo: false, ultimo_mes: "2000-01-01", categories: { nombre: "Ocio" } },
];

export function fijoDemoPorId(id: string): GastoFijo | null {
  return GASTOS_FIJOS_DEMO.find((f) => f.id === id) ?? null;
}
```

(`GastoFijo` importado de `./types.ts`; `idCategoria` es una function declaration, así que se puede usar antes de su línea.)
- En `RECURRENTES`, sustituir la entrada de Basic-Fit por:

```ts
  { dia: 1, hora: "12:00", comercio: "Alquiler piso", categoria: "Hogar", importe: 650, origen: "fijo", gasto_fijo_id: "demo-fijo-alquiler" },
  { dia: 1, hora: "12:00", comercio: "Basic-Fit", categoria: "Deporte", importe: 29.99, origen: "fijo", gasto_fijo_id: "demo-fijo-gimnasio" },
```

- En `añadir`, el objeto base gana `gasto_fijo_id: null,`; en el bucle de `RECURRENTES`, pasar `gasto_fijo_id: f.gasto_fijo_id ?? null`.
- `textoOriginal` ya devuelve `null` para orígenes que no son `wallet` ni `sms`: no cambia.

- [ ] **Step 4: Páginas de la demo**

`app/demo/fijos/page.tsx`:

```tsx
import { GASTOS_FIJOS_DEMO } from "@/lib/demo";
import { BASE_DEMO } from "@/lib/rutas";
import { FijosVista } from "../../vistas/FijosVista";

export default function DemoFijos() {
  return <FijosVista fijos={GASTOS_FIJOS_DEMO} base={BASE_DEMO} />;
}
```

`app/demo/fijos/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { CATEGORIAS_DEMO, fijoDemoPorId } from "@/lib/demo";
import { BASE_DEMO } from "@/lib/rutas";
import { FijoVista } from "../../../vistas/FijoVista";

export default async function DemoFijo({ params }: { params: Promise<{ id: string }> }) {
  const fijo = fijoDemoPorId((await params).id);
  if (!fijo) notFound();
  return <FijoVista fijo={fijo} categorias={CATEGORIAS_DEMO} base={BASE_DEMO} />;
}
```

`app/demo/page.tsx`: pasar `fijos={resumenFijos(GASTOS_FIJOS_DEMO)}` a `InicioVista`.

- [ ] **Step 5: Tests, tipos y build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: todo en verde (el test "enseña cada función" sigue pasando: Netflix y Spotify siguen como `sms`, y Deporte sigue apareciendo).

- [ ] **Step 6: Commit**

```bash
git add lib/demo.ts tests/demo.test.ts app/demo
git commit -m "Gastos fijos en la demo"
```

---

### Task 8: Verificación final y estado

**Files:**
- Modify: `STATUS.md`, `README.md` (tabla "What it does": mencionar los gastos fijos en la fila de Añadir, en inglés como el resto)

- [ ] **Step 1: Todo en verde**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: sin errores.

- [ ] **Step 2: Recorrido en la demo** (`npm run dev`, `/demo`)

Inicio enseña "Gastos fijos · 3 · 679,99 € al mes ›"; `/demo/fijos` lista Alquiler y Basic-Fit (día 1) y la academia en pausa al final; guardar o borrar solo avisa; el alquiler sale en Inicio con el icono de flechas.

- [ ] **Step 3: README y STATUS**

- README: en la fila **Añadir**, añadir una frase: "Tick *Repeat every month* for a fixed bill the bank doesn't notify (rent, insurance): Cuadra adds it on its day each month, and the *Fixed expenses* screen edits, pauses or deletes it."
- STATUS.md: fecha, gastos fijos implementados en la rama `gastos-fijos`, pendiente aplicar `0004` en Supabase antes de desplegar, siguiente paso (merge/push con permiso del usuario).

- [ ] **Step 4: Commit**

```bash
git add README.md STATUS.md
git commit -m "Gastos fijos: README y estado"
```

- [ ] **Step 5: Avisar al usuario**

Recordarle, en frases completas: (1) ejecutar `supabase/migrations/0004_gastos_fijos.sql` en el SQL Editor de Supabase **antes** de desplegar; (2) la rama `gastos-fijos` no está pusheada y se pushea o mergea solo con su permiso.
