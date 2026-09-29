import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mesActual,
  parseMes,
  desplazarMes,
  claveMes,
  rangoMes,
  nombreMes,
  claveDia,
  etiquetaDia,
} from "../lib/dates.ts";

const AHORA = new Date("2026-09-28T10:00:00Z"); // lunes 28 sept 2026, 12:00 en Madrid

test("mes actual en hora de Madrid", () => {
  assert.deepEqual(mesActual(AHORA), { y: 2026, m: 9 });
  assert.deepEqual(mesActual(new Date("2026-09-30T22:30:00Z")), { y: 2026, m: 10 }); // ya es 1 oct en Madrid
});

test("parseMes acepta YYYY-MM y rechaza lo inválido o futuro", () => {
  assert.deepEqual(parseMes("2026-08", AHORA), { y: 2026, m: 8 });
  assert.deepEqual(parseMes("2025-12", AHORA), { y: 2025, m: 12 });
  assert.deepEqual(parseMes(undefined, AHORA), { y: 2026, m: 9 });
  assert.deepEqual(parseMes("2026-13", AHORA), { y: 2026, m: 9 });
  assert.deepEqual(parseMes("basura", AHORA), { y: 2026, m: 9 });
  assert.deepEqual(parseMes("2026-10", AHORA), { y: 2026, m: 9 }); // futuro → actual
});

test("desplazarMes cruza años", () => {
  assert.deepEqual(desplazarMes({ y: 2026, m: 1 }, -1), { y: 2025, m: 12 });
  assert.deepEqual(desplazarMes({ y: 2025, m: 12 }, 1), { y: 2026, m: 1 });
});

test("claveMes y nombreMes", () => {
  assert.equal(claveMes({ y: 2026, m: 8 }), "2026-08");
  assert.equal(nombreMes({ y: 2026, m: 8 }), "agosto 2026");
});

test("rangoMes en hora de Madrid", () => {
  const r = rangoMes({ y: 2026, m: 10 });
  assert.equal(r.desde.toISOString(), "2026-09-30T22:00:00.000Z");
  assert.equal(r.hasta.toISOString(), "2026-10-31T23:00:00.000Z");
});

test("claveDia usa el día de Madrid", () => {
  assert.equal(claveDia("2026-09-27T22:30:00Z"), "2026-09-28"); // 00:30 del 28 en Madrid
});

test("etiquetaDia: Hoy, Ayer y fecha legible", () => {
  assert.equal(etiquetaDia("2026-09-28", AHORA), "Hoy");
  assert.equal(etiquetaDia("2026-09-27", AHORA), "Ayer");
  assert.equal(etiquetaDia("2026-09-21", AHORA), "lunes, 21 sept");
  assert.equal(etiquetaDia("2025-12-31", AHORA), "miércoles, 31 dic 2025");
});
