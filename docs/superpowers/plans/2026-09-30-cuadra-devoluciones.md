# Cuadra: devoluciones — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poder apuntar lo que te devuelven (Bizum, cuentas compartidas, Tricount) y que reste de tu gasto real en totales, desglose y estadísticas.

**Architecture:** Nueva columna `tipo` (`gasto` | `reembolso`) en `transactions`. El importe se guarda siempre en positivo y una regla única en `lib/resumen.ts` aplica signo negativo a las devoluciones. La lectura del formulario se extrae a una función pura (`lib/formulario.ts`) con tests. La interfaz usa radios nativos y `:has()` para el selector Gasto | Me devuelven.

**Tech Stack:** Next.js 16.3, React 19, TypeScript 5.9, Supabase (Postgres + `@supabase/ssr`), `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-30-cuadra-devoluciones-design.md`

## Global Constraints

- Sin dependencias npm nuevas. Solo modo claro. Identidad "libreta de cuadros" (tokens de `app/globals.css`).
- Valores de `tipo` en base de datos: exactamente `'gasto'` y `'reembolso'`. Un movimiento sin `tipo` se trata como gasto.
- `importe` siempre positivo en base de datos. Nunca se guardan importes negativos.
- La ingesta automática (`/api/ingest`) no cambia y sigue creando gastos.
- Imports entre archivos de `lib/` con extensión `.ts`; los componentes usan el alias `@/`.
- Commits locales en la rama `devoluciones`. **Nada de `git push` sin permiso explícito del usuario**, y nunca antes de confirmar que la migración `0002` está aplicada en Supabase.

## Review Focus

1. Devolución en un mes sin gastos de su categoría: la categoría debe salir con neto negativo, al final, sin barra ni porcentaje (Task 2, Task 5).
2. Mes solo con devoluciones: total negativo, sin previsión, "Dónde más gastas" vacío y un mensaje coherente en Estadísticas (Task 2, Task 3).
3. Devolución creada con la categoría "Automática" marcada (es el valor por defecto de un alta nueva): debe guardarse sin categoría, no autocategorizada (Task 4).
4. `tipo` manipulado en el formulario (`"ingreso"`, vacío o ausente): un valor desconocido se rechaza con mensaje, y uno ausente se trata como gasto (Task 4).
5. Subtotal de un día que solo tiene una devolución: debe mostrarse el importe negativo, no quedar en blanco (Task 5).

---

### Task 1: Migración `0002`, tipo en el modelo y rama de trabajo

**Files:**
- Create: `supabase/migrations/0002_tipo_movimiento.sql`
- Modify: `lib/types.ts`, `SETUP.md`

**Interfaces:**
- Produces:
  - `type TipoMovimiento = "gasto" | "reembolso"` en `lib/types.ts`.
  - `Movimiento.tipo: TipoMovimiento`.
  - `COLUMNAS_MOVIMIENTO` incluye `tipo`.

- [ ] **Step 1: Crear la rama**

```bash
git checkout -b devoluciones
```

- [ ] **Step 2: `supabase/migrations/0002_tipo_movimiento.sql`**

```sql
-- Tipo de movimiento: 'gasto' (resta dinero) o 'reembolso' (te lo devuelven: Bizum, Tricount…).
-- Se puede ejecutar varias veces. Ejecutar en Supabase: SQL Editor → pegar → Run.
alter table public.transactions
  add column if not exists tipo text not null default 'gasto';
alter table public.transactions drop constraint if exists transactions_tipo_check;
alter table public.transactions
  add constraint transactions_tipo_check check (tipo in ('gasto', 'reembolso'));
notify pgrst, 'reload schema';
```

- [ ] **Step 3: Tipos en `lib/types.ts`**

Añadir antes de `export type Movimiento`:
```ts
export type TipoMovimiento = "gasto" | "reembolso";
```
Añadir el campo `tipo: TipoMovimiento;` tras `revisado: boolean;` en `Movimiento`. Cambiar `COLUMNAS_MOVIMIENTO` a:
```ts
export const COLUMNAS_MOVIMIENTO =
  "id, fecha, importe, moneda, comercio, categoria_id, origen, texto_original, revisado, tipo, categories(nombre)";
```

- [ ] **Step 4: Nota en `SETUP.md`**

