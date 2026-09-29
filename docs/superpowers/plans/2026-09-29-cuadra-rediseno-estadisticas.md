# Cuadra: rediseño "libreta de cuadros" y Estadísticas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar la identidad "libreta de cuadros" a toda la app, añadir la pantalla de Estadísticas y cambiar "Salir" por un "Cerrar sesión" local y con confirmación.

**Architecture:** Next.js 16 (App Router) con Server Components que leen de Supabase y funciones puras de cálculo en `lib/` probadas con `node --test`. Los componentes de cliente se limitan a interacción: deslizar, confirmar y la barra con la pestaña activa. El estilo es CSS plano en `app/globals.css` con variables en `:root`.

**Tech Stack:** Next.js 16.3, React 19, TypeScript 5.9, `@supabase/ssr`, `next/font/google` (Schibsted Grotesk), `node --test` con TypeScript nativo de Node 24.

**Spec:** `docs/superpowers/specs/2026-09-29-cuadra-rediseno-estadisticas-design.md`

## Global Constraints

- Sin dependencias npm nuevas. La fuente se carga con `next/font/google` (incluido en Next).
- Solo modo claro. Sin cambios de esquema en Supabase.
- Colores exactos: Papel `#fbfcfd`, Cuadrícula `#dde5f1`, Tinta `#2440b3`, Margen `#e5484d`, Texto `#1a1d24`, Lápiz `#5b6270`, Raya `#e8edf4`, bajada `#1f8a4c`.
- Las barras del desglose usan siempre la tinta, nunca un color por categoría.
- Sin mayúsculas sostenidas en etiquetas; textos en español, en frases normales.
- Los movimientos sin importe no cuentan en totales, medias, top de comercios ni comparativas.
- Imports entre archivos de `lib/` con extensión `.ts` (los tests los cargan con Node directamente); los componentes usan el alias `@/`.
- Commits locales al final de cada tarea. **Nada de `git push` sin permiso explícito del usuario** (hace desplegar Vercel).

## Review Focus

1. Mes en curso sin gastos: la previsión no debe aparecer y la media diaria debe ser 0 € (Task 2).
2. El mismo comercio escrito distinto ("LIDL ", "Lidl", "lidl  madrid" frente a "Lidl Madrid"): debe contarse como uno (Task 2).
3. Categoría con gasto el mes pasado y ninguno este mes: debe aparecer con 0 € y diferencia negativa (Task 2).
4. Última noche del mes en hora de Madrid (por ejemplo, 30 sept 23:30 UTC = 1 oct en Madrid): el día contado y el mes deben ser los de Madrid (Task 2).
5. Movimientos pendientes sin importe: no deben alterar media, top ni comparativa (Task 2).

---

## Punto de partida

En el árbol hay trabajo sin commitear de la ronda anterior (resumen mensual, lista por días, formulario rápido, deslizar para borrar), aprobado por el usuario y con tests en verde. El plan parte de ahí.

### Task 1: Guardar el punto de partida

**Files:** ninguno nuevo; commitea lo existente.

**Interfaces:**
- Produces: los módulos ya existentes que usan las siguientes tareas:
  - `lib/dates.ts`: `type Mes = { y: number; m: number }`, `mesActual(ahora?)`, `parseMes(param, ahora?)`, `desplazarMes(mes, delta)`, `claveMes(mes)`, `nombreMes(mes, conAño?)`, `rangoMes(mes)`, `claveDia(iso)`, `etiquetaDia(clave, ahora?)`, `formatearImporte(n, moneda?)`, `formatearFecha(iso)`, `formatearHora(iso)`.
  - `lib/resumen.ts`: `totalImportes(movs)`, `desglosePorCategoria(movs): LineaDesglose[]` (`{ id: string | null; nombre: string; total: number; pct: number }`), `agruparPorDia(movs, ahora?)`.
  - `lib/types.ts`: `Movimiento`, `COLUMNAS_MOVIMIENTO`, `Categoria`.

