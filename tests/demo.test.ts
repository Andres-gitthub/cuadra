import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIAS_DEMO, movimientosDemo, pendientesDemo } from "../lib/demo.ts";
import { rangoMes } from "../lib/dates.ts";
import { agruparPorDia, desglosePorCategoria, totalImportes } from "../lib/resumen.ts";
import { leerReparto } from "../lib/reparto.ts";
import { estiloCategoria } from "../lib/categorias-ui.ts";

const AHORA = new Date("2026-09-28T10:00:00Z"); // 28 sept, 12:00 en Madrid
const SEPT = { y: 2026, m: 9 };
const AGOSTO = { y: 2026, m: 8 };
const redondear = (n: number) => Math.round(n * 100) / 100;

test("demo: los mismos datos cada vez que se pide el mismo mes", () => {
  assert.deepEqual(movimientosDemo(SEPT, AHORA), movimientosDemo(SEPT, AHORA));
});

test("demo: el mes en curso llega hasta ahora, sin futuros, y va del más reciente al más antiguo", () => {
  const movs = movimientosDemo(SEPT, AHORA);
  const { desde } = rangoMes(SEPT);
  assert.ok(movs.length > 20);
  for (const m of movs) {
    const t = new Date(m.fecha).getTime();
    assert.ok(t >= desde.getTime() && t <= AHORA.getTime(), m.fecha);
  }
  const fechas = movs.map((m) => m.fecha);
  assert.deepEqual(fechas, [...fechas].sort().reverse());
});

test("demo: un mes pasado está completo y uno futuro está vacío", () => {
  const diasConGasto = new Set(movimientosDemo(AGOSTO, AHORA).map((m) => m.fecha.slice(0, 10)));
  assert.ok(diasConGasto.size >= 15);
  assert.deepEqual(movimientosDemo({ y: 2026, m: 10 }, AHORA), []);
});

test("demo: enseña cada función de la app", () => {
  const movs = movimientosDemo(SEPT, AHORA);
  assert.ok(movs.some((m) => m.tipo === "reembolso"), "una devolución");
  assert.ok(movs.some((m) => leerReparto(m.texto_original)), "un gasto repartido");
  assert.ok(movs.some((m) => m.categories?.nombre === "Deporte"), "el gimnasio");
  assert.ok(movs.some((m) => m.origen === "wallet") && movs.some((m) => m.origen === "sms") && movs.some((m) => m.origen === "manual"));
});

test("demo: los pendientes son del mes en curso, sin revisar, y también salen en Inicio", () => {
  const pendientes = pendientesDemo(AHORA);
  const ids = new Set(movimientosDemo(SEPT, AHORA).map((m) => m.id));
  assert.equal(pendientes.length, 2);
  for (const p of pendientes) {
    assert.equal(p.revisado, false);
    assert.ok(ids.has(p.id));
  }
  assert.ok(pendientes.some((p) => p.importe === null), "uno sin importe");
  // En los meses pasados no queda nada pendiente.
  assert.ok(movimientosDemo(AGOSTO, AHORA).every((m) => m.revisado));
});

test("demo: total, desglose por categoría y subtotales por día cuadran", () => {
  const movs = movimientosDemo(SEPT, AHORA);
  const total = totalImportes(movs);
  assert.ok(total > 0);
  assert.equal(redondear(desglosePorCategoria(movs).reduce((s, l) => s + l.total, 0)), total);
  assert.equal(redondear(agruparPorDia(movs, AHORA).reduce((s, d) => s + d.total, 0)), total);
});

test("demo: cada categoría tiene su color e icono", () => {
  for (const c of CATEGORIAS_DEMO) assert.ok(estiloCategoria(c.nombre).icono, c.nombre);
});