En la sección "### 1.2 Crear las tablas", tras el paso 4 (`Comprueba en **Table Editor**…`), añadir:
```markdown
5. Repite los pasos 1–3 con `supabase/migrations/0002_tipo_movimiento.sql` (añade el tipo "gasto" / "devolución"). Si más adelante aparecen migraciones nuevas (`0003_…`), ejecútalas también en orden.
```

- [ ] **Step 5: Verificar**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0` y el build completo (el tipo nuevo aún no se usa, nada debe romperse).

- [ ] **Step 6: Commit local**

```bash
git add -A
git commit -m "Devoluciones: migración 0002 con la columna tipo y tipo en el modelo"
```

---

### Task 2: Cálculos netos (`lib/resumen.ts`)

**Files:**
- Modify: `lib/resumen.ts`, `tests/resumen.test.ts`
- Modify: `app/page.tsx` (usa `lineaResumen` movida a `lib/resumen.ts`)

**Interfaces:**
- Consumes: `TipoMovimiento` (Task 1). Los tipos locales de `lib/resumen.ts` aceptan `tipo?: string | null`, así los tests pueden omitirlo.
- Produces:
  - `totalImportes(movs)`: neto, es decir, Σ gastos − Σ devoluciones.
  - `desglosePorCategoria(movs): LineaDesglose[]`: neto por categoría. `pct` sobre la suma de netos positivos; los netos ≤ 0 llevan `pct: 0` y quedan al final (orden descendente por `total`).
  - `agruparPorDia`: subtotal neto.
  - `lineaResumen(movs: { importe: number | null; tipo?: string | null }[], total: number, totalAnterior: number, mesAnterior: string): string`.

- [ ] **Step 1: Tests (fallan)**

Añadir al final de `tests/resumen.test.ts` (y añadir `lineaResumen` al import de `../lib/resumen.ts`):
```ts
const devoluciones = [
  { id: "a", fecha: "2026-09-28T09:00:00Z", importe: 60, categoria_id: "r", categories: { nombre: "Restaurantes" }, tipo: "gasto" },
  { id: "b", fecha: "2026-09-28T08:00:00Z", importe: 45, categoria_id: "r", categories: { nombre: "Restaurantes" }, tipo: "reembolso" },
  { id: "c", fecha: "2026-09-27T12:00:00Z", importe: 20, categoria_id: "o", categories: { nombre: "Ocio" }, tipo: "reembolso" },
  { id: "d", fecha: "2026-09-27T10:00:00Z", importe: 10, categoria_id: "s", categories: { nombre: "Supermercado" } },
];

test("totalImportes resta las devoluciones", () => {
  assert.equal(totalImportes(devoluciones), 5); // 60 − 45 − 20 + 10
  assert.equal(totalImportes([{ importe: 30, tipo: "reembolso" }]), -30);
});

test("desglose neto: categoría negativa al final, sin porcentaje", () => {
  assert.deepEqual(desglosePorCategoria(devoluciones), [
    { id: "r", nombre: "Restaurantes", total: 15, pct: 60 },
    { id: "s", nombre: "Supermercado", total: 10, pct: 40 },
    { id: "o", nombre: "Ocio", total: -20, pct: 0 },
  ]);
});

test("subtotal por día neto, también si el día solo tiene una devolución", () => {
  const dias = agruparPorDia(devoluciones, AHORA);
  assert.deepEqual(dias.map((d) => [d.etiqueta, d.total]), [["Hoy", 15], ["Ayer", -10]]);
  const soloDevolucion = agruparPorDia([devoluciones[2]], AHORA);
  assert.equal(soloDevolucion[0].total, -20);
});

test("lineaResumen cuenta gastos con importe y devoluciones por separado", () => {
  const movs = [
    { importe: 10, tipo: "gasto" },
    { importe: null, tipo: "gasto" }, // pendiente sin importe: no cuenta
    { importe: 5 },
    { importe: 45, tipo: "reembolso" },
  ];
  assert.equal(lineaResumen(movs, 0, 0, "agosto"), "2 gastos y 1 devolución");
  // Intl pone un espacio no separable antes del "€": \s lo acepta.
  assert.match(lineaResumen([{ importe: 3 }], 3, 10, "agosto"), /^1 gasto, 7,00\s€ menos que en agosto$/);
  assert.equal(lineaResumen([{ importe: 3 }], 10, 10, "agosto"), "1 gasto, igual que en agosto");
});
```

Run: `npm test`
Expected: FAIL (`lineaResumen` no existe y los totales aún suman las devoluciones).

- [ ] **Step 2: Implementar en `lib/resumen.ts`**

Cambiar la primera línea `import { claveDia, etiquetaDia } from "./dates.ts";` por `import { claveDia, etiquetaDia, formatearImporte } from "./dates.ts";`. Después, sustituir las líneas desde `type ConImporte` hasta el final de `desglosePorCategoria` por:
```ts
type ConImporte = { importe: number | null; tipo?: string | null };
type ConCategoria = ConImporte & { categoria_id: string | null; categories: { nombre: string } | null };

