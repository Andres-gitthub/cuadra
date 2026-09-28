/**
 * Convierte un importe escrito a número (euros con 2 decimales).
 * Devuelve null si el formato es ambiguo o no es un importe positivo: nunca adivina.
 *
 *   "1.234,56 €" → 1234.56   "23,45" → 23.45   "12.34" → 12.34
 *   "1.234"      → 1234      "1,234.56" → 1234.56   "1,234" → null (ambiguo)
 */
export function parseAmount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "number") {
    return Number.isFinite(input) && input > 0 ? round2(input) : null;
  }

  const s = input
    .replace(/eur(os?)?|€/gi, "")
    .replace(/[\s ]/g, "");

  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    // Formato español con miles: 1.234 / 1.234,56
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+(,\d{1,2})?$/.test(s)) {
    // Coma decimal: 23,45
    normalized = s.replace(",", ".");
  } else if (/^\d+(\.\d{1,2})?$/.test(s)) {
    // Punto decimal: 12.34
    normalized = s;
  } else if (/^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(s)) {
    // Formato inglés con miles y decimales: 1,234.56
    normalized = s.replace(/,/g, "");
  } else {
    return null;
  }

  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? round2(n) : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
