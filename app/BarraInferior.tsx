"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { conBase } from "@/lib/rutas";
import { Trazo } from "./Iconos";

const PESTAÑAS = [
  { href: "/", texto: "Inicio", icono: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" },
  { href: "/estadisticas", texto: "Estadísticas", icono: "M5 20V11M12 20V4M19 20v-6" },
  { href: "/pendientes", texto: "Pendientes", icono: "M4 13h4l2 3h4l2-3h4M5 5h14l1 8v6H4v-6l1-8Z" },
];

/** Pestañas con "Añadir" a la derecha: al alcance del pulgar y sin tapar la última fila de la lista. */
export function BarraInferior({ pendientes, base = "" }: { pendientes: number; base?: string }) {
  const ruta = usePathname();

  return (
    <nav className="barra-inferior" aria-label="Navegación principal">
      {PESTAÑAS.map((p) => {
        const href = conBase(base, p.href);
        return (
          <Link
            key={p.href}
            href={href}
            className={`pestaña${ruta === href ? " activa" : ""}`}
            aria-current={ruta === href ? "page" : undefined}
          >
            <span className="con-globo">
              <Trazo d={p.icono} />
              {p.href === "/pendientes" && pendientes > 0 && (
                <span className="globo">{pendientes > 99 ? "99+" : pendientes}</span>
              )}
            </span>
            {p.texto}
          </Link>
        );
      })}
      <Link href={conBase(base, "/movimiento/nuevo")} className="pestaña añadir">
        <span className="añadir-icono">
          <Trazo d="M12 5v14M5 12h14" tamaño={22} grosor={2.4} />
        </span>
        Añadir
      </Link>
    </nav>
  );
}