- [ ] **Step 1: Verificar que todo está en verde**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0` y el build termina con la tabla de rutas.

- [ ] **Step 2: Commit local**

```bash
git add -A
git commit -m "Rediseño: resumen mensual, lista por días, formulario rápido y deslizar para borrar"
```

---

### Task 2: Cálculos de Estadísticas (`lib/estadisticas.ts`)

**Files:**
- Create: `lib/estadisticas.ts`
- Test: `tests/estadisticas.test.ts`

**Interfaces:**
- Consumes: `Mes`, `mesActual`, `claveMes`, `claveDia` de `lib/dates.ts`; `desglosePorCategoria` de `lib/resumen.ts`.
- Produces:
  - `type Ritmo = { mediaDiaria: number; diasContados: number; diasDelMes: number; prevision: number | null }`
  - `ritmoDelMes(total: number, mes: Mes, ahora?: Date): Ritmo`
  - `type LineaComercio = { nombre: string; compras: number; total: number }`
  - `topComercios(movs: { comercio: string | null; importe: number | null }[], n?: number): LineaComercio[]` (n por defecto 8)
  - `type LineaComparativa = { id: string | null; nombre: string; actual: number; anterior: number; diferencia: number }`
  - `comparativaCategorias(actual: MovCategoria[], anterior: MovCategoria[]): LineaComparativa[]`, donde `MovCategoria = { importe: number | null; categoria_id: string | null; categories: { nombre: string } | null }`

- [ ] **Step 1: Escribir los tests (fallan)**

`tests/estadisticas.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ritmoDelMes, topComercios, comparativaCategorias } from "../lib/estadisticas.ts";

const AHORA = new Date("2026-09-28T10:00:00Z"); // 28 sept en Madrid

test("ritmo del mes en curso: media por días transcurridos y previsión", () => {
  assert.deepEqual(ritmoDelMes(280, { y: 2026, m: 9 }, AHORA), {
    mediaDiaria: 10,
    diasContados: 28,
    diasDelMes: 30,
    prevision: 300,
  });
});

test("ritmo de un mes pasado: todos los días, sin previsión", () => {
  assert.deepEqual(ritmoDelMes(310, { y: 2026, m: 8 }, AHORA), {
    mediaDiaria: 10,
    diasContados: 31,
    diasDelMes: 31,
    prevision: null,
  });
});

test("mes en curso sin gastos: media 0 y sin previsión", () => {
  assert.deepEqual(ritmoDelMes(0, { y: 2026, m: 9 }, AHORA), {
    mediaDiaria: 0,
    diasContados: 28,
    diasDelMes: 30,
    prevision: null,
  });
});

test("ritmo usa el día de Madrid en la frontera de mes", () => {
  const r = ritmoDelMes(5, { y: 2026, m: 10 }, new Date("2026-09-30T23:30:00Z")); // 1 oct en Madrid
  assert.equal(r.diasContados, 1);
  assert.equal(r.diasDelMes, 31);
  assert.equal(r.prevision, 155);
});

test("topComercios agrupa sin distinguir mayúsculas ni espacios y ordena por total", () => {
  const movs = [
    { comercio: "LIDL ", importe: 10 },
    { comercio: "Lidl", importe: 20 },
    { comercio: "Lidl", importe: 5 },
    { comercio: "lidl  madrid", importe: 1 },
    { comercio: "Lidl Madrid", importe: 1 },
    { comercio: "Bar Pepe", importe: 40 },
    { comercio: null, importe: 99 },
    { comercio: "Zara", importe: null },
  ];
  assert.deepEqual(topComercios(movs), [
    { nombre: "Bar Pepe", compras: 1, total: 40 },
    { nombre: "Lidl", compras: 3, total: 35 },
    { nombre: "lidl madrid", compras: 2, total: 2 },
  ]);
  assert.equal(topComercios(movs, 1).length, 1);
  assert.deepEqual(topComercios([]), []);
});

