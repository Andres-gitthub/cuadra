import Link from "next/link";
import { formatearImporte } from "@/lib/dates";
import { ordenarFijos, resumenFijos } from "@/lib/fijos";
import { conBase } from "@/lib/rutas";
import type { GastoFijo } from "@/lib/types";
import { CabeceraLibreta } from "../CabeceraLibreta";
import { IconoCategoria } from "../Iconos";

export type DatosFijos = { fijos: GastoFijo[]; error?: string; base?: string };

/** Lista de gastos fijos ya leídos: no consulta nada. */
export function FijosVista({ fijos, error, base = "" }: DatosFijos) {
  const { alMes } = resumenFijos(fijos);
  return (
    <main className="page">
      <nav className="barra-superior">
        <Link href={conBase(base, "/")} className="volver">
          ‹ Inicio
        </Link>
        <span className="titulo-barra">Gastos fijos</span>
        <span />
      </nav>

      <CabeceraLibreta>
        <p className="etiqueta-total">Cada mes</p>
        <p className="total">
          <span className="subrayado">{formatearImporte(alMes)}</span>
        </p>
      </CabeceraLibreta>

      {error && <p className="error">Error cargando datos: {error}</p>}

      {fijos.length === 0 ? (
        <p className="vacio">
          Aún no hay gastos fijos. Se crean desde <Link href={conBase(base, "/movimiento/nuevo")}>Añadir</Link>, con
          «Repetir cada mes».
        </p>
      ) : (
        <ul className="tarjeta lista lista-fijos">
          {ordenarFijos(fijos).map((f) => (
            <li key={f.id} className={f.activo ? undefined : "pausado"}>
              <Link href={conBase(base, `/fijos/${f.id}`)} className="fila">
                <IconoCategoria nombre={f.categories?.nombre} />
                <span className="fila-info">
                  <span className="fila-comercio">{f.comercio}</span>
                  <span className="fila-detalle">
                    Día {f.dia} · {f.categories?.nombre ?? "Sin categoría"}
                    {f.activo ? "" : " · En pausa"}
                  </span>
                </span>
                <span className="fila-importe">{formatearImporte(Number(f.importe))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
