import { claveDia, etiquetaDia, formatearImporte } from "./dates.ts";

type ConImporte = { importe: number | null; tipo?: string | null };
type ConCategoria = ConImporte & { categoria_id: string | null; categories: { nombre: string } | null };

const redondear = (n: number) => Math.round(n * 100) / 100;

/** +importe para un gasto, −importe para una devolución; 0 si no tiene importe (pendiente sin leer). */
function neto(m: ConImporte): number {
  if (m.importe === null) return 0;
  return m.tipo === "reembolso" ? -m.importe : m.importe;
}

/** Gasto neto: gastos menos devoluciones. Los movimientos sin importe no cuentan. */
export function totalImportes(movs: ConImporte[]): number {
  return redondear(movs.reduce((s, m) => s + neto(m), 0));
}

export type LineaDesglose = { id: string | null; nombre: string; total: number; pct: number };

/**
 * Gasto neto por categoría, de mayor a menor. El porcentaje se calcula sobre las categorías con
 * neto positivo; una categoría que queda en cero o negativa (te devolvieron más de lo gastado ese mes) lleva 0 %.
 */
export function desglosePorCategoria(movs: ConCategoria[]): LineaDesglose[] {
  const porCategoria = new Map<string | null, { nombre: string; total: number }>();
  for (const m of movs) {
    if (m.importe === null) continue;
    const linea = porCategoria.get(m.categoria_id) ?? { nombre: m.categories?.nombre ?? "Sin categoría", total: 0 };
    linea.total += neto(m);
    porCategoria.set(m.categoria_id, linea);
  }
  const positivo = [...porCategoria.values()].reduce((s, l) => s + Math.max(l.total, 0), 0);
  return [...porCategoria.entries()]
    .map(([id, l]) => ({
      id,
      nombre: l.nombre,
      total: redondear(l.total),
      pct: l.total > 0 && positivo > 0 ? Math.round((l.total / positivo) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** "3 gastos y 1 devolución, 12,00 € menos que en agosto". Solo cuentan los gastos con importe. */
export function lineaResumen(movs: ConImporte[], total: number, totalAnterior: number, mesAnterior: string): string {
  const gastos = movs.filter((m) => m.tipo !== "reembolso" && m.importe !== null).length;
  const devoluciones = movs.filter((m) => m.tipo === "reembolso").length;
  let cuantos = `${gastos} ${gastos === 1 ? "gasto" : "gastos"}`;
  if (devoluciones > 0) cuantos += ` y ${devoluciones} ${devoluciones === 1 ? "devolución" : "devoluciones"}`;
  if (totalAnterior <= 0) return cuantos;
  const diferencia = redondear(total - totalAnterior);
  if (diferencia === 0) return `${cuantos}, igual que en ${mesAnterior}`;
  return `${cuantos}, ${formatearImporte(Math.abs(diferencia))} ${diferencia < 0 ? "menos" : "más"} que en ${mesAnterior}`;
}

export type GrupoDia<T> = { clave: string; etiqueta: string; total: number; movimientos: T[] };

/** Agrupa movimientos (ya ordenados por fecha) por día en hora de Madrid. */
export function agruparPorDia<T extends ConImporte & { fecha: string }>(movs: T[], ahora = new Date()): GrupoDia<T>[] {
  const grupos: GrupoDia<T>[] = [];
  for (const m of movs) {
    const clave = claveDia(m.fecha);
    let grupo = grupos.at(-1);
    if (!grupo || grupo.clave !== clave) {
      grupo = { clave, etiqueta: etiquetaDia(clave, ahora), total: 0, movimientos: [] };
      grupos.push(grupo);
    }
    grupo.movimientos.push(m);
  }
  for (const g of grupos) g.total = totalImportes(g.movimientos);
  return grupos;
}
