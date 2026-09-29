"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BarraInferior({ pendientes }: { pendientes: number }) {
  const ruta = usePathname();

  return (
    <nav className="barra-inferior" aria-label="Navegación principal">
      <Link href="/" className={`pestaña${ruta === "/" ? " activa" : ""}`}>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
          <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" />
        </svg>
        Inicio
      </Link>

      <Link href="/movimiento/nuevo" className="boton-añadir" aria-label="Añadir gasto">
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>

      <Link href="/pendientes" className={`pestaña${ruta === "/pendientes" ? " activa" : ""}`}>
        <span className="con-globo">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
            <path d="M4 13h4l2 3h4l2-3h4M5 5h14l1 8v6H4v-6l1-8Z" />
          </svg>
          {pendientes > 0 && <span className="globo">{pendientes > 99 ? "99+" : pendientes}</span>}
        </span>
        Pendientes
      </Link>
    </nav>
  );
}
