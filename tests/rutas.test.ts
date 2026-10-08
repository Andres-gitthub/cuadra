import { test } from "node:test";
import assert from "node:assert/strict";
import { conBase, esRutaDemo, rutaSegura } from "../lib/rutas.ts";

test("conBase: la misma ruta dentro de la app o de la demo", () => {
  assert.equal(conBase("", "/"), "/");
  assert.equal(conBase("", "/pendientes"), "/pendientes");
  assert.equal(conBase("/demo", "/"), "/demo");
  assert.equal(conBase("/demo", "/movimiento/nuevo"), "/demo/movimiento/nuevo");
});

test("esRutaDemo: solo /demo y lo que cuelga de ella", () => {
  assert.equal(esRutaDemo("/demo"), true);
  assert.equal(esRutaDemo("/demo/estadisticas"), true);
  assert.equal(esRutaDemo("/demo?mes=2026-09"), true);
  assert.equal(esRutaDemo("/demonio"), false);
  assert.equal(esRutaDemo("/"), false);
  assert.equal(esRutaDemo("/pendientes"), false);
});

test("acepta rutas internas con parámetros", () => {
  assert.equal(rutaSegura("/"), "/");
  assert.equal(rutaSegura("/pendientes"), "/pendientes");
  assert.equal(rutaSegura("/?mes=2026-08&cat=sin"), "/?mes=2026-08&cat=sin");
});

test("rechaza destinos externos o raros", () => {
  assert.equal(rutaSegura("//evil.com"), "/");
  assert.equal(rutaSegura("/\\evil.com"), "/");
  assert.equal(rutaSegura("https://evil.com"), "/");
  // El parser de URL elimina tabuladores y saltos de línea: "/\t/evil.com" acabaría en "//evil.com".
  assert.equal(rutaSegura("/\t/evil.com"), "/");
  assert.equal(rutaSegura("/\n/evil.com"), "/");
  assert.equal(rutaSegura("/\r\n/evil.com"), "/");
  assert.equal(rutaSegura(null), "/");
  assert.equal(rutaSegura(undefined), "/");
});
