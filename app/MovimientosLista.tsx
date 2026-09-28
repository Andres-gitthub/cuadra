import Link from "next/link";
import { formatearFecha, formatearImporte } from "@/lib/dates";
import type { Movimiento } from "@/lib/types";

const ETIQUETA_ORIGEN = { manual: "Manual", wallet: "Wallet", sms: "SMS" } as const;

export function MovimientosLista({ movimientos, volver }: { movimientos: Movimiento[]; volver: string }) {
  if (movimientos.length === 0) return <p className="muted vacio">No hay movimientos.</p>;

  return (
    <ul className="lista">
      {movimientos.map((m) => (
        <li key={m.id}>
          <Link href={`/movimiento/${m.id}?volver=${encodeURIComponent(volver)}`} className="fila">
            <div className="fila-info">
              <span className="comercio">
                {!m.revisado && <span className="punto" aria-label="Pendiente de revisar" />}
                {m.comercio ?? <em>Sin comercio</em>}
              </span>
              <span className="muted pequeño">
                {formatearFecha(m.fecha)} · {m.categories?.nombre ?? "Sin categoría"} · {ETIQUETA_ORIGEN[m.origen]}
              </span>
            </div>
            <span className="importe">{formatearImporte(m.importe, m.moneda)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