test("comparativaCategorias: diferencias con el mes anterior, por magnitud", () => {
  const s = { nombre: "Supermercado" };
  const o = { nombre: "Ocio" };
  const actual = [
    { importe: 100, categoria_id: "s", categories: s },
    { importe: 10, categoria_id: null, categories: null },
    { importe: null, categoria_id: "o", categories: o },
  ];
  const anterior = [
    { importe: 90, categoria_id: "s", categories: s },
    { importe: 30, categoria_id: "o", categories: o },
  ];
  assert.deepEqual(comparativaCategorias(actual, anterior), [
    { id: "o", nombre: "Ocio", actual: 0, anterior: 30, diferencia: -30 },
    { id: null, nombre: "Sin categoría", actual: 10, anterior: 0, diferencia: 10 },
    { id: "s", nombre: "Supermercado", actual: 100, anterior: 90, diferencia: 10 },
  ]);
  assert.deepEqual(comparativaCategorias([], []), []);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL en `tests/estadisticas.test.ts` (no existe `lib/estadisticas.ts`).

- [ ] **Step 3: Implementar**

`lib/estadisticas.ts`:
```ts
import { claveDia, claveMes, mesActual, type Mes } from "./dates.ts";
import { desglosePorCategoria } from "./resumen.ts";

const redondear = (n: number) => Math.round(n * 100) / 100;

export type Ritmo = { mediaDiaria: number; diasContados: number; diasDelMes: number; prevision: number | null };

/** Media diaria del mes y, si es el mes en curso, previsión a fin de mes al mismo ritmo. */
export function ritmoDelMes(total: number, mes: Mes, ahora = new Date()): Ritmo {
  const diasDelMes = new Date(Date.UTC(mes.y, mes.m, 0)).getUTCDate();
  const esActual = claveMes(mes) === claveMes(mesActual(ahora));
  const diasContados = esActual ? Number(claveDia(ahora.toISOString()).slice(8)) : diasDelMes;
  const media = total / diasContados;
  return {
    mediaDiaria: redondear(media),
    diasContados,
    diasDelMes,
    prevision: esActual && total > 0 ? redondear(media * diasDelMes) : null,
  };
}

export type LineaComercio = { nombre: string; compras: number; total: number };

const normalizar = (s: string) => s.trim().replace(/\s+/g, " ");

/** Comercios con más gasto. Agrupa sin distinguir mayúsculas/espacios y muestra el nombre más repetido. */
export function topComercios(movs: { comercio: string | null; importe: number | null }[], n = 8): LineaComercio[] {
  const grupos = new Map<string, { nombres: Map<string, number>; compras: number; total: number }>();
  for (const m of movs) {
    if (m.importe === null || !m.comercio || !normalizar(m.comercio)) continue;
    const nombre = normalizar(m.comercio);
    const clave = nombre.toLowerCase();
    const g = grupos.get(clave) ?? { nombres: new Map(), compras: 0, total: 0 };
    g.nombres.set(nombre, (g.nombres.get(nombre) ?? 0) + 1);
    g.compras += 1;
    g.total += m.importe;
    grupos.set(clave, g);
  }
  return [...grupos.values()]
    .map((g) => ({
      nombre: [...g.nombres.entries()].sort((a, b) => b[1] - a[1])[0][0],
      compras: g.compras,
      total: redondear(g.total),
    }))
    .sort((a, b) => b.total - a.total || b.compras - a.compras)
    .slice(0, n);
}

type MovCategoria = { importe: number | null; categoria_id: string | null; categories: { nombre: string } | null };
export type LineaComparativa = { id: string | null; nombre: string; actual: number; anterior: number; diferencia: number };

/** Gasto por categoría este mes frente al anterior, de mayor a menor cambio. */
export function comparativaCategorias(actual: MovCategoria[], anterior: MovCategoria[]): LineaComparativa[] {
  const lineas = new Map<string | null, LineaComparativa>();
  for (const l of desglosePorCategoria(anterior)) {
    lineas.set(l.id, { id: l.id, nombre: l.nombre, actual: 0, anterior: l.total, diferencia: 0 });
  }
  for (const l of desglosePorCategoria(actual)) {
    const previa = lineas.get(l.id);
    lineas.set(l.id, { id: l.id, nombre: l.nombre, actual: l.total, anterior: previa?.anterior ?? 0, diferencia: 0 });
  }
  return [...lineas.values()]
    .map((l) => ({ ...l, diferencia: redondear(l.actual - l.anterior) }))
    .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia) || a.nombre.localeCompare(b.nombre, "es"));
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test`
Expected: `ℹ fail 0`. Todos los tests de `tests/estadisticas.test.ts` en verde.

- [ ] **Step 5: Commit local**

```bash
git add lib/estadisticas.ts tests/estadisticas.test.ts
git commit -m "Estadísticas: ritmo del mes, top de comercios y comparativa por categoría"
```

---

### Task 3: Identidad visual (fuente, colores y cabecera de libreta)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `app/CabeceraLibreta.tsx`
- Modify: `app/Iconos.tsx`, `lib/categorias-ui.ts`, `tests/resumen.test.ts`, `app/DesgloseCategorias.tsx`

**Interfaces:**
- Produces:
  - `CabeceraLibreta({ children }: { children: React.ReactNode })`: `<header className="cabecera-libreta">` con cuadrícula y margen rojo.
  - `estiloCategoria(nombre): { emoji: string }` (se elimina `color`: con las barras en tinta ya no se usa).
  - Variables CSS en `:root`: `--fondo`, `--superficie`, `--texto`, `--suave`, `--separador`, `--relleno`, `--primario`, `--primario-suave`, `--peligro`, `--aviso`, `--cuadricula`, `--margen`, `--baja`, `--alto-barra`, `--radio`.

- [ ] **Step 1: Actualizar el test de `estiloCategoria` (falla)**

En `tests/resumen.test.ts`, sustituir el test `estiloCategoria…` por:
```ts
test("estiloCategoria: emoji conocido, inicial si es nueva, interrogación si no hay", () => {
  assert.deepEqual(estiloCategoria("Supermercado"), { emoji: "🛒" });
  assert.deepEqual(estiloCategoria("supermercado"), { emoji: "🛒" });
  assert.deepEqual(estiloCategoria("Mascotas"), { emoji: "M" });
  assert.deepEqual(estiloCategoria(null), { emoji: "?" });
});
```

Run: `npm test`
Expected: FAIL (el objeto aún incluye `color`).

- [ ] **Step 2: Simplificar `lib/categorias-ui.ts`**

```ts
// Emoji de cada categoría en la interfaz. Se asigna por nombre para no tocar la base de datos:
// una categoría nueva que no esté aquí se muestra con su inicial.
const EMOJIS: Record<string, string> = {
  supermercado: "🛒",
  restaurantes: "🍽️",
  transporte: "🚗",
  compras: "🛍️",
  suscripciones: "📺",
  hogar: "🏠",
  salud: "💊",
  ocio: "🎉",
};

export function estiloCategoria(nombre: string | null | undefined): { emoji: string } {
  if (!nombre) return { emoji: "?" };
  return { emoji: EMOJIS[nombre.trim().toLowerCase()] ?? nombre.trim().charAt(0).toUpperCase() };
}
```

Run: `npm test`
Expected: `ℹ fail 0`.

- [ ] **Step 3: Iconos y desglose sin color por categoría**

En `app/Iconos.tsx`, sustituir `IconoCategoria` por:
```tsx
export function IconoCategoria({ nombre, tamaño = 38 }: { nombre: string | null | undefined; tamaño?: number }) {
  const { emoji } = estiloCategoria(nombre);
  return (
    <span className="icono-cat" aria-hidden style={{ width: tamaño, height: tamaño, fontSize: tamaño * 0.5 }}>
      {emoji}
    </span>
  );
}
```

En `app/DesgloseCategorias.tsx`:
- Borrar la línea `import { estiloCategoria } from "@/lib/categorias-ui";`.
- Borrar la línea `const { color } = estiloCategoria(l.id ? l.nombre : null);`.
- Cambiar `<span style={{ width: \`${Math.max(l.pct, 2)}%\`, background: color }} />` por `<span style={{ width: \`${Math.max(l.pct, 2)}%\` }} />`.

- [ ] **Step 4: Fuente en `app/layout.tsx`**

Añadir tras los imports existentes:
```tsx
import { Schibsted_Grotesk } from "next/font/google";

const fuente = Schibsted_Grotesk({ subsets: ["latin"], variable: "--fuente", display: "swap" });
```
Cambiar `themeColor: "#0f766e"` por `themeColor: "#fbfcfd"` y `<html lang="es">` por `<html lang="es" className={fuente.variable}>`.

En `app/manifest.ts`, cambiar `background_color` a `"#fbfcfd"` y `theme_color` a `"#2440b3"`.

- [ ] **Step 5: `app/CabeceraLibreta.tsx`**

```tsx
/** Cabecera con cuadrícula y margen rojo de libreta: el único elemento llamativo de cada pantalla. */
export function CabeceraLibreta({ children }: { children: React.ReactNode }) {
  return <header className="cabecera-libreta">{children}</header>;
}
```

- [ ] **Step 6: Colores y tipografía en `app/globals.css`**

Sustituir el bloque `:root { … }` por:
```css
:root {
  color-scheme: light;
  --fondo: #fbfcfd;
  --superficie: #ffffff;
  --texto: #1a1d24;
  --suave: #5b6270;
  --separador: #e8edf4;
  --relleno: #eef2f7;
  --primario: #2440b3;
  --primario-suave: #2440b314;
  --peligro: #e5484d;
  --aviso: #d97706;
  --cuadricula: #dde5f1;
  --margen: #e5484d;
  --baja: #1f8a4c;
  --radio: 12px;
  --alto-barra: 60px;
}
```

En `html, body`, cambiar `font-family` por:
```css
  font-family: var(--fuente), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Sustituir `.tarjeta { … }` por:
```css
.tarjeta {
  background: var(--superficie);
  border: 1px solid var(--separador);
  border-radius: var(--radio);
}
```

Sustituir `.icono-cat { … }` por:
```css
.icono-cat {
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--relleno);
  color: var(--suave);
  font-weight: 700;
  line-height: 1;
}
```

Sustituir `.barra > span { … }` por:
```css
.barra > span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--primario);
}
```

Borrar los bloques `.resumen`, `.resumen-arriba`, `.resumen-arriba > :first-child` y `.resumen-arriba form`. Cambiar `.nombre-mes { … }` por:
```css
.nombre-mes {
  font-weight: 600;
  color: var(--primario);
}
```
y `.selector-mes { … }` por:
```css
.selector-mes {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: -10px;
}
```

Cambiar `.total { … }` por:
```css
.total {
  margin: 6px 0 0;
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
```

Sustituir las reglas `.cabecera-dia`, `.chips legend` y `.texto-original .etiqueta` (hoy usan `text-transform: uppercase`) por estas versiones, sin mayúsculas sostenidas ni `letter-spacing`. `.cabecera-dia`:
```css
.cabecera-dia {
  display: flex;
  justify-content: space-between;
  margin: 22px 2px 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--suave);
}
```
`.chips legend`:
```css
.chips legend {
  width: 100%;
  margin-bottom: 8px;
  padding: 0 2px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--suave);
}
```
`.texto-original .etiqueta`:
```css
.texto-original .etiqueta {
  display: block;
  margin-bottom: 4px;
  font-size: 0.78rem;
  color: var(--suave);
}
```

Cambiar `.titulo-grande { … }` por:
```css
.titulo-grande {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
}
```

Añadir al final:
```css
/* ---------- Cabecera de libreta ---------- */

