import Link from "next/link";
import { utcAHoraLocal } from "@/lib/dates";
import { conBase } from "@/lib/rutas";
import type { Categoria } from "@/lib/types";
import { MovimientoForm } from "../movimiento/MovimientoForm";

export type DatosNuevo = {
  categorias: Categoria[];
  ahora: Date;
  /** "" en la app, "/demo" en la demo (donde guardar solo avisa). */
  base?: string;
};

/** Pantalla de nuevo gasto a partir de las categorías ya leídas: no consulta nada. */
export function NuevoVista({ categorias, ahora, base = "" }: DatosNuevo) {
  const inicio = conBase(base, "/");
  return (
    <main className="page">
      <nav className="barra-superior">
        <Link href={inicio} className="volver">
          Cancelar
        </Link>
        <span className="titulo-barra">Nuevo gasto</span>
        <span />
      </nav>
      <MovimientoForm
        categorias={categorias}
        volver={inicio}
        etiquetaFecha="Ahora"
        inicial={{ importe: "", comercio: "", categoria_id: "auto", fecha: utcAHoraLocal(ahora) }}
        demo={Boolean(base)}
      />
    </main>
  );
}
