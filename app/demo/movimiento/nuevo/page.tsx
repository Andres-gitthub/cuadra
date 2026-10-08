import { connection } from "next/server";
import { CATEGORIAS_DEMO } from "@/lib/demo";
import { BASE_DEMO } from "@/lib/rutas";
import { NuevoVista } from "../../../vistas/NuevoVista";

export default async function DemoNuevo() {
  await connection(); // la fecha inicial es la de ahora
  return <NuevoVista categorias={CATEGORIAS_DEMO} ahora={new Date()} base={BASE_DEMO} />;
}
