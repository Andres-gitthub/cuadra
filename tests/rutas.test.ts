import { test } from "node:test";
import assert from "node:assert/strict";
import { rutaSegura } from "../lib/rutas.ts";

test("acepta rutas internas con parámetros", () => {
  assert.equal(rutaSegura("/"), "/");
  assert.equal(rutaSegura("/pendientes"), "/pendientes");
  assert.equal(rutaSegura("/?mes=2026-08&cat=sin"), "/?mes=2026-08&cat=sin");
});

test("rechaza destinos externos o raros", () => {
  assert.equal(rutaSegura("//evil.com"), "/");
  assert.equal(rutaSegura("/\\evil.com"), "/");
  assert.equal(rutaSegura("https://evil.com"), "/");
  assert.equal(rutaSegura(null), "/");
  assert.equal(rutaSegura(undefined), "/");
});
