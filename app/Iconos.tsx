import { estiloCategoria } from "@/lib/categorias-ui";

/** Icono de línea de 24×24 en el color del texto. */
export function Trazo({ d, tamaño = 24, grosor = 2 }: { d: string; tamaño?: number; grosor?: number }) {
  return (
    <svg className="trazo" viewBox="0 0 24 24" width={tamaño} height={tamaño} strokeWidth={grosor} aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Cuadro con el icono de la categoría en su color (o su inicial, si es una categoría sin estilo). */
export function IconoCategoria({ nombre, tamaño = 40 }: { nombre: string | null | undefined; tamaño?: number }) {
  const { color, icono, inicial } = estiloCategoria(nombre);
  return (
    <span className="icono-cat" aria-hidden style={{ width: tamaño, height: tamaño, color, background: `${color}1a` }}>
      {icono ? <Trazo d={icono} tamaño={Math.round(tamaño / 2)} /> : <span style={{ fontSize: tamaño * 0.45 }}>{inicial}</span>}
    </span>
  );
}

const FLECHAS = { sube: "M12 19V5M6 11l6-6 6 6", baja: "M12 5v14M6 13l6 6 6-6" } as const;

/** Etiqueta con flecha para una diferencia de gasto: gastar más va en rojo, gastar menos en verde. */
export function Insignia({ diferencia, children }: { diferencia: number; children: React.ReactNode }) {
  const sentido = diferencia > 0 ? "sube" : diferencia < 0 ? "baja" : null;
  return (
    <span className={`insignia${sentido ? ` ${sentido}` : ""}`}>
      {sentido && <Trazo d={FLECHAS[sentido]} tamaño={14} grosor={2.4} />}
      {children}
    </span>
  );
}

const ORIGEN = {
  wallet: { titulo: "Apple Pay", d: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm4 17h2" },
  sms: { titulo: "SMS del banco", d: "M4 5h16v11H9l-5 4V5Z" },
  manual: { titulo: "Añadido a mano", d: "M4 20h4L19 9l-4-4L4 16v4Zm10-14 4 4" },
  devolucion: { titulo: "Devolución", d: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" },
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
