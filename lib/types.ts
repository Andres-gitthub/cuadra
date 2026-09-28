export type Categoria = { id: string; nombre: string };

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
  categories: { nombre: string } | null;
};

export const COLUMNAS_MOVIMIENTO =
  "id, fecha, importe, moneda, comercio, categoria_id, origen, texto_original, revisado, categories(nombre)";

export type EstadoFormulario = { error: string | null };
