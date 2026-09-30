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
  origen: "manual" | "wallet" | "sms";
  texto_original: string | null;
  revisado: boolean;
  tipo: TipoMovimiento;
  categories: { nombre: string } | null;
};

export const COLUMNAS_MOVIMIENTO =
  "id, fecha, importe, moneda, comercio, categoria_id, origen, texto_original, revisado, tipo, categories(nombre)";

/** Estado del formulario de movimientos. Tras un error trae lo enviado, para no perderlo al reiniciarse el formulario. */
export type EstadoFormulario = { error: string | null; valores?: ValoresFormulario; intento?: number };
