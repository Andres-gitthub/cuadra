import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatearFecha, formatearImporte } from "@/lib/dates";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { BarraInferior } from "../BarraInferior";
import { IconoOrigen } from "../Iconos";
import { BorrarBoton } from "../movimiento/[id]/BorrarBoton";

export default async function PendientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(COLUMNAS_MOVIMIENTO)
    .eq("revisado", false)
    .order("fecha", { ascending: false });
  const pendientes = (data ?? []) as unknown as Movimiento[];

  return (
    <>
      <main className="page con-barra">
        <h1 className="titulo-grande">Pendientes</h1>
        <p className="subtitulo">Movimientos que no se pudieron leer con seguridad.</p>
        {error && <p className="error">Error cargando datos: {error.message}</p>}

        {pendientes.length === 0 && !error ? (
          <div className="vacio vacio-grande">
            <span className="check" aria-hidden>
              ✓
            </span>
            Todo revisado
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
                  <BorrarBoton id={m.id} volver="/pendientes" texto="Descartar" className="btn btn-secundario" />
                  <Link href={`/movimiento/${m.id}?volver=/pendientes`} className="btn">
                    Revisar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BarraInferior pendientes={pendientes.length} />
    </>
  );
}