.cabecera-libreta {
  position: relative;
  margin: calc(-1 * (env(safe-area-inset-top) + 12px)) -16px 16px;
  padding: calc(env(safe-area-inset-top) + 14px) 16px 18px 46px;
  background-color: var(--fondo);
  background-image:
    linear-gradient(var(--cuadricula) 1px, transparent 1px),
    linear-gradient(90deg, var(--cuadricula) 1px, transparent 1px);
  background-size: 16px 16px;
  border-bottom: 1px solid var(--cuadricula);
}

.cabecera-libreta::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 32px;
  width: 1.5px;
  background: var(--margen);
}

.cabecera-libreta .subtitulo {
  margin-top: 6px;
}

/* ---------- Cerrar sesión ---------- */

.cerrar-sesion {
  display: flex;
  justify-content: center;
  margin-top: 36px;
}

.cerrar-sesion button {
  background: none;
  border: none;
  color: var(--suave);
  font-size: 0.9rem;
  padding: 10px;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .fila.suave,
  .interruptor input,
  .interruptor input::after {
    transition: none;
  }
}
```

- [ ] **Step 7: Verificar**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0` y build completo, sin errores de tipos.

- [ ] **Step 8: Commit local**

```bash
git add -A
git commit -m "Identidad libreta de cuadros: Schibsted Grotesk, tinta azul y cabecera con cuadrícula"
```

