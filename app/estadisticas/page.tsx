import { createClient } from "@/lib/supabase/server";
import { claveMes, desplazarMes, formatearImporte, mesActual, nombreMes, parseMes, rangoMes } from "@/lib/dates";
import { totalImportes } from "@/lib/resumen";
import { comparativaCategorias, gastoPorDia, ritmoDelMes, topComercios } from "@/lib/estadisticas";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { BarraInferior } from "../BarraInferior";
import { CabeceraLibreta } from "../CabeceraLibreta";
import { IconoCategoria, Insignia } from "../Iconos";
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
  const dias = gastoPorDia(movimientos, mes, ahora);
  const comercios = topComercios(movimientos);
  const comparativa = comparativaCategorias(movimientos, previos);
  const sinGastos = total <= 0;
  const mesCorto = nombreMes(mes, false).slice(0, 3);

  return (
    <>
      <main className="page con-barra">
        <CabeceraLibreta>
          <SelectorMes mes={mes} esActual={esActual} ruta="/estadisticas" />
          <h1 className="titulo-grande">Estadísticas</h1>
        </CabeceraLibreta>

        {error && <p className="error">No se pudieron cargar los datos: {error.message}</p>}

        {sinGastos ? (
          <p className="vacio">
            {total < 0
              ? `En ${nombreMes(mes, false)} te han devuelto más de lo que has gastado.`
              : `Aún no hay gastos en ${nombreMes(mes, false)}. El ritmo y los comercios aparecerán con el primero.`}
          </p>
        ) : (
          <>
            <section className="tarjeta bloque" aria-labelledby="ritmo">
              <div className="bloque-cabecera">
                <h2 id="ritmo">Ritmo del mes</h2>
                <span className="subtitulo">
                  {esActual ? `Día ${ritmo.diasContados} de ${ritmo.diasDelMes}` : `${ritmo.diasDelMes} días`}
                </span>
              </div>
              <p className="media-diaria">
                <span className="cifra">{formatearImporte(ritmo.mediaDiaria)}</span>
                <span className="subtitulo">de media al día</span>
              </p>
              <GraficoDias dias={dias} media={ritmo.mediaDiaria} />
              <p className="eje-dias" aria-hidden>
                <span>1 {mesCorto}</span>
                <span>
                  {ritmo.diasDelMes} {mesCorto}
                </span>
              </p>
              {ritmo.prevision !== null && (
                <p className="prevision">
                  Si sigues así, cerrarás el mes en unos <strong>{formatearImporte(Math.round(ritmo.prevision))}</strong>.
                </p>
              )}
            </section>

            <section className="tarjeta bloque" aria-labelledby="comercios">
              <h2 id="comercios">Dónde más gastas</h2>
              <ol className="lista-simple">
                {comercios.map((c, i) => (
                  <li key={c.nombre}>
                    <span className="puesto">{i + 1}</span>
                    <span className="lista-nombre">
                      <span className="lista-fila">
                        <span className="lista-texto">
                          {c.nombre}{" "}
                          <span className="subtitulo">
                            · {c.compras} {c.compras === 1 ? "compra" : "compras"}
                          </span>
                        </span>
                        <span className="fila-importe">{formatearImporte(c.total)}</span>
                      </span>
                      <span className="barra" aria-hidden>
                        <span style={{ width: `${Math.max((c.total / comercios[0].total) * 100, 2)}%` }} />
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {comparativa.length > 0 && (
          <section className="tarjeta bloque" aria-labelledby="comparativa">
            <h2 id="comparativa">Frente a {nombreMes(anterior, false)}</h2>
            <ul className="lista-simple">
              {comparativa.map((l) => (
                <li key={l.id ?? "sin"}>
                  <IconoCategoria nombre={l.id ? l.nombre : null} tamaño={34} />
                  <span className="lista-nombre">
                    {l.nombre}
                    <span className="subtitulo">{formatearImporte(l.actual)} este mes</span>
                  </span>
                  <Insignia diferencia={l.diferencia}>
                    {l.diferencia === 0 ? "igual" : formatearImporte(Math.abs(l.diferencia))}
                  </Insignia>
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

/** Barras con el gasto de cada día; la línea discontinua es la media. Los días por llegar quedan en gris. */
function GraficoDias({ dias, media }: { dias: (number | null)[]; media: number }) {
  const maximo = Math.max(...dias.map((d) => d ?? 0), media, 1);
  const hoy = dias.findLastIndex((d) => d !== null);
  return (
    <div className="grafico-dias" aria-hidden>
      <span className="linea-media" style={{ bottom: `${(media / maximo) * 100}%` }} />
      {dias.map((d, i) => (
        <span
          key={i}
          className={d === null ? "futuro" : i === hoy && dias.at(-1) === null ? "hoy" : undefined}
          style={d === null ? undefined : { height: `${Math.max((Math.max(d, 0) / maximo) * 100, 2)}%` }}
        />
      ))}
    </div>
  );
}
