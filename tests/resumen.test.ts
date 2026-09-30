import { test } from "node:test";
import assert from "node:assert/strict";
import { totalImportes, desglosePorCategoria, agruparPorDia, lineaResumen } from "../lib/resumen.ts";
import { estiloCategoria } from "../lib/categorias-ui.ts";

const AHORA = new Date("2026-09-28T10:00:00Z");
const super_ = { nombre: "Supermercado" };
const ocio = { nombre: "Ocio" };

const movs = [
  { id: "1", fecha: "2026-09-28T09:00:00Z", importe: 20, categoria_id: "s", categories: super_ },
  { id: "2", fecha: "2026-09-28T08:00:00Z", importe: 5.5, categoria_id: "o", categories: ocio },
  { id: "3", fecha: "2026-09-27T18:00:00Z", importe: 10, categoria_id: "s", categories: super_ },
  { id: "4", fecha: "2026-09-27T12:00:00Z", importe: null, categoria_id: null, categories: null },
  { id: "5", fecha: "2026-09-20T12:00:00Z", importe: 4.5, categoria_id: null, categories: null },
];

test("totalImportes ignora los que no tienen importe y redondea", () => {
  assert.equal(totalImportes(movs), 40);
  assert.equal(totalImportes([{ importe: 0.1 }, { importe: 0.2 }]), 0.3);
  assert.equal(totalImportes([]), 0);
});

test("desglosePorCategoria ordena de mayor a menor con porcentaje", () => {
  assert.deepEqual(desglosePorCategoria(movs), [
    { id: "s", nombre: "Supermercado", total: 30, pct: 75 },
    { id: "o", nombre: "Ocio", total: 5.5, pct: 14 },
    { id: null, nombre: "Sin categoría", total: 4.5, pct: 11 },
  ]);
  assert.deepEqual(desglosePorCategoria([]), []);
});

test("agruparPorDia mantiene el orden y suma cada día", () => {
  const dias = agruparPorDia(movs, AHORA);
  assert.deepEqual(
    dias.map((d) => [d.etiqueta, d.total, d.movimientos.map((m) => m.id)]),
    [
      ["Hoy", 25.5, ["1", "2"]],
      ["Ayer", 10, ["3", "4"]],
      ["domingo, 20 sept", 4.5, ["5"]],
    ],
  );
});

test("estiloCategoria: emoji conocido, inicial si es nueva, interrogación si no hay", () => {
  assert.deepEqual(estiloCategoria("Supermercado"), { emoji: "🛒" });
  assert.deepEqual(estiloCategoria("supermercado"), { emoji: "🛒" });
  assert.deepEqual(estiloCategoria("Mascotas"), { emoji: "M" });
  assert.deepEqual(estiloCategoria(null), { emoji: "?" });
});

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
