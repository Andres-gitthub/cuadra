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
