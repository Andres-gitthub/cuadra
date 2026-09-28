import { test } from "node:test";
import assert from "node:assert/strict";
import { categorize } from "../lib/categorize.ts";

const cats = [
  { id: "super", palabras_clave: ["mercadona", "dia "] },
  { id: "transporte", palabras_clave: ["uber"] },
  { id: "restaurantes", palabras_clave: ["uber eats", "cafeteria"] },
  { id: "compras", palabras_clave: ["el corte ingles"] },
];

test("coincide sin distinguir mayúsculas ni acentos", () => {
  assert.equal(categorize("MERCADONA VALENCIA", cats), "super");
  assert.equal(categorize("El Corte Inglés", cats), "compras");
  assert.equal(categorize("CAFETERÍA LA PLAZA", cats), "restaurantes");
});

test("gana la palabra clave más específica", () => {
  assert.equal(categorize("UBER EATS MADRID", cats), "restaurantes");
  assert.equal(categorize("UBER *TRIP", cats), "transporte");
});

test("clave con espacio casa al final del nombre", () => {
  assert.equal(categorize("DIA", cats), "super");
});

test("sin coincidencia o sin comercio → null", () => {
  assert.equal(categorize("FERRETERIA PEPE", cats), null);
  assert.equal(categorize(null, cats), null);
});
