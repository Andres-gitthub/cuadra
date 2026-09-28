import { createAdminClient } from "@/lib/supabase/admin";
import { categorize } from "@/lib/categorize";
import type { NuevoMovimiento } from "@/lib/ingest-input";

const VENTANA_DUPLICADOS_MS = 2 * 60 * 1000;

export type GuardarResultado =
  | { duplicate: true; id: string }
  | { duplicate: false; id: string; categoria_id: string | null };

/** Guarda un movimiento del Atajo para OWNER_USER_ID, evitando duplicados y autocategorizando. */
export async function guardarMovimiento(mov: NuevoMovimiento, ahora = new Date()): Promise<GuardarResultado> {
  const userId = process.env.OWNER_USER_ID;
  if (!userId) throw new Error("Falta OWNER_USER_ID");
  const db = createAdminClient();

  // Duplicado = mismo importe + mismo comercio en ±2 minutos.
  if (mov.importe !== null && mov.comercio !== null) {
    const desde = new Date(ahora.getTime() - VENTANA_DUPLICADOS_MS).toISOString();
    const hasta = new Date(ahora.getTime() + VENTANA_DUPLICADOS_MS).toISOString();
    const { data, error } = await db
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("importe", mov.importe)
      .ilike("comercio", escaparLike(mov.comercio))
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .limit(1);
    if (error) throw new Error(`Error comprobando duplicados: ${error.message}`);
    if (data && data.length > 0) return { duplicate: true, id: data[0].id };
  }

  const { data: cats, error: catError } = await db
    .from("categories")
    .select("id, palabras_clave")
    .eq("user_id", userId);
  if (catError) throw new Error(`Error leyendo categorías: ${catError.message}`);
  const categoria_id = categorize(mov.comercio, cats ?? []);

  const { data: fila, error } = await db
    .from("transactions")
    .insert({ ...mov, user_id: userId, categoria_id, fecha: ahora.toISOString() })
    .select("id")
    .single();
  if (error) throw new Error(`Error guardando movimiento: ${error.message}`);
  return { duplicate: false, id: fila.id, categoria_id };
}

function escaparLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
