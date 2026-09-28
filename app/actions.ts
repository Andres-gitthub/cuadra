"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/amount";
import { limpiarComercio } from "@/lib/sms-parser";
import { categorize } from "@/lib/categorize";
import { horaLocalAUtc } from "@/lib/dates";
import type { EstadoFormulario } from "@/lib/types";

// ---------- Login (magic link + código de 6 dígitos) ----------

export type EstadoLogin = { error: string | null; email: string | null };

export async function enviarCodigo(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Email no válido", email: null };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Solo el usuario creado a mano en Supabase puede entrar: nadie más puede registrarse.
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) {
    console.error("[login]", error.message);
    return { error: "No se pudo enviar el email. ¿Es el email correcto?", email: null };
  }
  return { error: null, email };
}

export async function verificarCodigo(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(token)) return { error: "El código son los dígitos del email", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: "Código incorrecto o caducado", email };
  redirect("/");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- Movimientos ----------

export async function guardarMovimientoManual(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const { supabase } = await requireUser();

  const id = String(formData.get("id") ?? "");
  const volver = String(formData.get("volver") ?? "/") === "/pendientes" ? "/pendientes" : "/";
  const importe = parseAmount(String(formData.get("importe") ?? ""));
  const comercio = limpiarComercio(String(formData.get("comercio") ?? ""));
  const fecha = horaLocalAUtc(String(formData.get("fecha") ?? ""));
  let categoria_id: string | null = String(formData.get("categoria_id") ?? "") || null;

  if (importe === null) return { error: "Importe no válido (ej.: 12,50)" };
  if (!fecha) return { error: "Fecha no válida" };

  if (categoria_id === "auto") {
    const { data: cats } = await supabase.from("categories").select("id, palabras_clave");
    categoria_id = categorize(comercio, cats ?? []);
  }

  const campos = { importe, comercio, fecha: fecha.toISOString(), categoria_id };

  if (id) {
    const revisado = formData.get("revisado") === "on";
    const { error } = await supabase.from("transactions").update({ ...campos, revisado }).eq("id", id);
    if (error) return { error: `No se pudo guardar: ${error.message}` };
  } else {
    const { error } = await supabase
      .from("transactions")
      .insert({ ...campos, moneda: "EUR", origen: "manual", revisado: true });
    if (error) return { error: `No se pudo guardar: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/pendientes");
  redirect(volver);
}

export async function borrarMovimiento(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const volver = String(formData.get("volver") ?? "/") === "/pendientes" ? "/pendientes" : "/";
  if (id) await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/pendientes");
  redirect(volver);
}
