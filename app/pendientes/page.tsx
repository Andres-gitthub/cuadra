import { createClient } from "@/lib/supabase/server";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { PendientesVista } from "../vistas/PendientesVista";

export default async function PendientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(COLUMNAS_MOVIMIENTO)
    .eq("revisado", false)
    .order("fecha", { ascending: false });

  return <PendientesVista pendientes={(data ?? []) as unknown as Movimiento[]} error={error?.message} />;
}
