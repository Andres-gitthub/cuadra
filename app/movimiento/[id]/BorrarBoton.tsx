"use client";

import { borrarMovimiento } from "@/app/actions";

export function BorrarBoton({ id, volver }: { id: string; volver: string }) {
  return (
    <form
      action={borrarMovimiento}
      onSubmit={(e) => {
        if (!confirm("¿Borrar este movimiento?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="volver" value={volver} />
      <button className="btn btn-peligro">Borrar</button>
    </form>
  );
}