const redondear = (n: number) => Math.round(n * 100) / 100;

/** +importe para un gasto, −importe para una devolución; 0 si no tiene importe (pendiente sin leer). */
function neto(m: ConImporte): number {
  if (m.importe === null) return 0;
  return m.tipo === "reembolso" ? -m.importe : m.importe;
}

/** Gasto neto: gastos menos devoluciones. Los movimientos sin importe no cuentan. */
export function totalImportes(movs: ConImporte[]): number {
  return redondear(movs.reduce((s, m) => s + neto(m), 0));
}

export type LineaDesglose = { id: string | null; nombre: string; total: number; pct: number };

/**
 * Gasto neto por categoría, de mayor a menor. El porcentaje se calcula sobre las categorías con
 * neto positivo; una categoría que queda en cero o negativa (te devolvieron más de lo gastado ese mes) lleva 0 %.
 */
export function desglosePorCategoria(movs: ConCategoria[]): LineaDesglose[] {
  const porCategoria = new Map<string | null, { nombre: string; total: number }>();
  for (const m of movs) {
    if (m.importe === null) continue;
    const linea = porCategoria.get(m.categoria_id) ?? { nombre: m.categories?.nombre ?? "Sin categoría", total: 0 };
    linea.total += neto(m);
    porCategoria.set(m.categoria_id, linea);
  }
  const positivo = [...porCategoria.values()].reduce((s, l) => s + Math.max(l.total, 0), 0);
  return [...porCategoria.entries()]
    .map(([id, l]) => ({
      id,
      nombre: l.nombre,
      total: redondear(l.total),
      pct: l.total > 0 && positivo > 0 ? Math.round((l.total / positivo) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** "3 gastos y 1 devolución, 12,00 € menos que en agosto". Solo cuentan los gastos con importe. */
export function lineaResumen(movs: ConImporte[], total: number, totalAnterior: number, mesAnterior: string): string {
  const gastos = movs.filter((m) => m.tipo !== "reembolso" && m.importe !== null).length;
  const devoluciones = movs.filter((m) => m.tipo === "reembolso").length;
  let cuantos = `${gastos} ${gastos === 1 ? "gasto" : "gastos"}`;
  if (devoluciones > 0) cuantos += ` y ${devoluciones} ${devoluciones === 1 ? "devolución" : "devoluciones"}`;
  if (totalAnterior <= 0) return cuantos;
  const diferencia = redondear(total - totalAnterior);
  if (diferencia === 0) return `${cuantos}, igual que en ${mesAnterior}`;
  return `${cuantos}, ${formatearImporte(Math.abs(diferencia))} ${diferencia < 0 ? "menos" : "más"} que en ${mesAnterior}`;
}
```
`agruparPorDia` no cambia: ya usa `totalImportes`.

- [ ] **Step 3: Usar `lineaResumen` desde Inicio**

En `app/page.tsx`:
- Cambiar `import { desglosePorCategoria, totalImportes } from "@/lib/resumen";` por `import { desglosePorCategoria, lineaResumen, totalImportes } from "@/lib/resumen";`.
- Borrar la función local `function lineaResumen(…) { … }` del final del archivo.
- Cambiar `lineaResumen(movimientos.length, total, totalAnterior, nombreMes(anterior, false))` por `lineaResumen(movimientos, total, totalAnterior, nombreMes(anterior, false))`.
- La consulta del mes anterior pide `.select("importe")`. Cambiarla a `.select("importe, tipo")`, para que el total anterior también sea neto.

- [ ] **Step 4: Verificar**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0` y build completo.

- [ ] **Step 5: Commit local**

```bash
git add -A
git commit -m "Devoluciones: totales, desglose y subtotales en neto; resumen con gastos y devoluciones"
```

---

### Task 3: Estadísticas con devoluciones

**Files:**
- Modify: `lib/estadisticas.ts`, `tests/estadisticas.test.ts`, `app/estadisticas/page.tsx`

**Interfaces:**
- Consumes: `totalImportes` y `desglosePorCategoria` netos (Task 2).
- Produces: `topComercios(movs: { comercio: string | null; importe: number | null; tipo?: string | null }[], n?)`, que ignora las devoluciones.

- [ ] **Step 1: Tests (fallan)**

Añadir al final de `tests/estadisticas.test.ts`:
```ts
test("topComercios ignora las devoluciones", () => {
  const movs = [
    { comercio: "Lidl", importe: 20, tipo: "gasto" },
    { comercio: "Bizum de Ana", importe: 45, tipo: "reembolso" },
  ];
  assert.deepEqual(topComercios(movs), [{ nombre: "Lidl", compras: 1, total: 20 }]);
});

test("ritmo con total neto negativo: sin previsión", () => {
  const r = ritmoDelMes(-30, { y: 2026, m: 9 }, AHORA);
  assert.equal(r.prevision, null);
});

test("comparativa usa netos", () => {
  const r = { nombre: "Restaurantes" };
  const actual = [
    { importe: 60, categoria_id: "r", categories: r, tipo: "gasto" },
    { importe: 45, categoria_id: "r", categories: r, tipo: "reembolso" },
  ];
  const anterior = [{ importe: 30, categoria_id: "r", categories: r }];
  assert.deepEqual(comparativaCategorias(actual, anterior), [
    { id: "r", nombre: "Restaurantes", actual: 15, anterior: 30, diferencia: -15 },
  ]);
});
```

Run: `npm test`
Expected: FAIL en "topComercios ignora las devoluciones" (hoy cuenta "Bizum de Ana"). Los otros dos pueden pasar ya, porque se apoyan en Task 2 y en `total > 0`: lo importante es que el primero falle.

- [ ] **Step 2: Implementar**

En `lib/estadisticas.ts`, cambiar la firma de `topComercios` a:
```ts
export function topComercios(
  movs: { comercio: string | null; importe: number | null; tipo?: string | null }[],
  n = 8,
): LineaComercio[] {
```
y la primera línea del bucle a:
```ts
    if (m.importe === null || m.tipo === "reembolso" || !m.comercio || !normalizar(m.comercio)) continue;
```
Actualizar el comentario de la función: `/** Comercios con más gasto (sin devoluciones). Agrupa sin distinguir mayúsculas/espacios y muestra el nombre más repetido. */`

- [ ] **Step 3: Mensaje de mes sin gasto neto en `app/estadisticas/page.tsx`**

Cambiar `const sinGastos = total === 0;` por `const sinGastos = total <= 0;` y sustituir:
```tsx
          <p className="vacio">Aún no hay gastos en {nombreMes(mes, false)}. Las estadísticas aparecerán con el primero.</p>
```
por:
```tsx
          <p className="vacio">
            {total < 0
              ? `En ${nombreMes(mes, false)} te han devuelto más de lo que has gastado.`
              : `Aún no hay gastos en ${nombreMes(mes, false)}. El ritmo y los comercios aparecerán con el primero.`}
          </p>
```

- [ ] **Step 4: Verificar**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0` y build completo.

- [ ] **Step 5: Commit local**

```bash
git add -A
git commit -m "Devoluciones en Estadísticas: fuera de Dónde más gastas y mensaje para meses en negativo"
```

---

### Task 4: Leer y guardar el tipo desde el formulario

**Files:**
- Create: `lib/formulario.ts`
- Test: `tests/formulario.test.ts`
- Modify: `app/actions.ts`

**Interfaces:**
- Consumes: `parseAmount` (`lib/amount.ts`), `limpiarComercio` (`lib/sms-parser.ts`), `horaLocalAUtc` (`lib/dates.ts`), `TipoMovimiento` (`lib/types.ts`).
- Produces:
  - `type DatosMovimiento = { tipo: TipoMovimiento; importe: number; comercio: string | null; fecha: Date; categoria: string | null }`, donde `categoria` vale `"auto"`, un id o `null`.
  - `leerFormularioMovimiento(fd: FormData): { ok: true; datos: DatosMovimiento } | { ok: false; error: string }`.

- [ ] **Step 1: Tests (fallan)**

`tests/formulario.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerFormularioMovimiento } from "../lib/formulario.ts";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

const base = { importe: "45,00", comercio: "Bizum de Ana", fecha: "2026-09-28T13:00", categoria_id: "r" };

test("devolución válida", () => {
  const r = leerFormularioMovimiento(fd({ ...base, tipo: "reembolso" }));
  assert.ok(r.ok);
  assert.equal(r.datos.tipo, "reembolso");
  assert.equal(r.datos.importe, 45);
  assert.equal(r.datos.comercio, "Bizum de Ana");
  assert.equal(r.datos.categoria, "r");
  assert.equal(r.datos.fecha.toISOString(), "2026-09-28T11:00:00.000Z");
});

test("sin tipo se trata como gasto", () => {
  const r = leerFormularioMovimiento(fd(base));
  assert.ok(r.ok && r.datos.tipo === "gasto");
});

test("tipo desconocido se rechaza", () => {
  const r = leerFormularioMovimiento(fd({ ...base, tipo: "ingreso" }));
  assert.deepEqual(r, { ok: false, error: "Elige si es un gasto o una devolución" });
});

test("una devolución con categoría Automática queda sin categoría", () => {
  const r = leerFormularioMovimiento(fd({ ...base, tipo: "reembolso", categoria_id: "auto" }));
  assert.ok(r.ok && r.datos.categoria === null);
});

test("un gasto conserva Automática; vacío es sin categoría", () => {
  const auto = leerFormularioMovimiento(fd({ ...base, tipo: "gasto", categoria_id: "auto" }));
  assert.ok(auto.ok && auto.datos.categoria === "auto");
  const sin = leerFormularioMovimiento(fd({ ...base, categoria_id: "" }));
  assert.ok(sin.ok && sin.datos.categoria === null);
});

test("importe y fecha inválidos", () => {
  assert.deepEqual(leerFormularioMovimiento(fd({ ...base, importe: "abc" })), {
    ok: false,
    error: "Importe no válido (ej.: 12,50)",
  });
  assert.deepEqual(leerFormularioMovimiento(fd({ ...base, fecha: "" })), { ok: false, error: "Fecha no válida" });
});
```

Run: `npm test`
Expected: FAIL (no existe `lib/formulario.ts`).

- [ ] **Step 2: `lib/formulario.ts`**

```ts
import { parseAmount } from "./amount.ts";
import { limpiarComercio } from "./sms-parser.ts";
import { horaLocalAUtc } from "./dates.ts";
import type { TipoMovimiento } from "./types.ts";

export type DatosMovimiento = {
  tipo: TipoMovimiento;
  importe: number;
  comercio: string | null;
  fecha: Date;
  /** "auto" (autocategorizar), el id de una categoría o null (sin categoría). */
  categoria: string | null;
};

/** Valida el formulario de alta/edición. No toca la base de datos. */
export function leerFormularioMovimiento(fd: FormData): { ok: true; datos: DatosMovimiento } | { ok: false; error: string } {
  const tipoCrudo = String(fd.get("tipo") ?? "gasto");
  if (tipoCrudo !== "gasto" && tipoCrudo !== "reembolso") {
    return { ok: false, error: "Elige si es un gasto o una devolución" };
  }
  const importe = parseAmount(String(fd.get("importe") ?? ""));
  if (importe === null) return { ok: false, error: "Importe no válido (ej.: 12,50)" };
  const fecha = horaLocalAUtc(String(fd.get("fecha") ?? ""));
  if (!fecha) return { ok: false, error: "Fecha no válida" };

  let categoria: string | null = String(fd.get("categoria_id") ?? "") || null;
  // Autocategorizar por el concepto de una devolución ("Bizum de Ana") no tiene sentido.
  if (tipoCrudo === "reembolso" && categoria === "auto") categoria = null;

  return {
    ok: true,
    datos: { tipo: tipoCrudo, importe, comercio: limpiarComercio(String(fd.get("comercio") ?? "")), fecha, categoria },
  };
}
```

Nota: `lib/types.ts` no tiene imports, así que se puede cargar con Node sin problema.

Run: `npm test`
Expected: `ℹ fail 0`.

- [ ] **Step 3: Usarlo en `app/actions.ts`**

En `guardarMovimientoManual`, sustituir desde `const importe = parseAmount(…)` hasta `const campos = { … };` (incluidos) por:
```ts
  const leido = leerFormularioMovimiento(formData);
  if (!leido.ok) return { error: leido.error };
  const { tipo, importe, comercio, fecha } = leido.datos;
  let categoria_id = leido.datos.categoria;

  if (categoria_id === "auto") {
    const { data: cats } = await supabase.from("categories").select("id, palabras_clave");
    categoria_id = categorize(comercio, cats ?? []);
  }

  const campos = { tipo, importe, comercio, fecha: fecha.toISOString(), categoria_id };
```
Añadir `import { leerFormularioMovimiento } from "@/lib/formulario";`. Quitar los imports que queden sin uso: `parseAmount`, `limpiarComercio` y `horaLocalAUtc`, si ya no aparecen en el archivo (comprobar con grep antes de borrar cada uno).

- [ ] **Step 4: Verificar**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0` y build completo.

- [ ] **Step 5: Commit local**

```bash
git add -A
git commit -m "Devoluciones: leer y validar el tipo en el formulario"
```

---

### Task 5: Interfaz — selector, lista y desglose

**Files:**
- Modify: `app/movimiento/MovimientoForm.tsx`, `app/movimiento/[id]/page.tsx`, `app/Iconos.tsx`, `app/FilaMovimiento.tsx`, `app/MovimientosLista.tsx`, `app/DesgloseCategorias.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `Movimiento.tipo` (Task 1), totales netos (Task 2).
- Produces:
  - `MovimientoForm` acepta `inicial.tipo?: TipoMovimiento`.
  - `IconoOrigen` acepta `origen: "manual" | "wallet" | "sms" | "devolucion"`.
  - `FilaMovimiento` acepta la prop `tipo: TipoMovimiento`.

- [ ] **Step 1: Selector en `MovimientoForm.tsx`**

- Importar el tipo: cambiar `import type { Categoria, EstadoFormulario } from "@/lib/types";` por `import type { Categoria, EstadoFormulario, TipoMovimiento } from "@/lib/types";`.
- En `inicial`, añadir `tipo?: TipoMovimiento;`.
- Justo después de `<input type="hidden" name="volver" value={volver} />`, insertar:
```tsx
      <fieldset className="selector-tipo">
        <legend className="sr-only">Tipo de movimiento</legend>
        <label>
          <input type="radio" name="tipo" value="gasto" defaultChecked={inicial.tipo !== "reembolso"} />
          <span>Gasto</span>
        </label>
        <label>
          <input type="radio" name="tipo" value="reembolso" defaultChecked={inicial.tipo === "reembolso"} />
          <span>Me devuelven</span>
        </label>
      </fieldset>
```
- Sustituir:
```tsx
          <span>Comercio</span>
          <input name="comercio" placeholder="¿Dónde?" defaultValue={inicial.comercio} autoComplete="off" />
```
por:
```tsx
          <span>
            <span className="solo-gasto">Comercio</span>
            <span className="solo-reembolso">Concepto</span>
          </span>
          <input name="comercio" placeholder="Mercadona, Bizum de Ana…" defaultValue={inicial.comercio} autoComplete="off" />
```
- En el `map` de `opciones`, cambiar `className="chip"` por ``className={`chip${o.valor === "auto" ? " solo-gasto" : ""}`}``.

- [ ] **Step 2: Editar conserva el tipo (`app/movimiento/[id]/page.tsx`)**

En el objeto `inicial` que se pasa a `MovimientoForm`, añadir `tipo: m.tipo,` tras `id: m.id,`.

- [ ] **Step 3: Icono de devolución (`app/Iconos.tsx`)**

Añadir al objeto `ORIGEN`, tras la entrada `manual`:
```ts
  devolucion: { titulo: "Devolución", d: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" },
```

- [ ] **Step 4: Fila (`app/FilaMovimiento.tsx`)**

- En `type Props`, añadir `tipo: "gasto" | "reembolso";`.
- Tras `const abierta = …`, añadir `const devolucion = p.tipo === "reembolso";`.
- Cambiar `{p.comercio ?? <em>Sin comercio</em>}` por `{p.comercio ?? <em>{devolucion ? "Devolución" : "Sin comercio"}</em>}`.
- Cambiar `<IconoOrigen origen={p.origen} />` por `<IconoOrigen origen={devolucion ? "devolucion" : p.origen} />`.
- Sustituir el `<span className={`fila-importe…`}>…</span>` del importe por:
```tsx
        <span className={`fila-importe${p.importe === null ? " sin-importe" : ""}${devolucion ? " devolucion" : ""}`}>
          {p.importe === null
            ? "Sin importe"
            : `${devolucion ? "+" : ""}${formatearImporte(p.importe, p.moneda)}`}
        </span>
```

- [ ] **Step 5: Lista (`app/MovimientosLista.tsx`)**

- Añadir `tipo={m.tipo}` a las props de `<FilaMovimiento … />`, tras `origen={m.origen}`.
- Cambiar `{dia.total > 0 ? formatearImporte(dia.total) : ""}` por `{dia.total !== 0 ? formatearImporte(dia.total) : ""}`.

- [ ] **Step 6: Desglose (`app/DesgloseCategorias.tsx`)**

Sustituir:
```tsx
                <span className="desglose-importe">{formatearImporte(l.total)}</span>
              </span>
              <span className="barra" aria-hidden>
                <span style={{ width: `${Math.max(l.pct, 2)}%` }} />
              </span>
            </span>
            <span className="desglose-pct">{l.pct}%</span>
```
por:
```tsx
                <span className={`desglose-importe${l.total <= 0 ? " negativo" : ""}`}>{formatearImporte(l.total)}</span>
              </span>
              {l.total > 0 && (
                <span className="barra" aria-hidden>
                  <span style={{ width: `${Math.max(l.pct, 2)}%` }} />
                </span>
              )}
            </span>
            <span className="desglose-pct">{l.total > 0 ? `${l.pct}%` : ""}</span>
```

- [ ] **Step 7: Estilos (`app/globals.css`)**

Añadir al final:
```css
/* ---------- Devoluciones ---------- */

.selector-tipo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 0;
  padding: 4px;
  border: none;
  border-radius: 12px;
  background: var(--relleno);
}

.selector-tipo input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.selector-tipo span {
  display: block;
  padding: 10px;
  border-radius: 9px;
  text-align: center;
  font-weight: 600;
  color: var(--suave);
  cursor: pointer;
}

.selector-tipo input:checked + span {
  background: var(--superficie);
  color: var(--texto);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
}

.selector-tipo input:focus-visible + span {
  outline: 2px solid var(--primario);
  outline-offset: 2px;
}

.solo-reembolso {
  display: none;
}

.form-rapido:has(input[name="tipo"][value="reembolso"]:checked) .solo-gasto {
  display: none;
}

.form-rapido:has(input[name="tipo"][value="reembolso"]:checked) .solo-reembolso {
  display: inline;
}

.fila-importe.devolucion,
.desglose-importe.negativo {
  color: var(--baja);
}
```

- [ ] **Step 8: Verificar**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0` y build completo, sin errores de tipos (todas las llamadas a `FilaMovimiento` llevan `tipo`).

- [ ] **Step 9: Commit local**

```bash
git add -A
git commit -m "Devoluciones en la interfaz: selector Gasto | Me devuelven, filas en verde y desglose con negativos"
```

---

### Task 6: Revisión, migración y despliegue

- [ ] **Step 1: Pedir al usuario que ejecute la migración `0002`**

Pasarle el contenido de `supabase/migrations/0002_tipo_movimiento.sql` para el SQL Editor (Ctrl+A → Supr → pegar → Run) y esperar su confirmación.

- [ ] **Step 2: Comprobar que la columna existe**, sin mostrar claves:

```bash
URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '\r' | sed 's:/*$::')
KEY=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2- | tr -d '\r')
curl -s -w " [%{http_code}]\n" "$URL/rest/v1/transactions?select=tipo&limit=1" -H "apikey: $KEY"
```
Expected: `[200]` y un array (vacío o con `"tipo":"gasto"`). Si sale `42703` o `PGRST204`, la migración no está aplicada: no desplegar.

- [ ] **Step 3: Revisión final** con un revisor independiente (opus) sobre el diff de la rama y el Review Focus de este plan.

- [ ] **Step 4: Con permiso explícito del usuario**, integrar `devoluciones` en `main` sin commit de merge y subirlo:
```bash
git checkout main && git merge --ff-only devoluciones
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push
```
Después, comprobar en producción que `/login` responde 200 y `/api/ingest` sin token responde 401.
