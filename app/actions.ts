"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { categorize } from "@/lib/categorize";
import { rutaSegura } from "@/lib/rutas";
import { leerFormularioMovimiento, valoresEnviados } from "@/lib/formulario";
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
    console.error("[login]", error.code, error.status, error.message);
    return { error: mensajeErrorEnvio(error), email: null };
  }
  return { error: null, email };
}

function mensajeErrorEnvio(error: { code?: string; status?: number; message: string }): string {
  const espera = error.message.match(/after (\d+) seconds?/i);
  if (espera) return `Espera ${espera[1]} segundos antes de pedir otro email.`;
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "Se ha alcanzado el límite de emails de Supabase (unos pocos por hora). Espera un rato y vuelve a intentarlo.";
  }
  if (error.code === "otp_disabled" || error.code === "user_not_found" || /signups? not allowed/i.test(error.message)) {
    return "Ese email no tiene acceso. Usa el email de tu usuario de Supabase.";
  }
  return `No se pudo enviar el email (${error.code ?? error.status ?? "error desconocido"}).`;
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
  // Solo este dispositivo: cerrar sesión en el ordenador no debe sacar al iPhone.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

// ---------- Movimientos ----------

export async function guardarMovimientoManual(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const { supabase } = await requireUser();

  const id = String(formData.get("id") ?? "");
  const volver = rutaSegura(formData.get("volver"));
  // Tras un error se devuelve lo enviado: React reinicia el formulario y si no se perdería (p. ej. el tipo).
  const fallo = (error: string): EstadoFormulario => ({ error, valores: valoresEnviados(formData), intento: Date.now() });

  const leido = leerFormularioMovimiento(formData);
  if (!leido.ok) return fallo(leido.error);
  const { tipo, importe, comercio, fecha } = leido.datos;
  let categoria_id = leido.datos.categoria;

  if (categoria_id === "auto") {
    const { data: cats } = await supabase.from("categories").select("id, palabras_clave");
    categoria_id = categorize(comercio, cats ?? []);
  }

  const campos = { tipo, importe, comercio, fecha: fecha.toISOString(), categoria_id };

  if (id) {
    const revisado = formData.get("revisado") === "on";
    const { error } = await supabase.from("transactions").update({ ...campos, revisado }).eq("id", id);
    if (error) return fallo(`No se pudo guardar: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("transactions")
      .insert({ ...campos, moneda: "EUR", origen: "manual", revisado: true });
    if (error) return fallo(`No se pudo guardar: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/pendientes");
  redirect(volver);
}

export async function borrarMovimiento(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const volver = rutaSegura(formData.get("volver"));
  if (id) await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/pendientes");
  redirect(volver);
}

