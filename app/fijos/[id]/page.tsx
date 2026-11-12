import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COLUMNAS_FIJO, type GastoFijo } from "@/lib/types";
import { FijoVista } from "../../vistas/FijoVista";

export default async function FijoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: categorias }] = await Promise.all([
    supabase.from("gastos_fijos").select(COLUMNAS_FIJO).eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, nombre").order("nombre"),
  ]);
  if (!data) notFound();
  return <FijoVista fijo={data as unknown as GastoFijo} categorias={categorias ?? []} />;
}
