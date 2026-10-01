import { coincide, normalizar, type CategoryRule } from "./categorize.ts";

/**
 * Palabra clave que se aprende de un comercio: en minúsculas y sin los trozos con números o "*"
 * ("REPSOL ES 1234" → "repsol es", "UBER *TRIP" → "uber"), para que valga para otros
 * establecimientos de la misma marca. null si queda algo de menos de 3 letras (demasiado genérico).
 */
export function claveDeComercio(comercio: string | null | undefined): string | null {
  if (!comercio) return null;
  const clave = comercio
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t && !/[\d*]/.test(t))
    .join(" ");
  return clave.replace(/\s/g, "").length >= 3 ? clave : null;
}

const misma = (a: string, b: string) => normalizar(a).trim() === normalizar(b).trim();

/**
 * Cambios en las palabras clave para que el comercio pertenezca a `categoriaId`:
 * se añade ahí y se quita de cualquier otra categoría. Devuelve solo las categorías que cambian.
 */
export function aplicarRegla(
  categorias: CategoryRule[],
  clave: string,
  categoriaId: string,
): { id: string; palabras_clave: string[] }[] {
  const cambios: { id: string; palabras_clave: string[] }[] = [];
  for (const cat of categorias) {
    const actuales = cat.palabras_clave ?? [];
    const laTiene = actuales.some((p) => misma(p, clave));
    if (cat.id === categoriaId) {
      if (!laTiene) cambios.push({ id: cat.id, palabras_clave: [...actuales, clave] });
    } else if (laTiene) {
      cambios.push({ id: cat.id, palabras_clave: actuales.filter((p) => !misma(p, clave)) });
    }
  }
  return cambios;
}

/** Ids de los gastos (nunca devoluciones) de ese comercio que aún no están en la categoría. */
export function gastosQueCoinciden(
  movs: { id: string; comercio: string | null; tipo?: string | null; categoria_id: string | null }[],
  clave: string,
  categoriaId: string,
): string[] {
  return movs
    .filter((m) => m.tipo !== "reembolso" && m.categoria_id !== categoriaId && coincide(m.comercio, clave))
    .map((m) => m.id);
}
