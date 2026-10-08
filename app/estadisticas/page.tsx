import { createClient } from "@/lib/supabase/server";
import { desplazarMes, parseMes, rangoMes } from "@/lib/dates";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { EstadisticasVista } from "../vistas/EstadisticasVista";

type Params = Promise<{ mes?: string }>;

export default async function EstadisticasPage({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const ahora = new Date();
  const mes = parseMes(sp.mes, ahora);
  const rango = rangoMes(mes);
  const rangoAnterior = rangoMes(desplazarMes(mes, -1));

  const supabase = await createClient();
  const [delMes, delAnterior, pendientes] = await Promise.all([
    supabase
      .from("transactions")
      .select(COLUMNAS_MOVIMIENTO)
      .gte("fecha", rango.desde.toISOString())
      .lt("fecha", rango.hasta.toISOString())
      .limit(2000),
    supabase
      .from("transactions")
      .select(COLUMNAS_MOVIMIENTO)
      .gte("fecha", rangoAnterior.desde.toISOString())
      .lt("fecha", rangoAnterior.hasta.toISOString())
      .limit(2000),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("revisado", false),
  ]);

  const error = delMes.error ?? delAnterior.error ?? pendientes.error;

  return (
    <EstadisticasVista
      mes={mes}
      ahora={ahora}
      movimientos={(delMes.data ?? []) as unknown as Movimiento[]}
      previos={(delAnterior.data ?? []) as unknown as Movimiento[]}
      pendientes={pendientes.count ?? 0}
      error={error?.message}
    />
  );
}
