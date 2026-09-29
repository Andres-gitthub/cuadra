/** Solo rutas internas ("/..." pero no "//otro-dominio"), para no redirigir fuera de la app. */
export function rutaSegura(valor: unknown): string {
  const ruta = typeof valor === "string" ? valor : "/";
  return /^\/(?![/\\])/.test(ruta) ? ruta : "/";
}
