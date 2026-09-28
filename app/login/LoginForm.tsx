"use client";

import { useActionState } from "react";
import { enviarCodigo, verificarCodigo, type EstadoLogin } from "@/app/actions";

const inicial: EstadoLogin = { error: null, email: null };

export function LoginForm({ errorEnlace }: { errorEnlace: boolean }) {
  const [envio, enviar, enviando] = useActionState(enviarCodigo, inicial);
  const [verif, verificar, verificando] = useActionState(verificarCodigo, inicial);
  const email = envio.email ?? verif.email;

  if (!email) {
    return (
      <form action={enviar} className="form">
        {errorEnlace && <p className="error">El enlace no es válido o ha caducado. Pide otro.</p>}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required autoFocus />
        </label>
        {envio.error && <p className="error">{envio.error}</p>}
        <button className="btn" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviarme el acceso"}
        </button>
      </form>
    );
  }

  return (
    <form action={verificar} className="form">
      <p>
        Te hemos enviado un email a <strong>{email}</strong>.
      </p>
      <p className="muted">
        Si usas la app instalada en el iPhone, escribe aquí el código del email (el enlace abriría Safari, no la app).
      </p>
      <input type="hidden" name="email" value={email} />
      <label>
        Código
        <input name="token" inputMode="numeric" autoComplete="one-time-code" required autoFocus />
      </label>
      {verif.error && <p className="error">{verif.error}</p>}
      <button className="btn" disabled={verificando}>
        {verificando ? "Comprobando…" : "Entrar"}
      </button>
    </form>
  );
}
