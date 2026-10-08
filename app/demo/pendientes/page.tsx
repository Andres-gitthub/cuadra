import { connection } from "next/server";
import { pendientesDemo } from "@/lib/demo";
import { BASE_DEMO } from "@/lib/rutas";
import { PendientesVista } from "../../vistas/PendientesVista";

export default async function DemoPendientes() {
  await connection(); // los datos dependen de la fecha de hoy
  return <PendientesVista pendientes={pendientesDemo(new Date())} base={BASE_DEMO} />;
}
