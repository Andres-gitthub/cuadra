import { parseAmount } from "./amount.ts";

export type SmsParseResult = {
  importe: number | null;
  moneda: "EUR";
  comercio: string | null;
  /** true solo si importe Y comercio se extrajeron con seguridad */
  revisado: boolean;
  motivo?: string;
};

// Mensajes que NO son un gasto confirmado.
const OTP = /c[oó]digo|\bclave\b|contrase[nñ]a|\bOTP\b|no (lo|la) compartas|verificaci[oó]n/i;
const INGRESO = /has recibido|transferencia recibida|\babono\b|devoluci[oó]n|\bingreso\b|reembolso|n[oó]mina/i;

// Palabras que indican un gasto.
const GASTO = /compra|\bpago\b|pagado|\bcargo\b|operaci[oó]n|retirada|reintegro|adeudo|\brecibo\b|\bcobro\b/i;

// Importe junto a EUR/€ (antes o después). El resto de monedas no se reconocen a propósito.
const NUM = String.raw`\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
const IMPORTE_EUR = new RegExp(
  String.raw`(?<![\d.,])(${NUM})\s*(?:EUR|€|euros?)(?![a-z])|(?:EUR|€)\s*(${NUM})(?![\d])`,
  "gi",
);

// Contexto justo antes de un importe que indica que es un saldo/límite, no el gasto.
const CONTEXTO_SALDO = /(saldo|disponible|l[ií]mite)[^\d]{0,25}$/i;

// Dónde termina el nombre del comercio.
const FIN_COMERCIO = String.raw`(?=\s+(?:(?:por|con|a las|el d[ií]a|fecha|importe|saldo|tarjeta|terminada)\b|el \d)|\s+(?:EUR|€)|\s*\d+(?:[.,]\d{1,2})?\s*(?:EUR|€)|[.;,](?:\s|$)|\s*$)`;
const COMERCIO_EN = new RegExp(String.raw`\ben\s+(.+?)${FIN_COMERCIO}`, "gi");
const COMERCIO_ETIQUETA = new RegExp(String.raw`\bcomercio\s*:\s*(.+?)${FIN_COMERCIO}`, "i");
// "en tarjeta", "en tu cuenta", "en la app", "en 1111"... no son comercios.
const NO_ES_COMERCIO = /^(?:(?:tu|su|la|el|el\s+)?\s*(?:tarjeta|cuenta|app|aplicaci[oó]n|web|banca)\b|tu\b|su\b|la\b|[\d*.]+)/i;

export function parseSms(text: string): SmsParseResult {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  const noRevisado = (motivo: string, comercio: string | null = null): SmsParseResult => ({
    importe: null,
    moneda: "EUR",
    comercio,
    revisado: false,
    motivo,
  });

  if (!t) return noRevisado("SMS vacío");
  if (OTP.test(t)) return noRevisado("Parece un código de verificación, no un gasto confirmado");
  if (INGRESO.test(t)) return noRevisado("Parece un ingreso o devolución, no un gasto");

  const comercio = extraerComercio(t);
  if (!GASTO.test(t)) return noRevisado("No se reconoce como un gasto", comercio);

  const importes = extraerImportes(t);
  if (importes.length === 0) return noRevisado("No se encontró un importe en EUR", comercio);
  if (importes.length > 1) return noRevisado("Hay varios importes distintos; no se puede saber cuál es", comercio);

  const importe = importes[0];
  if (!comercio) {
    return { importe, moneda: "EUR", comercio: null, revisado: false, motivo: "No se encontró el comercio" };
  }
  return { importe, moneda: "EUR", comercio, revisado: true };
}

function extraerImportes(t: string): number[] {
  const valores = new Set<number>();
  for (const m of t.matchAll(IMPORTE_EUR)) {
    const antes = t.slice(0, m.index);
    if (CONTEXTO_SALDO.test(antes)) continue;
    const valor = parseAmount(m[1] ?? m[2]);
    if (valor !== null) valores.add(valor);
  }
  return [...valores];
}

function extraerComercio(t: string): string | null {
  const etiqueta = t.match(COMERCIO_ETIQUETA);
  if (etiqueta) return limpiarComercio(etiqueta[1]);

  for (const m of t.matchAll(COMERCIO_EN)) {
    const candidato = m[1].trim();
    if (NO_ES_COMERCIO.test(candidato)) continue;
    const limpio = limpiarComercio(candidato);
    if (limpio) return limpio;
  }
  return null;
}

export function limpiarComercio(s: string | null | undefined): string | null {
  if (!s) return null;
  const limpio = s.replace(/[\s.,;:]+$/, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return limpio.length > 0 ? limpio : null;
}
