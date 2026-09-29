// Emoji de cada categoría en la interfaz. Se asigna por nombre para no tocar la base de datos:
// una categoría nueva que no esté aquí se muestra con su inicial.
const EMOJIS: Record<string, string> = {
  supermercado: "🛒",
  restaurantes: "🍽️",
  transporte: "🚗",
  compras: "🛍️",
  suscripciones: "📺",
  hogar: "🏠",
  salud: "💊",
  ocio: "🎉",
};

export function estiloCategoria(nombre: string | null | undefined): { emoji: string } {
  if (!nombre) return { emoji: "?" };
  return { emoji: EMOJIS[nombre.trim().toLowerCase()] ?? nombre.trim().charAt(0).toUpperCase() };
}
