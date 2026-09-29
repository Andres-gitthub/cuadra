import { claveDia, etiquetaDia } from "./dates.ts";

type ConImporte = { importe: number | null };
type ConCategoria = ConImporte & { categoria_id: string | null; categories: { nombre: string } | null };

const redondear = (n: number) => Math.round(n * 100) / 100;

/** Suma de importes; los movimientos sin importe (pendientes sin leer) no cuentan. */
export function totalImportes(movs: ConImporte[]): number {
  return redondear(movs.reduce((s, m) => s + (m.importe ?? 0), 0));
}

export type LineaDesglose = { id: string | null; nombre: string; total: number; pct: number };

/** Gasto por categoría, de mayor a menor, con su porcentaje sobre el total. */
export function desglosePorCategoria(movs: ConCategoria[]): LineaDesglose[] {
  const porCategoria = new Map<string | null, { nombre: string; total: number }>();
  for (const m of movs) {
    if (m.importe === null) continue;
    const linea = porCategoria.get(m.categoria_id) ?? { nombre: m.categories?.nombre ?? "Sin categoría", total: 0 };
    linea.total += m.importe;
    porCategoria.set(m.categoria_id, linea);
  }
  const total = totalImportes(movs);
  return [...porCategoria.entries()]
    .map(([id, l]) => ({ id, nombre: l.nombre, total: redondear(l.total), pct: total > 0 ? Math.round((l.total / total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
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
