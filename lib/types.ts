import type { ValoresFormulario } from "./formulario.ts";

export type Categoria = { id: string; nombre: string };

export type TipoMovimiento = "gasto" | "reembolso";

export type Movimiento = {
  id: string;
  fecha: string;
  importe: number | null;
  moneda: string;
  comercio: string | null;
  categoria_id: string | null;
  origen: "manual" | "wallet" | "sms" | "fijo";
  texto_original: string | null;
  revisado: boolean;
  tipo: TipoMovimiento;
  /** Fijo del que viene (creado desde Añadir con "Repetir cada mes" o generado cada mes). */
  gasto_fijo_id?: string | null;
  categories: { nombre: string } | null;
};

export const COLUMNAS_MOVIMIENTO =
  "id, fecha, importe, moneda, comercio, categoria_id, origen, texto_original, revisado, tipo, gasto_fijo_id, categories(nombre)";

/** Plantilla de un gasto que se repite cada mes por el mismo importe. */
export type GastoFijo = {
  id: string;
  comercio: string;
  importe: number;
  categoria_id: string | null;
  /** Día del cargo (1–31). En meses más cortos, el último día del mes. */
  dia: number;
  activo: boolean;
  /** "YYYY-MM-01": último mes ya generado. */
  ultimo_mes: string;
  categories: { nombre: string } | null;
};

export const COLUMNAS_FIJO = "id, comercio, importe, categoria_id, dia, activo, ultimo_mes, categories(nombre)";

/** Estado del formulario de movimientos. Tras un error trae lo enviado, para no perderlo al reiniciarse el formulario. */
export type EstadoFormulario = { error: string | null; valores?: ValoresFormulario; intento?: number };
