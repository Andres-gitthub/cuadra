import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { utcAHoraLocal } from "@/lib/dates";
import { MovimientoForm } from "../MovimientoForm";

export default async function NuevoPage() {
  const supabase = await createClient();
  const { data: categorias } = await supabase.from("categories").select("id, nombre").order("nombre");

  return (
    <main className="page">
      <Link href="/" className="volver">
        ← Cancelar
      </Link>
      <h1>Nuevo gasto</h1>
      <MovimientoForm
        categorias={categorias ?? []}
        volver="/"
        inicial={{ importe: "", comercio: "", categoria_id: "auto", fecha: utcAHoraLocal(new Date()) }}
      />
    </main>
  );
}
