import { test } from "node:test";
import assert from "node:assert/strict";
import { horaLocalAUtc, utcAHoraLocal, rangoMes, mesActual } from "../lib/dates.ts";

test("hora de Madrid en verano (UTC+2) e invierno (UTC+1)", () => {
  assert.equal(horaLocalAUtc("2026-07-15T10:00")!.toISOString(), "2026-07-15T08:00:00.000Z");
  assert.equal(horaLocalAUtc("2026-01-15T10:00")!.toISOString(), "2026-01-15T09:00:00.000Z");
});

test("ida y vuelta", () => {
  assert.equal(utcAHoraLocal(horaLocalAUtc("2026-10-25T01:30")!), "2026-10-25T01:30");
});

test("rango del mes en hora de Madrid", () => {
  const r = rangoMes(mesActual(new Date("2026-09-30T23:30:00Z"))); // ya es 1 de octubre en Madrid
  assert.equal(r.desde.toISOString(), "2026-09-30T22:00:00.000Z");
  assert.equal(r.hasta.toISOString(), "2026-10-31T23:00:00.000Z");
});

test("formato inválido → null", () => {
  assert.equal(horaLocalAUtc("ayer"), null);
});
