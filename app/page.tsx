import { createClient } from "@/lib/supabase/server";
import { generarFijos } from "@/lib/generar-fijos";
import { desplazarMes, parseMes, rangoMes } from "@/lib/dates";
import { totalImportes } from "@/lib/resumen";
import { resumenFijos } from "@/lib/fijos";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { InicioVista } from "./vistas/InicioVista";

type Params = Promise<{ mes?: string; cat?: string }>;

export default async function Home({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const ahora = new Date();
  const mes = parseMes(sp.mes, ahora);
  const rango = rangoMes(mes);
  const rangoAnterior = rangoMes(desplazarMes(mes, -1));

  const supabase = await createClient();
  await generarFijos(supabase, ahora);
  const [delMes, delAnterior, pendientes, fijos] = await Promise.all([
    supabase
      .from("transactions")
      .select(COLUMNAS_MOVIMIENTO)
      .gte("fecha", rango.desde.toISOString())
      .lt("fecha", rango.hasta.toISOString())
      .order("fecha", { ascending: false })
      .limit(2000),
    supabase
      .from("transactions")
      .select("importe, tipo")
      .gte("fecha", rangoAnterior.desde.toISOString())
      .lt("fecha", rangoAnterior.hasta.toISOString())
      .not("importe", "is", null),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("revisado", false),
    supabase.from("gastos_fijos").select("importe, activo"),
  ]);

  const error = delMes.error ?? delAnterior.error ?? pendientes.error ?? fijos.error;

  return (
    <InicioVista
      mes={mes}
      ahora={ahora}
      movimientos={(delMes.data ?? []) as unknown as Movimiento[]}
      totalAnterior={totalImportes(delAnterior.data ?? [])}
      pendientes={pendientes.count ?? 0}
      fijos={resumenFijos(fijos.data ?? [])}
      cat={sp.cat}
      error={error?.message}
    />
  );
}
