import { createClient } from "@/lib/supabase/server";
import { COLUMNAS_FIJO, type GastoFijo } from "@/lib/types";
import { FijosVista } from "../vistas/FijosVista";

export default async function FijosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gastos_fijos").select(COLUMNAS_FIJO);
  return <FijosVista fijos={(data ?? []) as unknown as GastoFijo[]} error={error?.message} />;
}
