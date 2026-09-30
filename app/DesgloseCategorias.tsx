import Link from "next/link";
import { formatearImporte } from "@/lib/dates";
import type { LineaDesglose } from "@/lib/resumen";
import { IconoCategoria } from "./Iconos";

type Props = { lineas: LineaDesglose[]; claveMes: string; seleccionada: string | undefined };

/** Gasto por categoría. Tocar una fila filtra la lista; tocarla otra vez quita el filtro. */
export function DesgloseCategorias({ lineas, claveMes, seleccionada }: Props) {
  if (lineas.length === 0) return null;

  return (
    <section className="tarjeta desglose" aria-label="Gasto por categoría">
      {lineas.map((l) => {
        const clave = l.id ?? "sin";
        const activa = seleccionada === clave;
        const href = activa ? `/?mes=${claveMes}` : `/?mes=${claveMes}&cat=${clave}`;
        return (
          <Link
            key={clave}
            href={href}
            scroll={false}
            className={`linea-desglose${activa ? " activa" : ""}${seleccionada && !activa ? " atenuada" : ""}`}
            aria-current={activa ? "true" : undefined}
          >
            <IconoCategoria nombre={l.id ? l.nombre : null} tamaño={32} />
            <span className="desglose-info">
              <span className="desglose-fila">
                <span className="desglose-nombre">{l.nombre}</span>
                <span className={`desglose-importe${l.total <= 0 ? " negativo" : ""}`}>{formatearImporte(l.total)}</span>
              </span>
              {l.total > 0 && (
                <span className="barra" aria-hidden>
                  <span style={{ width: `${Math.max(l.pct, 2)}%` }} />
                </span>
              )}
            </span>
            <span className="desglose-pct">{l.total > 0 ? `${l.pct}%` : ""}</span>
          </Link>
        );
      })}
    </section>
  );
}
