"use client";

import { useActionState } from "react";
import { guardarMovimientoManual } from "@/app/actions";
import type { Categoria, EstadoFormulario } from "@/lib/types";

type Props = {
  categorias: Categoria[];
  volver: string;
  inicial: {
    id?: string;
    importe: string;
    comercio: string;
    categoria_id: string; // "auto", "" (sin categoría) o un id
    fecha: string; // "YYYY-MM-DDTHH:mm" en hora de Madrid
    revisado?: boolean;
  };
};

export function MovimientoForm({ categorias, volver, inicial }: Props) {
  const [estado, accion, guardando] = useActionState<EstadoFormulario, FormData>(guardarMovimientoManual, {
    error: null,
  });
  const editando = Boolean(inicial.id);

  return (
    <form action={accion} className="form">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="volver" value={volver} />

      <label>
        Importe (€)
        <input name="importe" inputMode="decimal" placeholder="12,50" defaultValue={inicial.importe} required />
      </label>
      <label>
        Comercio
        <input name="comercio" defaultValue={inicial.comercio} autoComplete="off" />
      </label>
      <label>
        Categoría
        <select name="categoria_id" defaultValue={inicial.categoria_id}>
          <option value="auto">Automática (por comercio)</option>
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Fecha
        <input name="fecha" type="datetime-local" defaultValue={inicial.fecha} required />
      </label>
      {editando && (
        <label className="check">
          <input name="revisado" type="checkbox" defaultChecked={inicial.revisado ?? true} />
          Revisado
        </label>
      )}

      {estado.error && <p className="error">{estado.error}</p>}
      <button className="btn" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
