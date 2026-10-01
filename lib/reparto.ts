import { parseAmount } from "./amount.ts";
import { formatearImporte } from "./dates.ts";

export type Reparto = { total: number; personas: number };

// La nota se guarda como primera línea de texto_original: "Pagado 60,00 € entre 4".
const NOTA = /^Pagado (.+) entre (\d+)$/;

/** Tu parte de un gasto repartido a partes iguales, redondeada a céntimos. */
export function repartir(total: number, personas: number): number {
  return Math.round((total / personas) * 100) / 100;
}

/** Reparto guardado en la nota, o null si el gasto no está repartido. */
export function leerReparto(texto: string | null | undefined): Reparto | null {
  const m = texto?.split("\n")[0].match(NOTA);
  if (!m) return null;
  const total = parseAmount(m[1]);
  return total === null ? null : { total, personas: Number(m[2]) };
}

/** El texto sin la nota de reparto (lo que llegó de Apple Pay o del SMS), o null si no queda nada. */
export function quitarNotaReparto(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const lineas = texto.split("\n");
  const resto = NOTA.test(lineas[0]) ? lineas.slice(1).join("\n") : texto;
  return resto.trim() ? resto : null;
}

/** Pone (o quita, si reparto es null) la nota de reparto, conservando el texto original. */
export function combinarNota(texto: string | null | undefined, reparto: Reparto | null): string | null {
  const original = quitarNotaReparto(texto);
  if (!reparto) return original;
  const nota = `Pagado ${formatearImporte(reparto.total)} entre ${reparto.personas}`;
  return original ? `${nota}\n${original}` : nota;
}
