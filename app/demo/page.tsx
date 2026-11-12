import { connection } from "next/server";
import { desplazarMes, parseMes } from "@/lib/dates";
import { GASTOS_FIJOS_DEMO, movimientosDemo, pendientesDemo } from "@/lib/demo";
import { resumenFijos } from "@/lib/fijos";
import { totalImportes } from "@/lib/resumen";
import { BASE_DEMO } from "@/lib/rutas";
import { InicioVista } from "../vistas/InicioVista";

type Params = Promise<{ mes?: string; cat?: string }>;

export default async function DemoInicio({ searchParams }: { searchParams: Params }) {
  await connection(); // los datos dependen de la fecha de hoy
  const sp = await searchParams;
  const ahora = new Date();
  const mes = parseMes(sp.mes, ahora);

  return (
    <InicioVista
      mes={mes}
      ahora={ahora}
      movimientos={movimientosDemo(mes, ahora)}
      totalAnterior={totalImportes(movimientosDemo(desplazarMes(mes, -1), ahora))}
      pendientes={pendientesDemo(ahora).length}
      fijos={resumenFijos(GASTOS_FIJOS_DEMO)}
      cat={sp.cat}
      base={BASE_DEMO}
    />
  );
}
