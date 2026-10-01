import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatearFecha, utcAHoraLocal } from "@/lib/dates";
import { rutaSegura } from "@/lib/rutas";
import { leerReparto, quitarNotaReparto } from "@/lib/reparto";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { MovimientoForm } from "../MovimientoForm";
import { BorrarBoton } from "./BorrarBoton";

export default async function EditarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  const { id } = await params;
  const volver = rutaSegura((await searchParams).volver);
  const supabase = await createClient();

  const [{ data }, { data: categorias }] = await Promise.all([
    supabase.from("transactions").select(COLUMNAS_MOVIMIENTO).eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, nombre").order("nombre"),
  ]);
  if (!data) notFound();
  const m = data as unknown as Movimiento;
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
        categorias={categorias ?? []}
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
      />

      <BorrarBoton id={m.id} volver={volver} />
    </main>
  );
}
