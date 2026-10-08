"use client";

import { borrarMovimiento } from "@/app/actions";
import { AVISO_DEMO } from "@/lib/demo";

type Props = { id: string; volver: string; texto?: string; className?: string; /** En la demo solo avisa. */ demo?: boolean };

export function BorrarBoton({ id, volver, texto = "Borrar movimiento", className = "btn btn-peligro", demo }: Props) {
  if (demo) {
    return (
      <button type="button" className={className} onClick={() => alert(AVISO_DEMO)}>
        {texto}
      </button>
    );
  }
  return (
    <form
      action={borrarMovimiento}
      onSubmit={(e) => {
        if (!confirm("¿Borrar este movimiento?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="volver" value={volver} />
      <button className={className}>{texto}</button>
    </form>
  );
}
