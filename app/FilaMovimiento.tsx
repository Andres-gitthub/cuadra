"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { borrarMovimiento } from "@/app/actions";
import { formatearImporte } from "@/lib/dates";
import { AVISO_DEMO } from "@/lib/demo";
import { conBase } from "@/lib/rutas";
import { IconoCategoria, IconoOrigen } from "./Iconos";

const ANCHO_BORRAR = 88;

type Props = {
  id: string;
  comercio: string | null;
  categoria: string | null;
  importe: number | null;
  moneda: string;
  origen: "manual" | "wallet" | "sms";
  revisado: boolean;
  tipo: "gasto" | "reembolso";
  /** Personas entre las que se repartió, si se repartió. */
  personas?: number;
  hora: string;
  volver: string;
  /** "" en la app, "/demo" en la demo (donde borrar solo avisa). */
  base?: string;
};

/** Fila de un movimiento. Deslizar a la izquierda muestra "Borrar"; tocarla abre la edición. */
export function FilaMovimiento(p: Props) {
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicio = useRef<{ x: number; y: number; base: number } | null>(null);
  const direccion = useRef<"h" | "v" | null>(null);
  const seHaMovido = useRef(false);
  const abierta = desplazamiento <= -ANCHO_BORRAR / 2;
  const devolucion = p.tipo === "reembolso";

  function alEmpezar(e: React.TouchEvent) {
    const t = e.touches[0];
    inicio.current = { x: t.clientX, y: t.clientY, base: abierta ? -ANCHO_BORRAR : 0 };
    direccion.current = null;
    seHaMovido.current = false;
  }

  function alMover(e: React.TouchEvent) {
    if (!inicio.current) return;
    const t = e.touches[0];
    const dx = t.clientX - inicio.current.x;
    const dy = t.clientY - inicio.current.y;
    if (!direccion.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      direccion.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (direccion.current !== "h") return;
    seHaMovido.current = true;
    setArrastrando(true);
    setDesplazamiento(Math.min(0, Math.max(-ANCHO_BORRAR * 1.4, inicio.current.base + dx)));
  }

  function alSoltar() {
    if (direccion.current === "h") setDesplazamiento((d) => (d < -ANCHO_BORRAR / 2 ? -ANCHO_BORRAR : 0));
    setArrastrando(false);
    inicio.current = null;
  }

  function alPulsar(e: React.MouseEvent) {
    // Tras deslizar, o con la fila abierta, un toque cierra la fila en vez de navegar.
    if (seHaMovido.current || abierta) {
      e.preventDefault();
      if (!seHaMovido.current) setDesplazamiento(0);
      seHaMovido.current = false;
    }
  }

  return (
    <li className={`fila-deslizable${desplazamiento < 0 ? " deslizando" : ""}`}>
      {p.base ? (
        <div className="accion-borrar">
          <button
            type="button"
            tabIndex={abierta ? 0 : -1}
            onClick={() => {
              setDesplazamiento(0);
              alert(AVISO_DEMO);
            }}
          >
            Borrar
          </button>
        </div>
      ) : (
        <form action={borrarMovimiento} className="accion-borrar">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="volver" value={p.volver} />
          <button tabIndex={abierta ? 0 : -1}>Borrar</button>
        </form>
      )}

      <Link
        href={`${conBase(p.base ?? "", `/movimiento/${p.id}`)}?volver=${encodeURIComponent(p.volver)}`}
        className={`fila${arrastrando ? "" : " suave"}`}
        style={{ transform: `translateX(${desplazamiento}px)` }}
        onTouchStart={alEmpezar}
        onTouchMove={alMover}
        onTouchEnd={alSoltar}
        onTouchCancel={alSoltar}
        onClick={alPulsar}
      >
        <IconoCategoria nombre={p.categoria} />
        <span className="fila-info">
          <span className="fila-comercio">
            {!p.revisado && <span className="punto" aria-label="Pendiente de revisar" />}
            {p.comercio ?? <em>{devolucion ? "Devolución" : "Sin comercio"}</em>}
          </span>
          <span className="fila-detalle">
            <IconoOrigen origen={devolucion ? "devolucion" : p.origen} />
            {p.hora} · {p.categoria ?? "Sin categoría"}
            {p.personas && p.personas > 1 ? ` · entre ${p.personas}` : ""}
          </span>
        </span>
        <span className={`fila-importe${p.importe === null ? " sin-importe" : ""}${devolucion ? " devolucion" : ""}`}>
          {p.importe === null
            ? "Sin importe"
            : `${devolucion ? "+" : ""}${formatearImporte(p.importe, p.moneda)}`}
        </span>
      </Link>
    </li>
  );
}
