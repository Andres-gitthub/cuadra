import type { SupabaseClient } from "@supabase/supabase-js";
import { mesActual } from "./dates.ts";
import { generacionPendiente, primerDiaDeMes, type FijoParaGenerar } from "./fijos.ts";

/**
 * Crea los movimientos de los gastos fijos que ya tocan. Se llama al cargar las páginas principales.
 * Nunca lanza: si falla, se registra y la página carga igual; la siguiente carga lo reintenta y el
 * índice único (gasto_fijo_id, fecha) evita duplicados.
 */
export async function generarFijos(supabase: SupabaseClient, ahora = new Date()): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("gastos_fijos")
      .select("id, comercio, importe, categoria_id, dia, activo, ultimo_mes")
      .eq("activo", true)
      .lt("ultimo_mes", primerDiaDeMes(mesActual(ahora)));
    if (error) throw error;

    for (const fijo of (data ?? []) as FijoParaGenerar[]) {
      const pendiente = generacionPendiente({ ...fijo, importe: Number(fijo.importe) }, ahora);
      if (!pendiente) continue;
      const insertado = await supabase
        .from("transactions")
        .upsert(pendiente.filas, { onConflict: "gasto_fijo_id,fecha", ignoreDuplicates: true });
      if (insertado.error) {
        console.error("[fijos] insertar", fijo.id, insertado.error.message);
        continue;
      }
      // Solo avanza: si otra escritura ya lo dejó más adelante, no se retrocede.
      const actualizado = await supabase
        .from("gastos_fijos")
        .update({ ultimo_mes: pendiente.ultimo_mes })
        .eq("id", fijo.id)
        .lt("ultimo_mes", pendiente.ultimo_mes);
      if (actualizado.error) console.error("[fijos] ultimo_mes", fijo.id, actualizado.error.message);
    }
  } catch (e) {
    console.error("[fijos]", e instanceof Error ? e.message : e);
  }
}
