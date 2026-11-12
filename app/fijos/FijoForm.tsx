"use client";

import { useActionState } from "react";
import { guardarGastoFijo } from "@/app/actions";
import { ChipsCategoria } from "@/app/ChipsCategoria";
import { AVISO_DEMO } from "@/lib/demo";
import type { Categoria, EstadoFijo, GastoFijo } from "@/lib/types";

type Props = { fijo: GastoFijo; categorias: Categoria[]; demo?: boolean };

export function FijoForm({ fijo, categorias, demo }: Props) {
  const [estado, accion, guardando] = useActionState<EstadoFijo, FormData>(guardarGastoFijo, { error: null });
  // Tras un error se muestra lo enviado (React reinicia el formulario).
  const v = estado.valores;
  const importe = v?.importe ?? String(fijo.importe).replace(".", ",");
  const comercio = v?.comercio ?? fijo.comercio;
  const dia = v?.dia ?? String(fijo.dia);
  const activo = v?.activo ?? fijo.activo;
  const categoriaId = v?.categoria_id ?? fijo.categoria_id ?? "";

  return (
    <form
      key={estado.intento ?? 0}
      action={demo ? undefined : accion}
      onSubmit={
        demo
          ? (e) => {
              e.preventDefault();
              alert(AVISO_DEMO);
            }
          : undefined
      }
      className="form-rapido"
    >
      <input type="hidden" name="id" value={fijo.id} />

      <div className="importe-libreta">
        <label className="importe-grande">
          <span className="sr-only">Importe en euros</span>
          <input name="importe" inputMode="decimal" placeholder="0,00" defaultValue={importe} autoComplete="off" required />
          <span aria-hidden>€</span>
        </label>
      </div>

      <div className="tarjeta campos">
        <label className="campo">
          <span>Comercio</span>
          <input name="comercio" defaultValue={comercio} autoComplete="off" required />
        </label>
        <label className="campo">
          <span>Día del cargo</span>
          <select name="dia" defaultValue={dia}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="campo interruptor">
          <span>Activo</span>
          <input name="activo" type="checkbox" role="switch" defaultChecked={activo} />
        </label>
      </div>

      <ChipsCategoria categorias={categorias} seleccionada={categoriaId} />

      <p className="subtitulo">Los cambios cuentan desde el próximo cargo; los meses ya creados no cambian.</p>

      {estado.error && <p className="error">{estado.error}</p>}
      <button className="btn btn-grande" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
