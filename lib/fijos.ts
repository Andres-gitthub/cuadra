import { desplazarMes, horaLocalAUtc, mesActual, type Mes } from "./dates.ts";

/** Si hace mucho que no se abre la app, solo se recuperan los últimos 12 meses. */
export const MAX_MESES_ATRASADOS = 12;

export type FijoParaGenerar = {
  id: string;
  comercio: string;
  importe: number;
  categoria_id: string | null;
  dia: number;
  activo: boolean;
  /** "YYYY-MM-01": último mes ya generado. */
  ultimo_mes: string;
};

/** Fila lista para insertar en `transactions`. */
export type FilaFijo = {
  tipo: "gasto";
  origen: "fijo";
  revisado: true;
  moneda: "EUR";
  importe: number;
  comercio: string;
  categoria_id: string | null;
  gasto_fijo_id: string;
  fecha: string;
};

const z2 = (n: number) => String(n).padStart(2, "0");
const indice = (mes: Mes) => mes.y * 12 + (mes.m - 1);
const deIndice = (i: number): Mes => ({ y: Math.floor(i / 12), m: (i % 12) + 1 });

export function primerDiaDeMes(mes: Mes): string {
  return `${mes.y}-${z2(mes.m)}-01`;
}

function mesDeFecha(fecha: string): Mes {
  const [y, m] = fecha.split("-").map(Number);
  return { y, m };
}

/** Día del cargo en ese mes: si el mes es más corto (31 en febrero), el último día. */
export function diaDeCargo(mes: Mes, dia: number): number {
  const diasDelMes = new Date(Date.UTC(mes.y, mes.m, 0)).getUTCDate();
  return Math.min(dia, diasDelMes);
}

/**
 * Movimientos que faltan de un fijo hasta `ahora` (hora de Madrid) y el nuevo `ultimo_mes`,
 * o null si no falta ninguno. Un mes cuenta desde las 00:00 de su día de cargo; el movimiento
 * se fecha ese día a las 12:00.
 */
export function generacionPendiente(
  fijo: FijoParaGenerar,
  ahora: Date,
): { filas: FilaFijo[]; ultimo_mes: string } | null {
  if (!fijo.activo) return null;
  const actual = indice(mesActual(ahora));
  const desde = Math.max(indice(mesDeFecha(fijo.ultimo_mes)) + 1, actual - (MAX_MESES_ATRASADOS - 1));

  const filas: FilaFijo[] = [];
  let ultimo: Mes | null = null;
  for (let i = desde; i <= actual; i++) {
    const mes = deIndice(i);
    const dia = `${mes.y}-${z2(mes.m)}-${z2(diaDeCargo(mes, fijo.dia))}`;
    if (ahora < horaLocalAUtc(`${dia}T00:00`)!) break;
    filas.push({
      tipo: "gasto",
      origen: "fijo",
      revisado: true,
      moneda: "EUR",
      importe: fijo.importe,
      comercio: fijo.comercio,
      categoria_id: fijo.categoria_id,
      gasto_fijo_id: fijo.id,
      fecha: horaLocalAUtc(`${dia}T12:00`)!.toISOString(),
    });
    ultimo = mes;
  }
  return ultimo ? { filas, ultimo_mes: primerDiaDeMes(ultimo) } : null;
}

/**
 * `ultimo_mes` al guardar un fijo. Al reactivarlo no se rellenan los meses en pausa: pasa al mes
 * anterior al actual, salvo que ya se hubiera generado este mes (entonces se queda, para no repetirlo).
 */
export function ultimoMesAlGuardar(antes: { activo: boolean; ultimo_mes: string }, activoAhora: boolean, ahora: Date): string {
  if (antes.activo || !activoAhora) return antes.ultimo_mes;
  const anterior = primerDiaDeMes(desplazarMes(mesActual(ahora), -1));
  return antes.ultimo_mes > anterior ? antes.ultimo_mes : anterior;
}

/** Cuántos fijos hay y cuánto suman al mes los activos. */
export function resumenFijos(fijos: { importe: number; activo: boolean }[]): { cuantos: number; alMes: number } {
  const alMes = fijos.filter((f) => f.activo).reduce((s, f) => s + Number(f.importe), 0);
  return { cuantos: fijos.length, alMes: Math.round(alMes * 100) / 100 };
}

/** Activos primero, por día del cargo y nombre; después los pausados, igual. */
export function ordenarFijos<T extends { activo: boolean; dia: number; comercio: string }>(fijos: T[]): T[] {
  return [...fijos].sort(
    (a, b) => Number(b.activo) - Number(a.activo) || a.dia - b.dia || a.comercio.localeCompare(b.comercio, "es"),
  );
}
