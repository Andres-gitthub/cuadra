import { claveMes, desplazarMes, formatearImporte, mesActual, nombreMes, type Mes } from "@/lib/dates";
import { cuentaMovimientos, desglosePorCategoria, diferenciaConAnterior, totalImportes } from "@/lib/resumen";
import { ritmoDelMes } from "@/lib/estadisticas";
import { conBase } from "@/lib/rutas";
import type { Movimiento } from "@/lib/types";
import { SelectorMes } from "../SelectorMes";
import { DesgloseCategorias } from "../DesgloseCategorias";
import { MovimientosLista } from "../MovimientosLista";
import { BarraInferior } from "../BarraInferior";
import { CabeceraLibreta } from "../CabeceraLibreta";
import { CerrarSesion } from "../CerrarSesion";
import { Insignia } from "../Iconos";

export type DatosInicio = {
  mes: Mes;
  ahora: Date;
  /** Movimientos del mes, del más reciente al más antiguo. */
  movimientos: Movimiento[];
  /** Gasto neto del mes anterior, para la comparación. */
  totalAnterior: number;
  pendientes: number;
  /** Categoría por la que se filtra la lista ("sin" = sin categoría). */
  cat?: string;
  error?: string | null;
  /** "" en la app, "/demo" en la demo. */
  base?: string;
};

/** Pantalla de Inicio a partir de los datos ya leídos: no consulta nada. */
export function InicioVista({ mes, ahora, movimientos, totalAnterior, pendientes, cat, error, base = "" }: DatosInicio) {
  const anterior = desplazarMes(mes, -1);
  const esActual = claveMes(mes) === claveMes(mesActual(ahora));
  const total = totalImportes(movimientos);
  const diferencia = diferenciaConAnterior(total, totalAnterior);
  const ritmo = ritmoDelMes(total, mes, ahora);
  const desglose = desglosePorCategoria(movimientos);

  const filtrados = cat
    ? movimientos.filter((m) => (cat === "sin" ? m.categoria_id === null : m.categoria_id === cat))
    : movimientos;
  const volver = `${conBase(base, "/")}?mes=${claveMes(mes)}${cat ? `&cat=${cat}` : ""}`;

  return (
    <>
      <main className="page con-barra">
        <CabeceraLibreta>
          <div className="cabecera-fila">
            <SelectorMes mes={mes} esActual={esActual} ruta={conBase(base, "/")} />
            {esActual && (
              <span className="subtitulo">
                Día {ritmo.diasContados} de {ritmo.diasDelMes}
              </span>
            )}
          </div>
          <p className="etiqueta-total">{esActual ? "Gastado este mes" : `Gastado en ${nombreMes(mes, false)}`}</p>
          <p className="total">
            <span className="subrayado">{formatearImporte(total)}</span>
          </p>
          <div className="resumen-mes">
            {diferencia !== null && (
              <Insignia diferencia={diferencia}>
                {diferencia === 0
                  ? `Igual que en ${nombreMes(anterior, false)}`
                  : `${formatearImporte(Math.abs(diferencia))} ${diferencia < 0 ? "menos" : "más"} que en ${nombreMes(anterior, false)}`}
              </Insignia>
            )}
            <span className="subtitulo">{cuentaMovimientos(movimientos)}</span>
          </div>
        </CabeceraLibreta>

        {error && <p className="error">Error cargando datos: {error}</p>}

        <DesgloseCategorias lineas={desglose} claveMes={claveMes(mes)} seleccionada={cat} base={base} />

        <MovimientosLista
          movimientos={filtrados}
          volver={volver}
          base={base}
          vacio={cat ? "No hay movimientos de esta categoría este mes." : "Aún no hay movimientos este mes."}
        />
        {!base && <CerrarSesion />}
      </main>
      <BarraInferior pendientes={pendientes} base={base} />
    </>
  );
}