---

### Task 4: Inicio con cabecera de libreta y "Cerrar sesión" local

**Files:**
- Modify: `app/page.tsx`, `app/SelectorMes.tsx`, `app/actions.ts`
- Create: `app/CerrarSesion.tsx`

**Interfaces:**
- Consumes: `CabeceraLibreta` (Task 3).
- Produces: `SelectorMes({ mes, esActual, ruta }: { mes: Mes; esActual: boolean; ruta?: string })`, con `ruta` por defecto `"/"`, usada también en Estadísticas (Task 6).

- [ ] **Step 1: `SelectorMes` con ruta configurable**

En `app/SelectorMes.tsx`, cambiar la firma a:
```tsx
export function SelectorMes({ mes, esActual, ruta = "/" }: { mes: Mes; esActual: boolean; ruta?: string }) {
```
y sustituir los dos `href={\`/?mes=${…}\`}` por `href={\`${ruta}?mes=${claveMes(anterior)}\`}` y `href={\`${ruta}?mes=${claveMes(siguiente)}\`}`.

- [ ] **Step 2: Cerrar sesión solo en este dispositivo**

En `app/actions.ts`, dentro de `cerrarSesion`, cambiar `await supabase.auth.signOut();` por:
```ts
  // Solo este dispositivo: cerrar sesión en el ordenador no debe sacar al iPhone.
  await supabase.auth.signOut({ scope: "local" });
```

`app/CerrarSesion.tsx`:
```tsx
"use client";

import { cerrarSesion } from "@/app/actions";

export function CerrarSesion() {
  return (
    <form
      action={cerrarSesion}
      className="cerrar-sesion"
      onSubmit={(e) => {
        if (!confirm("¿Cerrar la sesión en este dispositivo? Tendrás que volver a pedir el código para entrar.")) {
          e.preventDefault();
        }
      }}
    >
      <button>Cerrar sesión</button>
    </form>
  );
}
```

- [ ] **Step 3: Cabecera nueva en `app/page.tsx`**

Imports: quitar `import { cerrarSesion } from "@/app/actions";` y añadir:
```tsx
import { CabeceraLibreta } from "./CabeceraLibreta";
import { CerrarSesion } from "./CerrarSesion";
```

