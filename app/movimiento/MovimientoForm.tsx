"use client";

import { useActionState, useEffect, useState } from "react";
import { guardarMovimientoManual } from "@/app/actions";
import { estiloCategoria } from "@/lib/categorias-ui";
import { claveDeComercio } from "@/lib/aprender";
import type { Categoria, EstadoFormulario, TipoMovimiento } from "@/lib/types";

type Props = {
  categorias: Categoria[];
  volver: string;
  /** Texto del desplegable de fecha, p. ej. "Ahora" o "28 sept, 13:21". */
  etiquetaFecha: string;
  inicial: {
    id?: string;
    tipo?: TipoMovimiento;
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
  // Tras un error se muestra lo que se envió, no los valores iniciales (React reinicia el formulario).
  const v = estado.valores;
  const tipo = (v?.tipo ?? inicial.tipo) === "reembolso" ? "reembolso" : "gasto";
  const importe = v?.importe ?? inicial.importe;
  const comercio = v?.comercio ?? inicial.comercio;
  const categoriaId = v?.categoria_id ?? inicial.categoria_id;
  const fecha = v?.fecha ?? inicial.fecha;

  // Palabra que se aprendería con "Recordar", según lo que se va escribiendo en el comercio.
  const [comercioEscrito, setComercioEscrito] = useState(comercio);
  useEffect(() => setComercioEscrito(comercio), [comercio, estado.intento]);
  const claveRecordar = claveDeComercio(comercioEscrito);

  const opciones = [
    { valor: "auto", texto: "Automática", emoji: "✨" },
    ...categorias.map((c) => ({ valor: c.id, texto: c.nombre, emoji: estiloCategoria(c.nombre).emoji })),
    { valor: "", texto: "Sin categoría", emoji: "—" },
  ];

  return (
    <form key={estado.intento ?? 0} action={accion} className="form-rapido">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="volver" value={volver} />

      <fieldset className="selector-tipo">
        <legend className="sr-only">Tipo de movimiento</legend>
        <label>
          <input type="radio" name="tipo" value="gasto" defaultChecked={tipo === "gasto"} />
          <span>Gasto</span>
        </label>
        <label>
          <input type="radio" name="tipo" value="reembolso" defaultChecked={tipo === "reembolso"} />
          <span>Me devuelven</span>
        </label>
      </fieldset>

      <label className="importe-grande">
        <span className="sr-only">Importe en euros</span>
        <input
          name="importe"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={importe}
          autoFocus={!editando || !importe}
          autoComplete="off"
          required
        />
        <span aria-hidden>€</span>
      </label>

      <div className="tarjeta campos">
        <label className="campo">
          <span>
            <span className="solo-gasto">Comercio</span>
            <span className="solo-reembolso">Concepto</span>
          </span>
          <input
            name="comercio"
            placeholder="Mercadona, Bizum de Ana…"
            defaultValue={comercio}
            onChange={(e) => setComercioEscrito(e.target.value)}
            autoComplete="off"
          />
        </label>
        <details className="campo campo-fecha">
          <summary>
            <span>Fecha</span>
            <span className="valor">{etiquetaFecha} · cambiar</span>
          </summary>
          <input name="fecha" type="datetime-local" defaultValue={fecha} required />
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
          <label key={o.valor || "sin"} className={`chip${o.valor === "auto" ? " solo-gasto" : ""}`}>
            <input type="radio" name="categoria_id" value={o.valor} defaultChecked={o.valor === categoriaId} />
            <span>
              {o.emoji} {o.texto}
            </span>
          </label>
        ))}
      </fieldset>

      <label className="recordar solo-gasto">
        <input type="checkbox" name="recordar" defaultChecked={v?.recordar ?? false} />
        <span>
          {claveRecordar ? (
            <>
              Recordar esta categoría para «{claveRecordar}»
              <span className="ayuda">También corrige los gastos anteriores de ese comercio.</span>
            </>
          ) : (
            <>
              Recordar esta categoría para este comercio
              <span className="ayuda">Escribe el comercio para ver qué palabra aprenderá.</span>
            </>
          )}
        </span>
      </label>

      {estado.error && <p className="error">{estado.error}</p>}
      <button className="btn btn-grande" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
