import { formatearHora, formatearImporte } from "@/lib/dates";
import { agruparPorDia } from "@/lib/resumen";
import type { Movimiento } from "@/lib/types";
import { FilaMovimiento } from "./FilaMovimiento";

type Props = { movimientos: Movimiento[]; volver: string; vacio?: string };

/** Movimientos agrupados por día, con el subtotal de cada día. */
export function MovimientosLista({ movimientos, volver, vacio = "No hay movimientos." }: Props) {
  if (movimientos.length === 0) return <p className="vacio">{vacio}</p>;

  return (
    <div className="dias">
      {agruparPorDia(movimientos).map((dia) => (
        <section key={dia.clave} aria-label={dia.etiqueta}>
          <h3 className="cabecera-dia">
            <span>{dia.etiqueta}</span>
            <span>{dia.total > 0 ? formatearImporte(dia.total) : ""}</span>
          </h3>
          <ul className="tarjeta lista">
            {dia.movimientos.map((m) => (
              <FilaMovimiento
                key={m.id}
                id={m.id}
                comercio={m.comercio}
                categoria={m.categories?.nombre ?? null}
                importe={m.importe}
                moneda={m.moneda}
                origen={m.origen}
                revisado={m.revisado}
                hora={formatearHora(m.fecha)}
                volver={volver}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
