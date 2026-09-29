import { createClient } from "@/lib/supabase/server";
import { claveMes, desplazarMes, formatearImporte, mesActual, nombreMes, parseMes, rangoMes } from "@/lib/dates";
import { desglosePorCategoria, totalImportes } from "@/lib/resumen";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { SelectorMes } from "./SelectorMes";
import { DesgloseCategorias } from "./DesgloseCategorias";
import { MovimientosLista } from "./MovimientosLista";
import { BarraInferior } from "./BarraInferior";
import { CabeceraLibreta } from "./CabeceraLibreta";
import { CerrarSesion } from "./CerrarSesion";

type Params = Promise<{ mes?: string; cat?: string }>;

export default async function Home({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const ahora = new Date();
  const mes = parseMes(sp.mes, ahora);
  const anterior = desplazarMes(mes, -1);
  const esActual = claveMes(mes) === claveMes(mesActual(ahora));
  const rango = rangoMes(mes);
  const rangoAnterior = rangoMes(anterior);

  const supabase = await createClient();
  const [delMes, delAnterior, pendientes] = await Promise.all([
    supabase
      .from("transactions")
      .select(COLUMNAS_MOVIMIENTO)
      .gte("fecha", rango.desde.toISOString())
      .lt("fecha", rango.hasta.toISOString())
      .order("fecha", { ascending: false })
      .limit(2000),
    supabase
      .from("transactions")
      .select("importe")
      .gte("fecha", rangoAnterior.desde.toISOString())
      .lt("fecha", rangoAnterior.hasta.toISOString())
      .not("importe", "is", null),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("revisado", false),
  ]);

  const error = delMes.error ?? delAnterior.error ?? pendientes.error;
  const movimientos = (delMes.data ?? []) as unknown as Movimiento[];
  const total = totalImportes(movimientos);
  const totalAnterior = totalImportes(delAnterior.data ?? []);
  const desglose = desglosePorCategoria(movimientos);

  const cat = sp.cat;
  const filtrados = cat
    ? movimientos.filter((m) => (cat === "sin" ? m.categoria_id === null : m.categoria_id === cat))
    : movimientos;
  const volver = `/?mes=${claveMes(mes)}${cat ? `&cat=${cat}` : ""}`;

  return (
    <>
      <main className="page con-barra">
        <CabeceraLibreta>
          <SelectorMes mes={mes} esActual={esActual} />
          <p className="total">{formatearImporte(total)}</p>
          <p className="subtitulo">{lineaResumen(movimientos.length, total, totalAnterior, nombreMes(anterior, false))}</p>
        </CabeceraLibreta>

        {error && <p className="error">Error cargando datos: {error.message}</p>}

        <DesgloseCategorias lineas={desglose} claveMes={claveMes(mes)} seleccionada={cat} />

        <MovimientosLista
          movimientos={filtrados}
          volver={volver}
          vacio={cat ? "No hay movimientos de esta categoría este mes." : "Aún no hay movimientos este mes."}
        />
        <CerrarSesion />
      </main>
      <BarraInferior pendientes={pendientes.count ?? 0} />
    </>
  );
}

function lineaResumen(n: number, total: number, totalAnterior: number, mesAnterior: string): string {
  const cuantos = `${n} ${n === 1 ? "gasto" : "gastos"}`;
  if (totalAnterior <= 0) return cuantos;
  const diferencia = Math.round((total - totalAnterior) * 100) / 100;
  if (diferencia === 0) return `${cuantos}, igual que en ${mesAnterior}`;
  const cuanto = formatearImporte(Math.abs(diferencia));
  return `${cuantos}, ${cuanto} ${diferencia < 0 ? "menos" : "más"} que en ${mesAnterior}`;
}
