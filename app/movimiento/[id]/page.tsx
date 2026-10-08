import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/rutas";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { EditarVista } from "../../vistas/EditarVista";

export default async function EditarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  const { id } = await params;
  const volver = rutaSegura((await searchParams).volver);
  const supabase = await createClient();

  const [{ data }, { data: categorias }] = await Promise.all([
    supabase.from("transactions").select(COLUMNAS_MOVIMIENTO).eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, nombre").order("nombre"),
  ]);
  if (!data) notFound();

  return <EditarVista movimiento={data as unknown as Movimiento} categorias={categorias ?? []} volver={volver} />;
}
