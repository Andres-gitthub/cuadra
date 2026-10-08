/**
 * Solo rutas internas ("/..." pero no "//otro-dominio"), para no redirigir fuera de la app.
 * Se rechazan caracteres de control y "\": el parser de URL los elimina o convierte en "/",
 * y "/\t/evil.com" acabaría siendo "//evil.com".
 */
export function rutaSegura(valor: unknown): string {
  const ruta = typeof valor === "string" ? valor : "/";
  return /^\/(?![/\\])[^\x00-\x1f\x7f\\]*$/.test(ruta) ? ruta : "/";
}

/** Raíz de la demo pública, con datos inventados. */
export const BASE_DEMO = "/demo";

/** La misma pantalla dentro de la app (base "") o de la demo: conBase("/demo", "/") → "/demo". */
export function conBase(base: string, ruta: string): string {
  return base && ruta === "/" ? base : `${base}${ruta}`;
}

/** ¿Pertenece la ruta a la demo? "/demo", "/demo/…" o "/demo?…", pero no "/demonio". */
export function esRutaDemo(ruta: string): boolean {
  return /^\/demo(?:[/?#]|$)/.test(ruta);
}
