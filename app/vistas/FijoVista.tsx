import Link from "next/link";
import { conBase } from "@/lib/rutas";
import type { Categoria, GastoFijo } from "@/lib/types";
import { FijoForm } from "../fijos/FijoForm";
import { BorrarFijoBoton } from "../fijos/BorrarFijoBoton";

export type DatosFijo = { fijo: GastoFijo; categorias: Categoria[]; base?: string };

/** Editar un gasto fijo ya leído: no consulta nada. */
export function FijoVista({ fijo, categorias, base = "" }: DatosFijo) {
  const demo = Boolean(base);
  return (
    <main className="page">
      <nav className="barra-superior">
        <Link href={conBase(base, "/fijos")} className="volver">
          ‹ Volver
        </Link>
        <span className="titulo-barra">Gasto fijo</span>
        <span />
      </nav>
      <FijoForm fijo={fijo} categorias={categorias} demo={demo} />
      <BorrarFijoBoton id={fijo.id} demo={demo} />
    </main>
  );
}
