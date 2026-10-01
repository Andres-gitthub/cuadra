import { test } from "node:test";
import assert from "node:assert/strict";
import { leerFormularioMovimiento, valoresEnviados } from "../lib/formulario.ts";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

const base = { importe: "45,00", comercio: "Bizum de Ana", fecha: "2026-09-28T13:00", categoria_id: "r" };

test("devolución válida", () => {
  const r = leerFormularioMovimiento(fd({ ...base, tipo: "reembolso" }));
  assert.ok(r.ok);
  assert.equal(r.datos.tipo, "reembolso");
  assert.equal(r.datos.importe, 45);
  assert.equal(r.datos.comercio, "Bizum de Ana");
  assert.equal(r.datos.categoria, "r");
  assert.equal(r.datos.fecha.toISOString(), "2026-09-28T11:00:00.000Z");
});

test("sin tipo se trata como gasto", () => {
  const r = leerFormularioMovimiento(fd(base));
  assert.ok(r.ok && r.datos.tipo === "gasto");
});

test("tipo desconocido se rechaza", () => {
  const r = leerFormularioMovimiento(fd({ ...base, tipo: "ingreso" }));
  assert.deepEqual(r, { ok: false, error: "Elige si es un gasto o una devolución" });
});

test("una devolución con categoría Automática queda sin categoría", () => {
  const r = leerFormularioMovimiento(fd({ ...base, tipo: "reembolso", categoria_id: "auto" }));
  assert.ok(r.ok && r.datos.categoria === null);
});

test("un gasto conserva Automática; vacío es sin categoría", () => {
  const auto = leerFormularioMovimiento(fd({ ...base, tipo: "gasto", categoria_id: "auto" }));
  assert.ok(auto.ok && auto.datos.categoria === "auto");
  const sin = leerFormularioMovimiento(fd({ ...base, categoria_id: "" }));
  assert.ok(sin.ok && sin.datos.categoria === null);
});

test("importe y fecha inválidos", () => {
  assert.deepEqual(leerFormularioMovimiento(fd({ ...base, importe: "abc" })), {
    ok: false,
    error: "Importe no válido (ej.: 12,50)",
  });
  assert.deepEqual(leerFormularioMovimiento(fd({ ...base, fecha: "" })), { ok: false, error: "Fecha no válida" });
});

test("valoresEnviados conserva lo escrito para volver a mostrarlo tras un error", () => {
  // React reinicia el formulario al enviarlo: sin esto, un Bizum con el importe mal escrito
  // volvía a aparecer como "Gasto" y podía acabar guardado así.
  assert.deepEqual(valoresEnviados(fd({ ...base, importe: "45,5,0", tipo: "reembolso" })), {
    tipo: "reembolso",
    importe: "45,5,0",
    comercio: "Bizum de Ana",
    categoria_id: "r",
    fecha: "2026-09-28T13:00",
    recordar: false,
    personas: "1",
  });
  assert.equal(valoresEnviados(fd(base)).tipo, "gasto");
  assert.equal(valoresEnviados(fd({ ...base, recordar: "on" })).recordar, true);
});

test("recordar: un gasto con categoría aprende la palabra clave del comercio", () => {
  const r = leerFormularioMovimiento(fd({ ...base, comercio: "REPSOL ES 1234", tipo: "gasto", recordar: "on" }));
  assert.ok(r.ok && r.datos.aprender === "repsol es");
  const sin = leerFormularioMovimiento(fd({ ...base, tipo: "gasto" }));
  assert.ok(sin.ok && sin.datos.aprender === null);
});

test("recordar exige una categoría concreta", () => {
  for (const categoria_id of ["auto", ""]) {
    assert.deepEqual(leerFormularioMovimiento(fd({ ...base, categoria_id, recordar: "on" })), {
      ok: false,
      error: "Elige una categoría para poder recordarla",
    });
  }
});

test("recordar con un comercio sin palabra útil se rechaza", () => {
  assert.deepEqual(leerFormularioMovimiento(fd({ ...base, comercio: "BP 0042", recordar: "on" })), {
    ok: false,
    error: "El comercio necesita al menos 3 letras para poder recordarlo",
  });
});

test("una devolución nunca aprende reglas", () => {
  const r = leerFormularioMovimiento(fd({ ...base, tipo: "reembolso", recordar: "on" }));
  assert.ok(r.ok && r.datos.aprender === null);
});

test("repartir: guarda tu parte y el reparto (total y personas)", () => {
  const r = leerFormularioMovimiento(fd({ ...base, importe: "60", tipo: "gasto", personas: "4" }));
  assert.ok(r.ok);
  assert.equal(r.datos.importe, 15);
  assert.deepEqual(r.datos.reparto, { total: 60, personas: 4 });
});

test("sin repartir (1 o ausente): importe tal cual y sin reparto", () => {
  for (const personas of ["1", undefined]) {
    const campos = personas ? { ...base, personas } : base;
    const r = leerFormularioMovimiento(fd(campos));
    assert.ok(r.ok && r.datos.importe === 45 && r.datos.reparto === null);
  }
});

test("personas fuera de rango o no numérico se rechaza", () => {
  for (const personas of ["0", "51", "2.5", "muchos"]) {
    assert.deepEqual(leerFormularioMovimiento(fd({ ...base, personas })), {
      ok: false,
      error: "Elige entre cuántas personas repartir (de 1 a 50)",
    });
  }
});

test("una devolución no se reparte", () => {
  const r = leerFormularioMovimiento(fd({ ...base, tipo: "reembolso", personas: "3" }));
  assert.ok(r.ok && r.datos.importe === 45 && r.datos.reparto === null);
});
