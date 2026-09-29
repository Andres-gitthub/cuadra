import { test } from "node:test";
import assert from "node:assert/strict";
import { totalImportes, desglosePorCategoria, agruparPorDia } from "../lib/resumen.ts";
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
  assert.equal(estiloCategoria("Supermercado").emoji, "🛒");
  assert.equal(estiloCategoria("supermercado").emoji, "🛒");
  assert.equal(estiloCategoria("Mascotas").emoji, "M");
  assert.equal(estiloCategoria(null).emoji, "?");
  assert.match(estiloCategoria("Ocio").color, /^#[0-9a-f]{6}$/i);
});
