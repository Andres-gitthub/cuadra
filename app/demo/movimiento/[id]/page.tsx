import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CATEGORIAS_DEMO, movimientoDemoPorId } from "@/lib/demo";
import { BASE_DEMO, esRutaDemo, rutaSegura } from "@/lib/rutas";
import { EditarVista } from "../../../vistas/EditarVista";

export default async function DemoEditar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  await connection(); // los datos dependen de la fecha de hoy
  const { id } = await params;
  const pedido = rutaSegura((await searchParams).volver);
  // Desde la demo solo se vuelve a la demo.
  const volver = esRutaDemo(pedido) ? pedido : BASE_DEMO;

  const movimiento = movimientoDemoPorId(id);
  if (!movimiento) notFound();

  return <EditarVista movimiento={movimiento} categorias={CATEGORIAS_DEMO} volver={volver} demo />;
}
