"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTAÑAS = [
  { href: "/", texto: "Inicio", icono: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" },
  { href: "/estadisticas", texto: "Estadísticas", icono: "M5 20V11M12 20V4M19 20v-6" },
  { href: "/pendientes", texto: "Pendientes", icono: "M4 13h4l2 3h4l2-3h4M5 5h14l1 8v6H4v-6l1-8Z" },
];

export function BarraInferior({ pendientes }: { pendientes: number }) {
  const ruta = usePathname();

  return (
    <>
      <Link href="/movimiento/nuevo" className="boton-añadir" aria-label="Añadir gasto">
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
      <nav className="barra-inferior" aria-label="Navegación principal">
        {PESTAÑAS.map((p) => (
          <Link key={p.href} href={p.href} className={`pestaña${ruta === p.href ? " activa" : ""}`}>
            <span className="con-globo">
              <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
                <path d={p.icono} />
              </svg>
              {p.href === "/pendientes" && pendientes > 0 && (
                <span className="globo">{pendientes > 99 ? "99+" : pendientes}</span>
              )}
            </span>
            {p.texto}
          </Link>
        ))}
      </nav>
    </>
  );
}
