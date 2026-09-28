import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { utcAHoraLocal } from "@/lib/dates";
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
  const volver = (await searchParams).volver === "/pendientes" ? "/pendientes" : "/";
  const supabase = await createClient();

  const [{ data }, { data: categorias }] = await Promise.all([
    supabase.from("transactions").select(COLUMNAS_MOVIMIENTO).eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, nombre").order("nombre"),
  ]);
  if (!data) notFound();
  const m = data as unknown as Movimiento;

  return (
    <main className="page">
      <Link href={volver} className="volver">
        ← Volver
      </Link>
      <h1>Editar movimiento</h1>

      {m.texto_original && (
        <div className="original">
          <p className="muted pequeño">Texto original ({m.origen})</p>
          <p>{m.texto_original}</p>
        </div>
      )}

      <MovimientoForm
        categorias={categorias ?? []}
        volver={volver}
        inicial={{
          id: m.id,
          importe: m.importe === null ? "" : String(m.importe).replace(".", ","),
          comercio: m.comercio ?? "",
          categoria_id: m.categoria_id ?? "",
          fecha: utcAHoraLocal(new Date(m.fecha)),
          // Al abrir un pendiente, guardar lo marca como revisado salvo que se desmarque.
          revisado: true,
        }}
      />

      <BorrarBoton id={m.id} volver={volver} />
    </main>
  );
}
