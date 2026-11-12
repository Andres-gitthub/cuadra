import { createClient } from "@/lib/supabase/server";
import { generarFijos } from "@/lib/generar-fijos";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { PendientesVista } from "../vistas/PendientesVista";

export default async function PendientesPage() {
  const supabase = await createClient();
  await generarFijos(supabase);
  const { data, error } = await supabase
    .from("transactions")
    .select(COLUMNAS_MOVIMIENTO)
    .eq("revisado", false)
    .order("fecha", { ascending: false });

  return <PendientesVista pendientes={(data ?? []) as unknown as Movimiento[]} error={error?.message} />;
}
