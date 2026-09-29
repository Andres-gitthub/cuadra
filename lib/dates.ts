// La app es de un único usuario en España: todas las fechas se muestran e interpretan en esta zona.
export const ZONA = "Europe/Madrid";

type Partes = { y: number; m: number; d: number; h: number; min: number };

function partesEnZona(fecha: Date): Partes {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONA,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(fecha)
      .map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute };
}

/** "2026-09-28T14:30" (hora de Madrid) → Date en UTC. */
export function horaLocalAUtc(local: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const supuesto = Date.UTC(y, mo - 1, d, h, mi);
  // Ajusta por el desfase de Madrid en ese instante (dos pasadas por el cambio de hora).
  let utc = supuesto;
  for (let i = 0; i < 2; i++) {
    const p = partesEnZona(new Date(utc));
    const desfase = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - utc;
    utc = supuesto - desfase;
  }
  return new Date(utc);
}

/** Date → "2026-09-28T14:30" en hora de Madrid, para <input type="datetime-local">. */
export function utcAHoraLocal(fecha: Date): string {
  const p = partesEnZona(fecha);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${z(p.m)}-${z(p.d)}T${z(p.h)}:${z(p.min)}`;
}

// ---------- Meses ----------

export type Mes = { y: number; m: number }; // m: 1..12

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const z2 = (n: number) => String(n).padStart(2, "0");

export function mesActual(ahora = new Date()): Mes {
  const p = partesEnZona(ahora);
  return { y: p.y, m: p.m };
}

/** "2026-08" → { y: 2026, m: 8 }. Si es inválido o futuro, devuelve el mes actual. */
export function parseMes(param: string | undefined, ahora = new Date()): Mes {
  const actual = mesActual(ahora);
  const m = param?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return actual;
  const mes = { y: Number(m[1]), m: Number(m[2]) };
  if (mes.m < 1 || mes.m > 12) return actual;
  if (mes.y * 12 + mes.m > actual.y * 12 + actual.m) return actual;
  return mes;
}

export function desplazarMes(mes: Mes, delta: number): Mes {
  const indice = mes.y * 12 + (mes.m - 1) + delta;
  return { y: Math.floor(indice / 12), m: (indice % 12) + 1 };
}

export function claveMes(mes: Mes): string {
  return `${mes.y}-${z2(mes.m)}`;
}

export function nombreMes(mes: Mes, conAño = true): string {
  return conAño ? `${MESES[mes.m - 1]} ${mes.y}` : MESES[mes.m - 1];
}

/** Inicio del mes y del siguiente (hora de Madrid) en UTC. */
export function rangoMes(mes: Mes): { desde: Date; hasta: Date } {
  const sig = desplazarMes(mes, 1);
  return {
    desde: horaLocalAUtc(`${mes.y}-${z2(mes.m)}-01T00:00`)!,
    hasta: horaLocalAUtc(`${sig.y}-${z2(sig.m)}-01T00:00`)!,
  };
}

// ---------- Días ----------

/** Fecha ISO → "2026-09-28" (día en hora de Madrid). */
export function claveDia(iso: string): string {
  const p = partesEnZona(new Date(iso));
  return `${p.y}-${z2(p.m)}-${z2(p.d)}`;
}

/** "2026-09-28" → "Hoy", "Ayer" o "lunes, 21 sept" (con año si no es el actual). */
export function etiquetaDia(clave: string, ahora = new Date()): string {
  const hoy = claveDia(ahora.toISOString());
  if (clave === hoy) return "Hoy";
  const ayer = claveDia(new Date(ahora.getTime() - 24 * 3600 * 1000).toISOString());
  if (clave === ayer) return "Ayer";
  const [y, m, d] = clave.split("-").map(Number);
  const diaSemana = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const año = y === mesActual(ahora).y ? "" : ` ${y}`;
  return `${diaSemana}, ${d} ${MESES_CORTOS[m - 1]}${año}`;
}

export function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatearImporte(n: number | null, moneda = "EUR"): string {
  if (n === null) return "¿? €";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: moneda }).format(n);
}

export function formatearHora(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
