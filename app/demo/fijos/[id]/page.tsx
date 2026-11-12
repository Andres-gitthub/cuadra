import { notFound } from "next/navigation";
import { CATEGORIAS_DEMO, fijoDemoPorId } from "@/lib/demo";
import { BASE_DEMO } from "@/lib/rutas";
import { FijoVista } from "../../../vistas/FijoVista";

export default async function DemoFijo({ params }: { params: Promise<{ id: string }> }) {
  const fijo = fijoDemoPorId((await params).id);
  if (!fijo) notFound();
  return <FijoVista fijo={fijo} categorias={CATEGORIAS_DEMO} base={BASE_DEMO} />;
}
