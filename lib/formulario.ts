import { parseAmount } from "./amount.ts";
import { limpiarComercio } from "./sms-parser.ts";
import { horaLocalAUtc } from "./dates.ts";
import type { TipoMovimiento } from "./types.ts";

export type DatosMovimiento = {
  tipo: TipoMovimiento;
  importe: number;
  comercio: string | null;
  fecha: Date;
  /** "auto" (autocategorizar), el id de una categoría o null (sin categoría). */
  categoria: string | null;
};

/** Valida el formulario de alta/edición. No toca la base de datos. */
export function leerFormularioMovimiento(fd: FormData): { ok: true; datos: DatosMovimiento } | { ok: false; error: string } {
  const tipoCrudo = String(fd.get("tipo") ?? "gasto");
  if (tipoCrudo !== "gasto" && tipoCrudo !== "reembolso") {
    return { ok: false, error: "Elige si es un gasto o una devolución" };
  }
  const importe = parseAmount(String(fd.get("importe") ?? ""));
  if (importe === null) return { ok: false, error: "Importe no válido (ej.: 12,50)" };
  const fecha = horaLocalAUtc(String(fd.get("fecha") ?? ""));
  if (!fecha) return { ok: false, error: "Fecha no válida" };

  let categoria: string | null = String(fd.get("categoria_id") ?? "") || null;
  // Autocategorizar por el concepto de una devolución ("Bizum de Ana") no tiene sentido.
  if (tipoCrudo === "reembolso" && categoria === "auto") categoria = null;

  return {
    ok: true,
    datos: { tipo: tipoCrudo, importe, comercio: limpiarComercio(String(fd.get("comercio") ?? "")), fecha, categoria },
  };
}

export type ValoresFormulario = { tipo: string; importe: string; comercio: string; categoria_id: string; fecha: string };

/**
 * Lo que el usuario envió, tal cual, para volver a mostrarlo si hay un error: React reinicia el
 * formulario al enviarlo, y sin esto el selector volvería a "Gasto" sin avisar.
 */
export function valoresEnviados(fd: FormData): ValoresFormulario {
  const texto = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    tipo: texto("tipo") || "gasto",
    importe: texto("importe"),
    comercio: texto("comercio"),
    categoria_id: texto("categoria_id"),
    fecha: texto("fecha"),
  };
}
