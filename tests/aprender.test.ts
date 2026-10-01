import { test } from "node:test";
import assert from "node:assert/strict";
import { claveDeComercio, aplicarRegla, gastosQueCoinciden } from "../lib/aprender.ts";
import { coincide } from "../lib/categorize.ts";

test("claveDeComercio: minúsculas, sin trozos con números ni asteriscos", () => {
  assert.equal(claveDeComercio("Bar Pepe"), "bar pepe");
  assert.equal(claveDeComercio("REPSOL ES 1234"), "repsol es");
  assert.equal(claveDeComercio("UBER *TRIP"), "uber");
  assert.equal(claveDeComercio("  Cafetería   La Plaza "), "cafetería la plaza");
});

test("claveDeComercio: nada útil o demasiado corto → null", () => {
  assert.equal(claveDeComercio(null), null);
  assert.equal(claveDeComercio(""), null);
  assert.equal(claveDeComercio("12345"), null);
  assert.equal(claveDeComercio("BP 0042"), null); // "bp": solo 2 letras
});

test("coincide: sin distinguir mayúsculas ni tildes, igual que la categorización", () => {
  assert.equal(coincide("CAFETERIA LA PLAZA", "cafetería la plaza"), true);
  assert.equal(coincide("Repsol ES 9876", "repsol es"), true);
  assert.equal(coincide("Lidl", "bar pepe"), false);
  assert.equal(coincide(null, "bar pepe"), false);
});

test("aplicarRegla añade la clave a la categoría elegida y la quita de las demás", () => {
  const cats = [
    { id: "ocio", palabras_clave: ["cine", "Bar Pepe"] },
    { id: "rest", palabras_clave: ["restaurante"] },
    { id: "super", palabras_clave: null },
  ];
  assert.deepEqual(aplicarRegla(cats, "bar pepe", "rest"), [
    { id: "ocio", palabras_clave: ["cine"] },
    { id: "rest", palabras_clave: ["restaurante", "bar pepe"] },
  ]);
});

test("aplicarRegla no cambia nada si la categoría ya la tenía", () => {
  const cats = [{ id: "rest", palabras_clave: ["BAR PEPE"] }];
  assert.deepEqual(aplicarRegla(cats, "bar pepe", "rest"), []);
});

test("gastosQueCoinciden: solo gastos de ese comercio que aún no están en la categoría", () => {
  const movs = [
    { id: "1", comercio: "BAR PEPE", tipo: "gasto", categoria_id: null },
    { id: "2", comercio: "Bar Pepe Madrid", tipo: "gasto", categoria_id: "ocio" },
    { id: "3", comercio: "Bar Pepe", tipo: "reembolso", categoria_id: null }, // devolución: nunca
    { id: "4", comercio: "bar pepe", tipo: "gasto", categoria_id: "rest" }, // ya está bien
    { id: "5", comercio: "Lidl", tipo: "gasto", categoria_id: null },
    { id: "6", comercio: null, tipo: "gasto", categoria_id: null },
    { id: "7", comercio: "Bar Pepe", categoria_id: null }, // sin tipo = gasto
  ];
  assert.deepEqual(gastosQueCoinciden(movs, "bar pepe", "rest"), ["1", "2", "7"]);
});