Sustituir el bloque `<header className="resumen"> … </header>` por:
```tsx
        <CabeceraLibreta>
          <SelectorMes mes={mes} esActual={esActual} />
          <p className="total">{formatearImporte(total)}</p>
          <p className="subtitulo">{lineaResumen(movimientos.length, total, totalAnterior, nombreMes(anterior, false))}</p>
        </CabeceraLibreta>
```

Añadir `<CerrarSesion />` justo después de `<MovimientosLista … />`, dentro de `<main>`.

En `lineaResumen`, cambiar el texto de los movimientos y quitar el punto medio:
```ts
  const cuantos = `${n} ${n === 1 ? "gasto" : "gastos"}`;
  if (totalAnterior <= 0) return cuantos;
  const diferencia = Math.round((total - totalAnterior) * 100) / 100;
  if (diferencia === 0) return `${cuantos}, igual que en ${mesAnterior}`;
  const cuanto = formatearImporte(Math.abs(diferencia));
  return `${cuantos}, ${cuanto} ${diferencia < 0 ? "menos" : "más"} que en ${mesAnterior}`;
```

- [ ] **Step 4: Verificar**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0` y build completo.

- [ ] **Step 5: Commit local**

```bash
git add -A
git commit -m "Inicio con cabecera de libreta; Cerrar sesión con confirmación y solo en este dispositivo"
```

---

### Task 5: Barra inferior con Estadísticas y botón + flotante

**Files:**
- Modify: `app/BarraInferior.tsx`, `app/globals.css`

**Interfaces:**
- Produces: `BarraInferior({ pendientes }: { pendientes: number })`, con pestañas `/`, `/estadisticas` y `/pendientes` y el enlace `/movimiento/nuevo` flotante.

- [ ] **Step 1: Reescribir `app/BarraInferior.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTAÑAS = [
  { href: "/", texto: "Inicio", icono: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" },
  { href: "/estadisticas", texto: "Estadísticas", icono: "M5 20V11M12 20V4M19 20v-6" },
  { href: "/pendientes", texto: "Pendientes", icono: "M4 13h4l2 3h4l2-3h4M5 5h14l1 8v6H4v-6l1-8Z" },
];

export function BarraInferior({ pendientes }: { pendientes: number }) {
  const ruta = usePathname();

  return (
    <>
      <Link href="/movimiento/nuevo" className="boton-añadir" aria-label="Añadir gasto">
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
      <nav className="barra-inferior" aria-label="Navegación principal">
        {PESTAÑAS.map((p) => (
          <Link key={p.href} href={p.href} className={`pestaña${ruta === p.href ? " activa" : ""}`}>
            <span className="con-globo">
              <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
                <path d={p.icono} />
              </svg>
              {p.href === "/pendientes" && pendientes > 0 && (
                <span className="globo">{pendientes > 99 ? "99+" : pendientes}</span>
              )}
            </span>
            {p.texto}
          </Link>
        ))}
      </nav>
    </>
  );
}
```

- [ ] **Step 2: CSS de barra y botón flotante**

En `app/globals.css`, en `.barra-inferior`, cambiar `grid-template-columns: 1fr auto 1fr;` por `grid-template-columns: repeat(3, 1fr);`, cambiar `padding: 0 24px env(safe-area-inset-bottom);` por `padding: 0 8px env(safe-area-inset-bottom);` y `background: rgb(249 249 249 / 0.88);` por `background: rgb(251 252 253 / 0.9);`.

Sustituir `.boton-añadir { … }` y `.boton-añadir:active { … }` por:
```css
.boton-añadir {
  position: fixed;
  right: 18px;
  bottom: calc(var(--alto-barra) + env(safe-area-inset-bottom) + 16px);
  z-index: 11;
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--primario);
  color: #fff;
  box-shadow: 0 6px 16px rgb(36 64 179 / 0.35);
}

.boton-añadir:active {
  transform: scale(0.94);
}
```

- [ ] **Step 3: Verificar**

Run: `npm run build`
Expected: build completo.

- [ ] **Step 4: Commit local**

```bash
git add -A
git commit -m "Barra inferior con Estadísticas y botón de añadir flotante"
```

---

### Task 6: Pantalla de Estadísticas

**Files:**
- Create: `app/estadisticas/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `ritmoDelMes`, `topComercios`, `comparativaCategorias` (Task 2); `CabeceraLibreta` (Task 3); `SelectorMes` con `ruta` (Task 4); `BarraInferior` (Task 5); `IconoCategoria` de `app/Iconos.tsx`.

