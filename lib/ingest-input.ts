import { parseAmount } from "./amount.ts";
import { parseSms, limpiarComercio } from "./sms-parser.ts";

export type NuevoMovimiento = {
  origen: "wallet" | "sms";
  importe: number | null;
  moneda: "EUR";
  comercio: string | null;
  texto_original: string;
  revisado: boolean;
};

export type IngestResult = { ok: true; data: NuevoMovimiento } | { ok: false; error: string };

const MAX_TEXTO = 2000;

/** Valida el JSON que envía el Atajo y lo convierte en un movimiento. No toca la base de datos. */
export function normalizeIngestBody(body: unknown): IngestResult {
  if (typeof body !== "object" || body === null) return { ok: false, error: "El cuerpo debe ser un objeto JSON" };
  const b = body as Record<string, unknown>;

  if (b.source === "sms") {
    if (typeof b.text !== "string" || !b.text.trim()) return { ok: false, error: "Falta 'text' (texto del SMS)" };
    if (b.text.length > MAX_TEXTO) return { ok: false, error: `'text' supera ${MAX_TEXTO} caracteres` };
    const r = parseSms(b.text);
    return {
      ok: true,
      data: {
        origen: "sms",
        importe: r.importe,
        moneda: "EUR",
        comercio: r.comercio,
        texto_original: b.text.trim(),
        revisado: r.revisado,
      },
    };
  }

  if (b.source === "wallet") {
    const amount = b.amount;
    if (typeof amount !== "string" && typeof amount !== "number") {
      return { ok: false, error: "Falta 'amount' (número o texto)" };
    }
    const merchant = typeof b.merchant === "string" ? b.merchant.slice(0, MAX_TEXTO) : "";
    const card = typeof b.card === "string" ? b.card.slice(0, 200) : "";
    const importe = parseAmount(amount);
    const comercio = limpiarComercio(merchant);
    const texto = [`Wallet`, `Importe: ${String(amount).slice(0, 50)}`, `Comercio: ${merchant}`, card && `Tarjeta: ${card}`]
      .filter(Boolean)
      .join(" · ");
    return {
      ok: true,
      data: {
        origen: "wallet",
        importe,
        moneda: "EUR",
        comercio,
        texto_original: texto,
        revisado: importe !== null && comercio !== null,
      },
    };
  }

  return { ok: false, error: "'source' debe ser \"wallet\" o \"sms\"" };
}
