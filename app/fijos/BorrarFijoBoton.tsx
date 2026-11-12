"use client";

import { borrarGastoFijo } from "@/app/actions";
import { AVISO_DEMO } from "@/lib/demo";

export function BorrarFijoBoton({ id, demo }: { id: string; demo?: boolean }) {
  if (demo) {
    return (
      <button type="button" className="btn btn-peligro" onClick={() => alert(AVISO_DEMO)}>
        Borrar gasto fijo
      </button>
    );
  }
  return (
    <form
      action={borrarGastoFijo}
      onSubmit={(e) => {
        if (!confirm("¿Borrar este gasto fijo? Los movimientos ya creados se quedan.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-peligro">Borrar gasto fijo</button>
    </form>
  );
}
