export type CategoryRule = { id: string; palabras_clave: string[] | null };

/**
 * Devuelve el id de la categoría cuya palabra clave aparece en el comercio.
 * Si varias coinciden, gana la palabra clave más larga (la más específica).
 */
export function categorize(comercio: string | null | undefined, categories: CategoryRule[]): string | null {
  if (!comercio) return null;

  let mejor: { id: string; largo: number } | null = null;
  for (const cat of categories) {
    for (const clave of cat.palabras_clave ?? []) {
      const k = normalizar(clave);
      if (!k.trim()) continue;
      if (coincide(comercio, clave) && (!mejor || k.length > mejor.largo)) {
        mejor = { id: cat.id, largo: k.length };
      }
    }
  }
  return mejor?.id ?? null;
}

/**
 * ¿Aparece la palabra clave en el comercio? Sin distinguir mayúsculas ni tildes.
 * Es el único criterio de coincidencia: lo usan la categorización y el aprendizaje de reglas.
 */
export function coincide(comercio: string | null | undefined, clave: string): boolean {
  if (!comercio) return false;
  const k = normalizar(clave);
  if (!k.trim()) return false;
  // Espacios alrededor para que claves como "dia " o "bar " casen también al final del nombre.
  return ` ${normalizar(comercio)} `.includes(k);
}

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
