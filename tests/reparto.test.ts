import { test } from "node:test";
import assert from "node:assert/strict";
import { repartir, leerReparto, combinarNota, quitarNotaReparto } from "../lib/reparto.ts";

test("repartir a partes iguales, redondeado a céntimos", () => {
  assert.equal(repartir(60, 4), 15);
  assert.equal(repartir(10, 3), 3.33);
  assert.equal(repartir(52.52, 2), 26.26);
});

test("combinarNota añade la nota de reparto y conserva el texto original", () => {
  assert.match(combinarNota(null, { total: 60, personas: 4 })!, /^Pagado 60,00\s€ entre 4$/);
  const conWallet = combinarNota("Wallet · Importe: 60,00 € · Comercio: Bar Pepe", { total: 60, personas: 4 })!;
  assert.match(conWallet, /^Pagado 60,00\s€ entre 4\nWallet · Importe: 60,00 € · Comercio: Bar Pepe$/);
});

test("combinarNota sustituye un reparto anterior y lo quita si ya no se reparte", () => {
  const antes = combinarNota("Wallet · Bar Pepe", { total: 60, personas: 4 });
  assert.match(combinarNota(antes, { total: 60, personas: 3 })!, /^Pagado 60,00\s€ entre 3\nWallet · Bar Pepe$/);
  assert.equal(combinarNota(antes, null), "Wallet · Bar Pepe");
  assert.equal(combinarNota(combinarNota(null, { total: 9, personas: 2 }), null), null);
});

test("leerReparto recupera total y personas de la nota", () => {
  assert.deepEqual(leerReparto(combinarNota("Wallet · Bar Pepe", { total: 1250.5, personas: 5 })), {
    total: 1250.5,
    personas: 5,
  });
  assert.equal(leerReparto("Wallet · Bar Pepe"), null);
  assert.equal(leerReparto(null), null);
});

test("quitarNotaReparto deja solo el texto original", () => {
  assert.equal(quitarNotaReparto(combinarNota("SMS del banco", { total: 20, personas: 2 })), "SMS del banco");
  assert.equal(quitarNotaReparto(combinarNota(null, { total: 20, personas: 2 })), null);
});