- [ ] **Step 1: `app/estadisticas/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { claveMes, desplazarMes, formatearImporte, mesActual, nombreMes, parseMes, rangoMes } from "@/lib/dates";
import { totalImportes } from "@/lib/resumen";
import { comparativaCategorias, ritmoDelMes, topComercios } from "@/lib/estadisticas";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { BarraInferior } from "../BarraInferior";
import { CabeceraLibreta } from "../CabeceraLibreta";
import { IconoCategoria } from "../Iconos";
import { SelectorMes } from "../SelectorMes";

type Params = Promise<{ mes?: string }>;

export default async function EstadisticasPage({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const ahora = new Date();
  const mes = parseMes(sp.mes, ahora);
  const anterior = desplazarMes(mes, -1);
  const esActual = claveMes(mes) === claveMes(mesActual(ahora));
  const rango = rangoMes(mes);
  const rangoAnterior = rangoMes(anterior);

  const supabase = await createClient();
  const [delMes, delAnterior, pendientes] = await Promise.all([
    supabase
      .from("transactions")
      .select(COLUMNAS_MOVIMIENTO)
      .gte("fecha", rango.desde.toISOString())
      .lt("fecha", rango.hasta.toISOString())
      .limit(2000),
    supabase
      .from("transactions")
      .select(COLUMNAS_MOVIMIENTO)
      .gte("fecha", rangoAnterior.desde.toISOString())
      .lt("fecha", rangoAnterior.hasta.toISOString())
      .limit(2000),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("revisado", false),
  ]);

  const error = delMes.error ?? delAnterior.error ?? pendientes.error;
  const movimientos = (delMes.data ?? []) as unknown as Movimiento[];
  const previos = (delAnterior.data ?? []) as unknown as Movimiento[];
  const total = totalImportes(movimientos);
  const ritmo = ritmoDelMes(total, mes, ahora);
  const comercios = topComercios(movimientos);
  const comparativa = comparativaCategorias(movimientos, previos);
  const sinGastos = total === 0;

  return (
    <>
      <main className="page con-barra">
        <CabeceraLibreta>
          <SelectorMes mes={mes} esActual={esActual} ruta="/estadisticas" />
          <h1 className="titulo-grande">Estadísticas</h1>
        </CabeceraLibreta>

        {error && <p className="error">No se pudieron cargar los datos: {error.message}</p>}

        {sinGastos ? (
          <p className="vacio">Aún no hay gastos en {nombreMes(mes, false)}. Las estadísticas aparecerán con el primero.</p>
        ) : (
          <>
            <section className="bloque" aria-labelledby="ritmo">
              <h2 id="ritmo">Ritmo del mes</h2>
              <div className="tarjeta cifras">
                <div>
                  <p className="cifra">{formatearImporte(ritmo.mediaDiaria)}</p>
                  <p className="subtitulo">de media al día</p>
                </div>
                <div>
                  <p className="cifra">
                    {esActual ? `Día ${ritmo.diasContados}` : `${ritmo.diasDelMes} días`}
                  </p>
                  <p className="subtitulo">{esActual ? `de ${ritmo.diasDelMes}` : "en el mes"}</p>
                </div>
              </div>
              {ritmo.prevision !== null && (
                <p className="prevision">
                  Si sigues así, cerrarás el mes en unos <strong>{formatearImporte(Math.round(ritmo.prevision))}</strong>.
                </p>
              )}
            </section>

            <section className="bloque" aria-labelledby="comercios">
              <h2 id="comercios">Dónde más gastas</h2>
              <ol className="tarjeta lista-simple">
                {comercios.map((c) => (
                  <li key={c.nombre}>
                    <span className="lista-nombre">
                      {c.nombre}
                      <span className="subtitulo">
                        {c.compras} {c.compras === 1 ? "compra" : "compras"}
                      </span>
                    </span>
                    <span className="fila-importe">{formatearImporte(c.total)}</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {comparativa.length > 0 && (
          <section className="bloque" aria-labelledby="comparativa">
            <h2 id="comparativa">Categorías frente a {nombreMes(anterior, false)}</h2>
            <ul className="tarjeta lista-simple">
              {comparativa.map((l) => (
                <li key={l.id ?? "sin"}>
                  <IconoCategoria nombre={l.id ? l.nombre : null} tamaño={32} />
                  <span className="lista-nombre">
                    {l.nombre}
                    <span className="subtitulo">{formatearImporte(l.actual)} este mes</span>
                  </span>
                  <span className={`diferencia${l.diferencia > 0 ? " sube" : l.diferencia < 0 ? " baja" : ""}`}>
                    {l.diferencia === 0
                      ? "igual"
                      : `${l.diferencia > 0 ? "+" : "−"}${formatearImporte(Math.abs(l.diferencia))}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <BarraInferior pendientes={pendientes.count ?? 0} />
    </>
  );
}
```

- [ ] **Step 2: Estilos de Estadísticas**

Añadir al final de `app/globals.css`:
```css
/* ---------- Estadísticas ---------- */

