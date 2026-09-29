"use client";

import { borrarMovimiento } from "@/app/actions";

type Props = { id: string; volver: string; texto?: string; className?: string };

export function BorrarBoton({ id, volver, texto = "Borrar movimiento", className = "btn btn-peligro" }: Props) {
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
