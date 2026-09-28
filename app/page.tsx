import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rangoMesActual, formatearImporte } from "@/lib/dates";
import { COLUMNAS_MOVIMIENTO, type Movimiento } from "@/lib/types";
import { cerrarSesion } from "@/app/actions";
import { MovimientosLista } from "./MovimientosLista";

export default async function Home() {
  const supabase = await createClient();
  const { desde, hasta, nombre } = rangoMesActual();

  const [mes, recientes, pendientes] = await Promise.all([
    supabase
      .from("transactions")
      .select("importe")
      .gte("fecha", desde.toISOString())
      .lt("fecha", hasta.toISOString())
      .not("importe", "is", null),
    supabase.from("transactions").select(COLUMNAS_MOVIMIENTO).order("fecha", { ascending: false }).limit(100),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("revisado", false),
  ]);

  const error = mes.error ?? recientes.error ?? pendientes.error;
  const total = (mes.data ?? []).reduce((s, t) => s + Number(t.importe), 0);
  const numPendientes = pendientes.count ?? 0;

  return (
    <main className="page">
      <header className="cabecera">
        <div>
          <p className="muted etiqueta-mes">Gastado en {nombre}</p>
          <p className="total">{formatearImporte(Math.round(total * 100) / 100)}</p>
        </div>
        <form action={cerrarSesion}>
          <button className="link">Salir</button>
        </form>
      </header>

      {numPendientes > 0 && (
        <Link href="/pendientes" className="aviso">
          {numPendientes} pendiente{numPendientes === 1 ? "" : "s"} de revisar →
        </Link>
      )}

      {error && <p className="error">Error cargando datos: {error.message}</p>}

      <h2>Movimientos</h2>
      <MovimientosLista movimientos={(recientes.data ?? []) as unknown as Movimiento[]} volver="/" />

      <Link href="/movimiento/nuevo" className="fab" aria-label="Añadir gasto">
        +
      </Link>
    </main>
  );
}
