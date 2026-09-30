import { claveDia, claveMes, mesActual, type Mes } from "./dates.ts";
import { desglosePorCategoria } from "./resumen.ts";

const redondear = (n: number) => Math.round(n * 100) / 100;

export type Ritmo = { mediaDiaria: number; diasContados: number; diasDelMes: number; prevision: number | null };

/** Media diaria del mes y, si es el mes en curso, previsión a fin de mes al mismo ritmo. */
export function ritmoDelMes(total: number, mes: Mes, ahora = new Date()): Ritmo {
  const diasDelMes = new Date(Date.UTC(mes.y, mes.m, 0)).getUTCDate();
  const esActual = claveMes(mes) === claveMes(mesActual(ahora));
  const diasContados = esActual ? Number(claveDia(ahora.toISOString()).slice(8)) : diasDelMes;
  const media = total / diasContados;
  return {
    mediaDiaria: redondear(media),
    diasContados,
    diasDelMes,
    prevision: esActual && total > 0 ? redondear(media * diasDelMes) : null,
  };
}

export type LineaComercio = { nombre: string; compras: number; total: number };

const normalizar = (s: string) => s.trim().replace(/\s+/g, " ");

/** Comercios con más gasto (sin devoluciones). Agrupa sin distinguir mayúsculas/espacios y muestra el nombre más repetido. */
export function topComercios(
  movs: { comercio: string | null; importe: number | null; tipo?: string | null }[],
  n = 8,
): LineaComercio[] {
  const grupos = new Map<string, { nombres: Map<string, number>; compras: number; total: number }>();
  for (const m of movs) {
    if (m.importe === null || m.tipo === "reembolso" || !m.comercio || !normalizar(m.comercio)) continue;
    const nombre = normalizar(m.comercio);
    const clave = nombre.toLowerCase();
    const g = grupos.get(clave) ?? { nombres: new Map(), compras: 0, total: 0 };
    g.nombres.set(nombre, (g.nombres.get(nombre) ?? 0) + 1);
    g.compras += 1;
    g.total += m.importe;
    grupos.set(clave, g);
  }
  return [...grupos.values()]
    .map((g) => ({
      nombre: [...g.nombres.entries()].sort((a, b) => b[1] - a[1])[0][0],
      compras: g.compras,
      total: redondear(g.total),
    }))
    .sort((a, b) => b.total - a.total || b.compras - a.compras)
    .slice(0, n);
}

type MovCategoria = { importe: number | null; categoria_id: string | null; categories: { nombre: string } | null };
export type LineaComparativa = { id: string | null; nombre: string; actual: number; anterior: number; diferencia: number };

/** Gasto por categoría este mes frente al anterior, de mayor a menor cambio. */
export function comparativaCategorias(actual: MovCategoria[], anterior: MovCategoria[]): LineaComparativa[] {
  const lineas = new Map<string | null, LineaComparativa>();
  for (const l of desglosePorCategoria(anterior)) {
    lineas.set(l.id, { id: l.id, nombre: l.nombre, actual: 0, anterior: l.total, diferencia: 0 });
  }
  for (const l of desglosePorCategoria(actual)) {
    const previa = lineas.get(l.id);
    lineas.set(l.id, { id: l.id, nombre: l.nombre, actual: l.total, anterior: previa?.anterior ?? 0, diferencia: 0 });
  }
  return [...lineas.values()]
    .map((l) => ({ ...l, diferencia: redondear(l.actual - l.anterior) }))
    .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia) || a.nombre.localeCompare(b.nombre, "es"));
}
