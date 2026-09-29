// Aspecto de cada categoría en la interfaz. Se asigna por nombre para no tocar la base de datos:
// una categoría nueva que no esté aquí se muestra con su inicial y color gris.
const ESTILOS: Record<string, { emoji: string; color: string }> = {
  supermercado: { emoji: "🛒", color: "#34c759" },
  restaurantes: { emoji: "🍽️", color: "#ff9500" },
  transporte: { emoji: "🚗", color: "#007aff" },
  compras: { emoji: "🛍️", color: "#ff2d55" },
  suscripciones: { emoji: "📺", color: "#af52de" },
  hogar: { emoji: "🏠", color: "#a2845e" },
  salud: { emoji: "💊", color: "#ff3b30" },
  ocio: { emoji: "🎉", color: "#ffcc00" },
};

const SIN_CATEGORIA = { emoji: "?", color: "#8e8e93" };

export function estiloCategoria(nombre: string | null | undefined): { emoji: string; color: string } {
  if (!nombre) return SIN_CATEGORIA;
  return ESTILOS[nombre.trim().toLowerCase()] ?? { emoji: nombre.trim().charAt(0).toUpperCase(), color: "#8e8e93" };
}
