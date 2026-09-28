export type CategoryRule = { id: string; palabras_clave: string[] | null };

/**
 * Devuelve el id de la categoría cuya palabra clave aparece en el comercio.
 * Si varias coinciden, gana la palabra clave más larga (la más específica).
 */
export function categorize(comercio: string | null | undefined, categories: CategoryRule[]): string | null {
  if (!comercio) return null;
  // Espacios alrededor para que claves como "dia " o "bar " casen también al final del nombre.
  const texto = ` ${normalizar(comercio)} `;

  let mejor: { id: string; largo: number } | null = null;
  for (const cat of categories) {
    for (const clave of cat.palabras_clave ?? []) {
      const k = normalizar(clave);
      if (!k.trim()) continue;
      if (texto.includes(k) && (!mejor || k.length > mejor.largo)) {
        mejor = { id: cat.id, largo: k.length };
      }
    }
  }
  return mejor?.id ?? null;
}

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
