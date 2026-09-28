import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeIngestBody } from "../lib/ingest-input.ts";

test("wallet con importe en texto español", () => {
  const r = normalizeIngestBody({ source: "wallet", amount: "12,34 €", merchant: "Mercadona ", card: "BBVA ··1234" });
  assert.ok(r.ok);
  assert.equal(r.data.importe, 12.34);
  assert.equal(r.data.comercio, "Mercadona");
  assert.equal(r.data.revisado, true);
  assert.match(r.data.texto_original, /Tarjeta: BBVA/);
});

test("wallet con importe ilegible → no revisado, sin inventar", () => {
  const r = normalizeIngestBody({ source: "wallet", amount: "??", merchant: "Zara" });
  assert.ok(r.ok);
  assert.equal(r.data.importe, null);
  assert.equal(r.data.revisado, false);
});

test("sms delega en el parser", () => {
  const r = normalizeIngestBody({ source: "sms", text: "ING: Has pagado 8,90 € en SPOTIFY con tu tarjeta" });
  assert.ok(r.ok);
  assert.equal(r.data.origen, "sms");
  assert.equal(r.data.importe, 8.9);
  assert.equal(r.data.revisado, true);
});

test("cuerpos inválidos → error", () => {
  assert.equal(normalizeIngestBody(null).ok, false);
  assert.equal(normalizeIngestBody({ source: "otro" }).ok, false);
  assert.equal(normalizeIngestBody({ source: "sms", text: "" }).ok, false);
  assert.equal(normalizeIngestBody({ source: "wallet", merchant: "x" }).ok, false);
});