.bloque {
  margin-top: 26px;
}

.bloque h2 {
  margin: 0 2px 8px;
  font-size: 1.05rem;
  font-weight: 700;
}

.cifras {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 14px 16px;
  gap: 12px;
}

.cifra {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.cifras .subtitulo {
  margin: 2px 0 0;
}

.prevision {
  margin: 10px 2px 0;
  color: var(--suave);
}

.prevision strong {
  color: var(--texto);
  font-variant-numeric: tabular-nums;
}

.lista-simple {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lista-simple li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
}

.lista-simple li + li {
  border-top: 1px solid var(--separador);
}

.lista-nombre {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.lista-nombre .subtitulo {
  margin: 1px 0 0;
  font-size: 0.8rem;
  font-weight: 400;
}

.diferencia {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--suave);
}

.diferencia.sube {
  color: var(--margen);
}

.diferencia.baja {
  color: var(--baja);
}
```

- [ ] **Step 3: Verificar**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0`; el build lista `ƒ /estadisticas`.

- [ ] **Step 4: Commit local**

```bash
git add -A
git commit -m "Pantalla de Estadísticas: ritmo, dónde más gastas y categorías frente al mes anterior"
```

---

### Task 7: Pendientes y Login con la cabecera de libreta

**Files:**
- Modify: `app/pendientes/page.tsx`, `app/login/page.tsx`, `app/globals.css`

- [ ] **Step 1: Pendientes**

En `app/pendientes/page.tsx`, añadir `import { CabeceraLibreta } from "../CabeceraLibreta";` y sustituir:
```tsx
        <h1 className="titulo-grande">Pendientes</h1>
        <p className="subtitulo">Movimientos que no se pudieron leer con seguridad.</p>
```
por:
```tsx
        <CabeceraLibreta>
          <h1 className="titulo-grande">Pendientes</h1>
          <p className="subtitulo">Gastos que no se pudieron leer con seguridad. Revísalos o descártalos.</p>
        </CabeceraLibreta>
```
Cambiar el estado vacío `Todo revisado` por `No tienes nada pendiente de revisar.`

- [ ] **Step 2: Login**

`app/login/page.tsx`:
```tsx
import { CabeceraLibreta } from "../CabeceraLibreta";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="page">
      <CabeceraLibreta>
        <h1 className="marca">Cuadra</h1>
        <p className="subtitulo">Tus gastos del mes, apuntados y claros.</p>
      </CabeceraLibreta>
      <LoginForm errorEnlace={error === "enlace"} />
    </main>
  );
}
```

En `app/globals.css`, sustituir `.page > h1 { … }` por:
```css
.marca {
  margin: 0;
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: -0.04em;
}
```

- [ ] **Step 3: Verificar**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0` y build completo.

- [ ] **Step 4: Commit local**

```bash
git add -A
git commit -m "Pendientes y login con la cabecera de libreta"
```

---

### Task 8: Revisión visual y entrega

- [ ] **Step 1: Arrancar en local**

Run (en segundo plano): `npx next dev -p 3000`
Abrir `http://localhost:3000` en el panel del navegador a 375×812 (preset `mobile`).

- [ ] **Step 2: Login del usuario**

Pedir al usuario que inicie sesión en el panel con su email y su código. No introducir credenciales en su nombre.

- [ ] **Step 3: Revisar cada pantalla con capturas**

Revisar: Inicio (mes actual y uno pasado, con filtro por categoría), Estadísticas (mes actual y uno pasado), Pendientes, Nuevo gasto (botones de categoría, fecha desplegable), Editar y Login. Comprobar:
- sin scroll horizontal a 375 px;
- la cuadrícula y el margen solo en la cabecera;
- el botón + no tapa el último movimiento ni el enlace "Cerrar sesión".

Si lo tapa, aumentar `padding-bottom` de `.page.con-barra` a `calc(env(safe-area-inset-bottom) + var(--alto-barra) + 96px)`.

- [ ] **Step 4: Tests y build finales**

Run: `npm test` y `npm run build`
Expected: `ℹ fail 0` y build completo.

- [ ] **Step 5: Pedir permiso para desplegar**

Resumir los cambios al usuario y preguntar si se hace `git push` (Vercel despliega automáticamente). Solo con un sí explícito:
```bash
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push
```
Después, comprobar en producción que `/estadisticas` sin sesión redirige a `/login` (código 307).
