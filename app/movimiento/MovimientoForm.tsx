"use client";

import { useActionState } from "react";
import { guardarMovimientoManual } from "@/app/actions";
import { estiloCategoria } from "@/lib/categorias-ui";
import type { Categoria, EstadoFormulario } from "@/lib/types";

type Props = {
  categorias: Categoria[];
  volver: string;
  /** Texto del desplegable de fecha, p. ej. "Ahora" o "28 sept, 13:21". */
  etiquetaFecha: string;
  inicial: {
    id?: string;
    importe: string;
    comercio: string;
    categoria_id: string; // "auto", "" (sin categoría) o un id
    fecha: string; // "YYYY-MM-DDTHH:mm" en hora de Madrid
    revisado?: boolean;
  };
};

export function MovimientoForm({ categorias, volver, etiquetaFecha, inicial }: Props) {
  const [estado, accion, guardando] = useActionState<EstadoFormulario, FormData>(guardarMovimientoManual, {
    error: null,
  });
  const editando = Boolean(inicial.id);

  const opciones = [
    { valor: "auto", texto: "Automática", emoji: "✨" },
    ...categorias.map((c) => ({ valor: c.id, texto: c.nombre, emoji: estiloCategoria(c.nombre).emoji })),
    { valor: "", texto: "Sin categoría", emoji: "—" },
  ];

  return (
    <form action={accion} className="form-rapido">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="volver" value={volver} />

      <label className="importe-grande">
        <span className="sr-only">Importe en euros</span>
        <input
          name="importe"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={inicial.importe}
          autoFocus={!editando || !inicial.importe}
          autoComplete="off"
          required
        />
        <span aria-hidden>€</span>
      </label>

      <div className="tarjeta campos">
        <label className="campo">
          <span>Comercio</span>
          <input name="comercio" placeholder="¿Dónde?" defaultValue={inicial.comercio} autoComplete="off" />
        </label>
        <details className="campo campo-fecha">
          <summary>
            <span>Fecha</span>
            <span className="valor">{etiquetaFecha} · cambiar</span>
          </summary>
          <input name="fecha" type="datetime-local" defaultValue={inicial.fecha} required />
        </details>
        {editando && (
          <label className="campo interruptor">
            <span>Revisado</span>
            <input name="revisado" type="checkbox" role="switch" defaultChecked={inicial.revisado ?? true} />
          </label>
        )}
      </div>

      <fieldset className="chips">
        <legend>Categoría</legend>
        {opciones.map((o) => (
          <label key={o.valor || "sin"} className="chip">
            <input type="radio" name="categoria_id" value={o.valor} defaultChecked={o.valor === inicial.categoria_id} />
            <span>
              {o.emoji} {o.texto}
            </span>
          </label>
        ))}
      </fieldset>

      {estado.error && <p className="error">{estado.error}</p>}
      <button className="btn btn-grande" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
