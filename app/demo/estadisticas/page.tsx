import { connection } from "next/server";
import { desplazarMes, parseMes } from "@/lib/dates";
import { movimientosDemo, pendientesDemo } from "@/lib/demo";
import { BASE_DEMO } from "@/lib/rutas";
import { EstadisticasVista } from "../../vistas/EstadisticasVista";

type Params = Promise<{ mes?: string }>;

export default async function DemoEstadisticas({ searchParams }: { searchParams: Params }) {
  await connection(); // los datos dependen de la fecha de hoy
  const ahora = new Date();
  const mes = parseMes((await searchParams).mes, ahora);

  return (
    <EstadisticasVista
      mes={mes}
      ahora={ahora}
      movimientos={movimientosDemo(mes, ahora)}
      previos={movimientosDemo(desplazarMes(mes, -1), ahora)}
      pendientes={pendientesDemo(ahora).length}
      base={BASE_DEMO}
    />
  );
}
