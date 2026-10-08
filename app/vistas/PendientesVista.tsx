import Link from "next/link";
import { formatearFecha, formatearImporte } from "@/lib/dates";
import { conBase } from "@/lib/rutas";
import type { Movimiento } from "@/lib/types";
import { BarraInferior } from "../BarraInferior";
import { CabeceraLibreta } from "../CabeceraLibreta";
import { IconoOrigen } from "../Iconos";
import { BorrarBoton } from "../movimiento/[id]/BorrarBoton";

export type DatosPendientes = {
  /** Movimientos sin revisar, del más reciente al más antiguo. */
  pendientes: Movimiento[];
  error?: string | null;
  /** "" en la app, "/demo" en la demo (donde descartar solo avisa). */
  base?: string;
};

/** Pantalla de Pendientes a partir de los datos ya leídos: no consulta nada. */
export function PendientesVista({ pendientes, error, base = "" }: DatosPendientes) {
  const volver = conBase(base, "/pendientes");
  return (
    <>
      <main className="page con-barra">
        <CabeceraLibreta>
          <h1 className="titulo-grande">Pendientes</h1>
          <p className="subtitulo">Gastos que no se pudieron leer con seguridad. Revísalos o descártalos.</p>
        </CabeceraLibreta>
        {error && <p className="error">Error cargando datos: {error}</p>}

        {pendientes.length === 0 && !error ? (
          <div className="vacio vacio-grande">
            <span className="check" aria-hidden>
              ✓
            </span>
            No tienes nada pendiente de revisar.
          </div>
        ) : (
          <ul className="pendientes">
            {pendientes.map((m) => (
              <li key={m.id} className="tarjeta pendiente">
                <div className="pendiente-cabecera">
                  <span className="fila-detalle">
                    <IconoOrigen origen={m.origen} />
                    {formatearFecha(m.fecha)}
                  </span>
                  <span className={`fila-importe${m.importe === null ? " sin-importe" : ""}`}>
                    {m.importe === null ? "Sin importe" : formatearImporte(m.importe, m.moneda)}
                  </span>
                </div>
                <p className="pendiente-comercio">{m.comercio ?? <em>Sin comercio</em>}</p>
                {m.texto_original && <blockquote className="texto-original">{m.texto_original}</blockquote>}
                <div className="pendiente-acciones">
                  <BorrarBoton
                    id={m.id}
                    volver={volver}
                    texto="Descartar"
                    className="btn btn-secundario"
                    demo={Boolean(base)}
                  />
                  <Link href={`${conBase(base, `/movimiento/${m.id}`)}?volver=${volver}`} className="btn">
                    Revisar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BarraInferior pendientes={pendientes.length} base={base} />
    </>
  );
}
