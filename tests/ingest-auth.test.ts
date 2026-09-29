import { test } from "node:test";
import assert from "node:assert/strict";
import { comprobarToken } from "../lib/ingest-auth.ts";

const T = "abc123";

test("cabecera correcta", () => {
  assert.deepEqual(comprobarToken(`Bearer ${T}`, T), { ok: true });
});

test("tolera mayúsculas, espacios especiales, invisibles y comillas", () => {
  assert.ok(comprobarToken(`bearer ${T}`, T).ok);
  assert.ok(comprobarToken(`Bearer ${T}`, T).ok); // espacio no separable
  assert.ok(comprobarToken(`Bearer  ${T} \n`, T).ok);
  assert.ok(comprobarToken(`Bearer ${T}​`, T).ok); // carácter invisible
  assert.ok(comprobarToken(`Bearer “${T}”`, T).ok);
});

test("explica el motivo cuando falla", () => {
  const sinCabecera = comprobarToken(null, T);
  assert.ok(!sinCabecera.ok && /No ha llegado la cabecera/.test(sinCabecera.motivo));

  const sinBearer = comprobarToken(T, T);
  assert.ok(!sinBearer.ok && /Bearer/.test(sinBearer.motivo));

  const malo = comprobarToken("Bearer abc12", T);
  assert.ok(!malo.ok && /no coincide \(se han recibido 5 caracteres\)/.test(malo.motivo));
});

test("sin INGEST_TOKEN en el servidor, rechaza todo", () => {
  assert.equal(comprobarToken(`Bearer ${T}`, undefined).ok, false);
  assert.equal(comprobarToken("Bearer ", "").ok, false);
});
