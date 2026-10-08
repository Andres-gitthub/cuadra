import { createClient } from "@/lib/supabase/server";
import { NuevoVista } from "../../vistas/NuevoVista";

export default async function NuevoPage() {
  const supabase = await createClient();
  const { data: categorias } = await supabase.from("categories").select("id, nombre").order("nombre");

  return <NuevoVista categorias={categorias ?? []} ahora={new Date()} />;
}
