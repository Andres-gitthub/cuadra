// Color e icono de cada categoría en la interfaz. Se asignan por nombre para no tocar la base de datos:
// una categoría nueva que no esté aquí se muestra en gris con su inicial.
export const GRIS = "#5b6270";

const ESTILOS: Record<string, { color: string; icono: string }> = {
  supermercado: { color: "#2f7d5b", icono: "M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6M9 19.5h.01M17 19.5h.01" },
  restaurantes: { color: "#c2410c", icono: "M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 21V3c-2 1.5-3 4-3 8h3" },
  transporte: { color: "#2440b3", icono: "M4 16v-3l2-6h12l2 6v3H4ZM7 16v3M17 16v3M7.5 12.5h.01M16.5 12.5h.01" },
  compras: { color: "#9d3d8f", icono: "M6 8h12l-1 12H7L6 8ZM9 8V6a3 3 0 0 1 6 0v2" },
  suscripciones: { color: "#6d4fc2", icono: "M4 8h16v11H4ZM8 4l4 4 4-4" },
  hogar: { color: "#a16207", icono: "M4 11 12 4l8 7v9h-5v-6H9v6H4Z" },
  salud: { color: "#0e7490", icono: "M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6Z" },
  ocio: { color: "#be3a5c", icono: "M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6ZM14 6v12" },
};

/** Icono de la opción "Automática" del formulario. */
export const ICONO_AUTOMATICA = "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z";

export type EstiloCategoria = { color: string; icono: string | null; inicial: string };

export function estiloCategoria(nombre: string | null | undefined): EstiloCategoria {
  const limpio = nombre?.trim();
  if (!limpio) return { color: GRIS, icono: null, inicial: "?" };
  const e = ESTILOS[limpio.toLowerCase()];
  return { color: e?.color ?? GRIS, icono: e?.icono ?? null, inicial: limpio.charAt(0).toUpperCase() };
}
