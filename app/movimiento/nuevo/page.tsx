import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { utcAHoraLocal } from "@/lib/dates";
import { MovimientoForm } from "../MovimientoForm";

export default async function NuevoPage() {
  const supabase = await createClient();
  const { data: categorias } = await supabase.from("categories").select("id, nombre").order("nombre");

  return (
    <main className="page">
      <nav className="barra-superior">
        <Link href="/" className="volver">
          Cancelar
        </Link>
        <span className="titulo-barra">Nuevo gasto</span>
        <span />
      </nav>
      <MovimientoForm
        categorias={categorias ?? []}
        volver="/"
        etiquetaFecha="Ahora"
        inicial={{ importe: "", comercio: "", categoria_id: "auto", fecha: utcAHoraLocal(new Date()) }}
      />
    </main>
  );
}
