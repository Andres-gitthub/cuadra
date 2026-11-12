import { estiloCategoria, GRIS, ICONO_AUTOMATICA } from "@/lib/categorias-ui";
import type { Categoria } from "@/lib/types";
import { Trazo } from "./Iconos";

type Props = {
  categorias: Categoria[];
  /** "auto", "" (sin categoría) o un id. */
  seleccionada: string;
  /** Con la opción "Automática" (solo en movimientos). */
  conAutomatica?: boolean;
};

/** Categorías como botones de radio (name="categoria_id"). */
export function ChipsCategoria({ categorias, seleccionada, conAutomatica }: Props) {
  const opciones = [
    ...(conAutomatica ? [{ valor: "auto", texto: "Automática", color: GRIS, icono: ICONO_AUTOMATICA as string | null }] : []),
    ...categorias.map((c) => {
      const { color, icono } = estiloCategoria(c.nombre);
      return { valor: c.id, texto: c.nombre, color, icono };
    }),
    { valor: "", texto: "Sin categoría", color: GRIS, icono: "M6 12h12" as string | null },
  ];
  return (
    <fieldset className="chips">
      <legend>Categoría</legend>
      {opciones.map((o) => (
        <label
          key={o.valor || "sin"}
          className={`chip${o.valor === "auto" ? " solo-gasto" : ""}`}
          style={{ "--cat": o.color } as React.CSSProperties}
        >
          <input type="radio" name="categoria_id" value={o.valor} defaultChecked={o.valor === seleccionada} />
          <span>
            {o.icono ? <Trazo d={o.icono} tamaño={18} /> : <span className="chip-inicial">{o.texto.charAt(0)}</span>}
            {o.texto}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
