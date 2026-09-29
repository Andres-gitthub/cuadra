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
