/**
 * Solo rutas internas ("/..." pero no "//otro-dominio"), para no redirigir fuera de la app.
 * Se rechazan caracteres de control y "\": el parser de URL los elimina o convierte en "/",
 * y "/\t/evil.com" acabaría siendo "//evil.com".
 */
export function rutaSegura(valor: unknown): string {
  const ruta = typeof valor === "string" ? valor : "/";
  return /^\/(?![/\\])[^\x00-\x1f\x7f\\]*$/.test(ruta) ? ruta : "/";
}
