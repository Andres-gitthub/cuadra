import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseSms } from "../lib/sms-parser.ts";
import { parseAmount } from "../lib/amount.ts";

describe("parseAmount", () => {
  const casos: Array<[string | number, number | null]> = [
    ["23,45", 23.45],
    ["23,45 €", 23.45],
    ["1.234,56 EUR", 1234.56],
    ["1.234", 1234],
    ["12.34", 12.34],
    ["12,5", 12.5],
    ["€ 9,99", 9.99],
    ["1,234.56", 1234.56],
    [12.345, 12.35],
    ["1,234", null], // ambiguo: no se adivina
    ["0,00", null],
    [-5, null],
    ["abc", null],
    ["", null],
  ];
  for (const [entrada, esperado] of casos) {
    test(`${JSON.stringify(entrada)} → ${esperado}`, () => {
      assert.equal(parseAmount(entrada), esperado);
    });
  }
});

describe("parseSms: casos que deben extraerse (revisado = true)", () => {
  const casos: Array<{ nombre: string; sms: string; importe: number; comercio: string }> = [
    {
      nombre: "BBVA con saldo disponible (el saldo se ignora)",
      sms: "BBVA: Compra con tu tarjeta ****1234 en MERCADONA VALENCIA por 23,45 EUR. Saldo disponible: 1.234,56 EUR",
      importe: 23.45,
      comercio: "MERCADONA VALENCIA",
    },
    {
      nombre: "CaixaBank con fecha y hora",
      sms: "CaixaBank: Operación con la tarjeta 4567 de 45,00 EUR en REPSOL ES 1234 el 12/03 a las 10:15.",
      importe: 45,
      comercio: "REPSOL ES 1234",
    },
    {
      nombre: "Santander con miles y símbolo €",
      sms: "Santander: Pago de 1.250,00€ en EL CORTE INGLES con tarjeta *9876.",
      importe: 1250,
      comercio: "EL CORTE INGLES",
    },
    {
      nombre: "ING 'has pagado'",
      sms: "ING: Has pagado 8,90 € en SPOTIFY con tu tarjeta terminada en 1111",
      importe: 8.9,
      comercio: "SPOTIFY",
    },
    {
      nombre: "Sabadell con 'Comercio:' y un solo decimal",
      sms: "Sabadell: cargo de 12,5 EUR en tarjeta ...3456. Comercio: AMAZON EU SARL",
      importe: 12.5,
      comercio: "AMAZON EU SARL",
    },
    {
      nombre: "Compra aprobada sin espacio antes de EUR",
      sms: "Compra aprobada: 3,20EUR en CAFETERIA LA PLAZA. Tarjeta 5555.",
      importe: 3.2,
      comercio: "CAFETERIA LA PLAZA",
    },
    {
      nombre: "Moneda antes del importe",
      sms: "Pago con Apple Pay EUR 9,99 en NETFLIX.COM",
      importe: 9.99,
      comercio: "NETFLIX.COM",
    },
  ];

  for (const c of casos) {
    test(c.nombre, () => {
      const r = parseSms(c.sms);
      assert.equal(r.importe, c.importe);
      assert.equal(r.comercio, c.comercio);
      assert.equal(r.moneda, "EUR");
      assert.equal(r.revisado, true);
    });
  }
});

describe("parseSms: casos que deben fallar (revisado = false, sin inventar datos)", () => {
  test("SMS de código OTP: no es un gasto confirmado", () => {
    const r = parseSms(
      "BBVA: El código para confirmar tu compra de 59,99 EUR en ZALANDO es 482913. No lo compartas con nadie.",
    );
    assert.equal(r.importe, null);
    assert.equal(r.revisado, false);
  });

  test("Aviso de compra sin importe", () => {
    const r = parseSms(
      "CaixaBank: Se ha realizado una compra con tu tarjeta en AMAZON. Consulta el detalle en la app.",
    );
    assert.equal(r.importe, null);
    assert.equal(r.comercio, "AMAZON");
    assert.equal(r.revisado, false);
  });

  test("Dos importes distintos: ambiguo", () => {
    const r = parseSms("Compra 20,00 EUR y 35,50 EUR en PARKING CENTRO");
    assert.equal(r.importe, null);
    assert.equal(r.revisado, false);
  });

  test("Moneda extranjera: no se asume EUR", () => {
    const r = parseSms("Compra de 15.99 USD en APPLE.COM/BILL");
    assert.equal(r.importe, null);
    assert.equal(r.revisado, false);
  });

  test("Ingreso/transferencia recibida: no es un gasto", () => {
    const r = parseSms("Santander: Has recibido una transferencia de 500,00 EUR de JUAN PEREZ.");
    assert.equal(r.importe, null);
    assert.equal(r.revisado, false);
  });

  test("Devolución: no es un gasto", () => {
    const r = parseSms("BBVA: Devolución de 19,95 EUR en ZARA en tu tarjeta ****1234.");
    assert.equal(r.importe, null);
    assert.equal(r.revisado, false);
  });

  test("Importe claro pero sin comercio: se guarda el importe y queda pendiente", () => {
    const r = parseSms("Unicaja: cargo en cuenta de 30,00 EUR. Recibo domiciliado.");
    assert.equal(r.importe, 30);
    assert.equal(r.comercio, null);
    assert.equal(r.revisado, false);
  });

  test("Texto sin relación con pagos", () => {
    const r = parseSms("Tu banco: hemos actualizado nuestras condiciones. Más info en la app.");
    assert.equal(r.importe, null);
    assert.equal(r.revisado, false);
  });

  test("Texto vacío", () => {
    const r = parseSms("   ");
    assert.equal(r.importe, null);
    assert.equal(r.comercio, null);
    assert.equal(r.revisado, false);
  });
});
