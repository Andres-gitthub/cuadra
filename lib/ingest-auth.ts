import { createHash, timingSafeEqual } from "node:crypto";

export type ResultadoToken = { ok: true } | { ok: false; motivo: string };

// Caracteres invisibles que se cuelan al copiar y pegar en el iPhone.
const INVISIBLES = /[​-‍⁠﻿]/g;
// Comillas que a veces se pegan alrededor del token.
const COMILLAS = /^["'“”‘’]+|["'“”‘’]+$/g;

/**
 * Comprueba la cabecera "Authorization: Bearer <token>" contra INGEST_TOKEN en tiempo constante.
 * Tolera mayúsculas en "Bearer", espacios especiales y caracteres invisibles.
 * Si falla, explica el motivo sin revelar nada del token esperado.
 */
export function comprobarToken(header: string | null, esperado: string | undefined): ResultadoToken {
  if (!esperado) return { ok: false, motivo: "El servidor no tiene INGEST_TOKEN configurado" };
  if (!header || !header.trim()) {
    return {
      ok: false,
      motivo:
        "No ha llegado la cabecera Authorization. Revisa que exista y que la URL empiece por https:// y no acabe en /",
    };
  }

  const limpio = header.replace(INVISIBLES, "");
  const m = limpio.match(/^\s*bearer\s+(.+?)\s*$/i);
  if (!m) return { ok: false, motivo: "La cabecera Authorization debe ser 'Bearer ' (con espacio) seguido del token" };

  const recibido = m[1].replace(COMILLAS, "").trim();
  const a = createHash("sha256").update(recibido).digest();
  const b = createHash("sha256").update(esperado).digest();
  if (!timingSafeEqual(a, b)) {
    return { ok: false, motivo: `El token no coincide (se han recibido ${recibido.length} caracteres)` };
  }
  return { ok: true };
}
