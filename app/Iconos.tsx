import { estiloCategoria } from "@/lib/categorias-ui";

export function IconoCategoria({ nombre, tamaño = 38 }: { nombre: string | null | undefined; tamaño?: number }) {
  const { emoji, color } = estiloCategoria(nombre);
  return (
    <span
      className="icono-cat"
      aria-hidden
      style={{ width: tamaño, height: tamaño, fontSize: tamaño * 0.5, background: `${color}26`, color }}
    >
      {emoji}
    </span>
  );
}

const ORIGEN = {
  wallet: { titulo: "Apple Pay", d: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm4 17h2" },
  sms: { titulo: "SMS del banco", d: "M4 5h16v11H9l-5 4V5Z" },
  manual: { titulo: "Añadido a mano", d: "M4 20h4L19 9l-4-4L4 16v4Zm10-14 4 4" },
} as const;

export function IconoOrigen({ origen }: { origen: keyof typeof ORIGEN }) {
  const o = ORIGEN[origen];
  return (
    <svg className="icono-origen" viewBox="0 0 24 24" width="13" height="13" role="img" aria-label={o.titulo}>
      <title>{o.titulo}</title>
      <path d={o.d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
