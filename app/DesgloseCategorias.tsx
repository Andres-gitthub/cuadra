import Link from "next/link";
import { formatearImporteRedondo } from "@/lib/dates";
import { estiloCategoria } from "@/lib/categorias-ui";
import type { LineaDesglose } from "@/lib/resumen";
import { conBase } from "@/lib/rutas";

type Props = { lineas: LineaDesglose[]; claveMes: string; seleccionada: string | undefined; base?: string };

/** Gasto por categoría: barra apilada y leyenda. Tocar una categoría filtra la lista; tocarla otra vez quita el filtro. */
export function DesgloseCategorias({ lineas, claveMes, seleccionada, base = "" }: Props) {
  if (lineas.length === 0) return null;
  const color = (l: LineaDesglose) => estiloCategoria(l.id ? l.nombre : null).color;

  return (
    <section className="tarjeta desglose" aria-labelledby="desglose-titulo">
      <div className="desglose-cabecera">
        <h2 id="desglose-titulo">Por categoría</h2>
        <span className="subtitulo">{seleccionada ? "Toca otra vez para ver todo" : "Toca una para filtrar"}</span>
      </div>
      {lineas.some((l) => l.total > 0) && (
        <div className="barra-apilada" aria-hidden>
          {lineas
            .filter((l) => l.total > 0)
            .map((l) => (
              <span
                key={l.id ?? "sin"}
                className={seleccionada && seleccionada !== (l.id ?? "sin") ? "atenuada" : undefined}
                style={{ flexGrow: l.total, background: color(l) }}
              />
            ))}
        </div>
      )}
      <div className="leyenda">
        {lineas.map((l) => {
          const clave = l.id ?? "sin";
          const activa = seleccionada === clave;
          const inicio = `${conBase(base, "/")}?mes=${claveMes}`;
          const href = activa ? inicio : `${inicio}&cat=${clave}`;
          return (
            <Link
              key={clave}
              href={href}
              scroll={false}
              className={`leyenda-item${activa ? " activa" : ""}${seleccionada && !activa ? " atenuada" : ""}`}
              aria-current={activa ? "true" : undefined}
              aria-label={`${l.nombre}: ${formatearImporteRedondo(l.total)}${l.total > 0 ? `, ${l.pct} %` : ""}`}
            >
              <span className="muestra" style={{ background: color(l) }} />
              <span className="leyenda-nombre">{l.nombre}</span>
              <span className={`leyenda-importe${l.total <= 0 ? " negativo" : ""}`}>{formatearImporteRedondo(l.total)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
