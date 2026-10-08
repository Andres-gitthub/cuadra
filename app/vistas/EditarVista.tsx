import Link from "next/link";
import { formatearFecha, utcAHoraLocal } from "@/lib/dates";
import { leerReparto, quitarNotaReparto } from "@/lib/reparto";
import type { Categoria, Movimiento } from "@/lib/types";
import { MovimientoForm } from "../movimiento/MovimientoForm";
import { BorrarBoton } from "../movimiento/[id]/BorrarBoton";

export type DatosEditar = {
  movimiento: Movimiento;
  categorias: Categoria[];
  /** Adónde vuelve al cancelar o guardar (ya validado). */
  volver: string;
  /** En la demo, guardar y borrar solo avisan. */
  demo?: boolean;
};

/** Pantalla de editar o revisar un movimiento ya leído: no consulta nada. */
export function EditarVista({ movimiento: m, categorias, volver, demo }: DatosEditar) {
  // Un gasto repartido se edita desde el total pagado y las personas, para no dividirlo dos veces.
  const reparto = leerReparto(m.texto_original);
  const textoOriginal = quitarNotaReparto(m.texto_original);
  const importeInicial = reparto ? reparto.total : m.importe;

  return (
    <main className="page">
      <nav className="barra-superior">
        <Link href={volver} className="volver">
          ‹ Volver
        </Link>
        <span className="titulo-barra">{m.revisado ? "Editar" : "Revisar"}</span>
        <span />
      </nav>

      {textoOriginal && (
        <blockquote className="texto-original">
          <span className="etiqueta">Texto original</span>
          {textoOriginal}
        </blockquote>
      )}

      <MovimientoForm
        categorias={categorias}
        volver={volver}
        etiquetaFecha={formatearFecha(m.fecha)}
        inicial={{
          id: m.id,
          tipo: m.tipo,
          importe: importeInicial === null ? "" : String(importeInicial).replace(".", ","),
          personas: reparto?.personas ?? 1,
          comercio: m.comercio ?? "",
          categoria_id: m.categoria_id ?? "",
          fecha: utcAHoraLocal(new Date(m.fecha)),
          // Al abrir un pendiente, guardar lo marca como revisado salvo que se desactive.
          revisado: true,
        }}
        demo={demo}
      />

      <BorrarBoton id={m.id} volver={volver} demo={demo} />
    </main>
  );
}
