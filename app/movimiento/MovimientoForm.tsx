"use client";

import { useActionState, useEffect, useState } from "react";
import { guardarMovimientoManual } from "@/app/actions";
import { estiloCategoria, GRIS, ICONO_AUTOMATICA } from "@/lib/categorias-ui";
import { Trazo } from "@/app/Iconos";
import { claveDeComercio } from "@/lib/aprender";
import { parseAmount } from "@/lib/amount";
import { repartir } from "@/lib/reparto";
import { formatearImporte } from "@/lib/dates";
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
    /** Personas entre las que se reparte (1 = sin repartir). Con reparto, importe es el total pagado. */
    personas?: number;
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

  // Vista previa de "Repartir entre": el importe escrito es el total, y se muestra tu parte.
  const personas = v?.personas ?? String(inicial.personas ?? 1);
  const [importeEscrito, setImporteEscrito] = useState(importe);
  const [personasElegidas, setPersonasElegidas] = useState(personas);
  useEffect(() => {
    setImporteEscrito(importe);
    setPersonasElegidas(personas);
  }, [importe, personas, estado.intento]);
  const total = parseAmount(importeEscrito);
  const n = Number(personasElegidas);
  const tuParte = total !== null && n > 1 ? repartir(total, n) : null;

  const opciones = [
    { valor: "auto", texto: "Automática", color: GRIS, icono: ICONO_AUTOMATICA as string | null },
    ...categorias.map((c) => {
      const { color, icono } = estiloCategoria(c.nombre);
      return { valor: c.id, texto: c.nombre, color, icono };
    }),
    { valor: "", texto: "Sin categoría", color: GRIS, icono: "M6 12h12" },
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

      <div className="importe-libreta">
        <label className="importe-grande">
          <span className="sr-only">Importe en euros</span>
          <input
            name="importe"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={importe}
            onChange={(e) => setImporteEscrito(e.target.value)}
            autoFocus={!editando || !importe}
            autoComplete="off"
            required
          />
          <span aria-hidden>€</span>
        </label>
        {tuParte !== null && (
          <p className="tu-parte solo-gasto" aria-live="polite">
            Tu parte: <strong>{formatearImporte(tuParte)}</strong> · {formatearImporte(total!)} entre {n}
          </p>
        )}
      </div>

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
        <label className="campo solo-gasto">
          <span>Repartir entre</span>
          <select name="personas" defaultValue={personas} onChange={(e) => setPersonasElegidas(e.target.value)}>
            <option value="1">No repartir</option>
            {Array.from({ length: 11 }, (_, i) => i + 2).map((p) => (
              <option key={p} value={p}>
                {p} personas
              </option>
            ))}
          </select>
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
          <label
            key={o.valor || "sin"}
            className={`chip${o.valor === "auto" ? " solo-gasto" : ""}`}
            style={{ "--cat": o.color } as React.CSSProperties}
          >
            <input type="radio" name="categoria_id" value={o.valor} defaultChecked={o.valor === categoriaId} />
            <span>
              {o.icono ? <Trazo d={o.icono} tamaño={18} /> : <span className="chip-inicial">{o.texto.charAt(0)}</span>}
              {o.texto}
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
