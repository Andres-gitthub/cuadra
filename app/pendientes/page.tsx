import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { MovimientosLista } from "../MovimientosLista";

export default async function PendientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(COLUMNAS_MOVIMIENTO)
    .eq("revisado", false)
    .order("fecha", { ascending: false });

  return (
    <main className="page">
      <Link href="/" className="volver">
        ← Inicio
      </Link>
      <h1>Pendientes de revisar</h1>
      <p className="muted">Movimientos que no se pudieron leer con seguridad. Ábrelos, corrígelos y márcalos como revisados.</p>
      {error && <p className="error">Error cargando datos: {error.message}</p>}
      <MovimientosLista movimientos={(data ?? []) as unknown as Movimiento[]} volver="/pendientes" />
    </main>
  );
}
