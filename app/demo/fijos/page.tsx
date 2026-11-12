import { GASTOS_FIJOS_DEMO } from "@/lib/demo";
import { BASE_DEMO } from "@/lib/rutas";
import { FijosVista } from "../../vistas/FijosVista";

export default function DemoFijos() {
  return <FijosVista fijos={GASTOS_FIJOS_DEMO} base={BASE_DEMO} />;
}
