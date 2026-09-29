import { createClient } from "@/lib/supabase/server";
import { claveMes, desplazarMes, formatearImporte, mesActual, nombreMes, parseMes, rangoMes } from "@/lib/dates";
import { totalImportes } from "@/lib/resumen";
import { comparativaCategorias, ritmoDelMes, topComercios } from "@/lib/estadisticas";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { BarraInferior } from "../BarraInferior";
import { CabeceraLibreta } from "../CabeceraLibreta";
import { IconoCategoria } from "../Iconos";
import { SelectorMes } from "../SelectorMes";

type Params = Promise<{ mes?: string }>;

export default async function EstadisticasPage({ searchParams }: { searchParams: Params }) {
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
  const movimientos = (delMes.data ?? []) as unknown as Movimiento[];
  const previos = (delAnterior.data ?? []) as unknown as Movimiento[];
  const total = totalImportes(movimientos);
  const ritmo = ritmoDelMes(total, mes, ahora);
  const comercios = topComercios(movimientos);
  const comparativa = comparativaCategorias(movimientos, previos);
  const sinGastos = total === 0;

  return (
    <>
      <main className="page con-barra">
        <CabeceraLibreta>
          <SelectorMes mes={mes} esActual={esActual} ruta="/estadisticas" />
          <h1 className="titulo-grande">Estadísticas</h1>
        </CabeceraLibreta>

        {error && <p className="error">No se pudieron cargar los datos: {error.message}</p>}

        {sinGastos ? (
          <p className="vacio">Aún no hay gastos en {nombreMes(mes, false)}. Las estadísticas aparecerán con el primero.</p>
        ) : (
          <>
            <section className="bloque" aria-labelledby="ritmo">
              <h2 id="ritmo">Ritmo del mes</h2>
              <div className="tarjeta cifras">
                <div>
                  <p className="cifra">{formatearImporte(ritmo.mediaDiaria)}</p>
                  <p className="subtitulo">de media al día</p>
                </div>
                <div>
                  <p className="cifra">
                    {esActual ? `Día ${ritmo.diasContados}` : `${ritmo.diasDelMes} días`}
                  </p>
                  <p className="subtitulo">{esActual ? `de ${ritmo.diasDelMes}` : "en el mes"}</p>
                </div>
              </div>
              {ritmo.prevision !== null && (
                <p className="prevision">
                  Si sigues así, cerrarás el mes en unos <strong>{formatearImporte(Math.round(ritmo.prevision))}</strong>.
                </p>
              )}
            </section>

            <section className="bloque" aria-labelledby="comercios">
              <h2 id="comercios">Dónde más gastas</h2>
              <ol className="tarjeta lista-simple">
                {comercios.map((c) => (
                  <li key={c.nombre}>
                    <span className="lista-nombre">
                      {c.nombre}
                      <span className="subtitulo">
                        {c.compras} {c.compras === 1 ? "compra" : "compras"}
                      </span>
                    </span>
                    <span className="fila-importe">{formatearImporte(c.total)}</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {comparativa.length > 0 && (
          <section className="bloque" aria-labelledby="comparativa">
            <h2 id="comparativa">Categorías frente a {nombreMes(anterior, false)}</h2>
            <ul className="tarjeta lista-simple">
              {comparativa.map((l) => (
                <li key={l.id ?? "sin"}>
                  <IconoCategoria nombre={l.id ? l.nombre : null} tamaño={32} />
                  <span className="lista-nombre">
                    {l.nombre}
                    <span className="subtitulo">{formatearImporte(l.actual)} este mes</span>
                  </span>
                  <span className={`diferencia${l.diferencia > 0 ? " sube" : l.diferencia < 0 ? " baja" : ""}`}>
                    {l.diferencia === 0
                      ? "igual"
                      : `${l.diferencia > 0 ? "+" : "−"}${formatearImporte(Math.abs(l.diferencia))}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <BarraInferior pendientes={pendientes.count ?? 0} />
    </>
  );
}
