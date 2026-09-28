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

/** Inicio del mes actual y del siguiente (hora de Madrid) en UTC. */
export function rangoMesActual(ahora = new Date()): { desde: Date; hasta: Date; nombre: string } {
  const p = partesEnZona(ahora);
  const sigY = p.m === 12 ? p.y + 1 : p.y;
  const sigM = p.m === 12 ? 1 : p.m + 1;
  const z = (n: number) => String(n).padStart(2, "0");
  const nombre = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, month: "long", year: "numeric" }).format(ahora);
  return {
    desde: horaLocalAUtc(`${p.y}-${z(p.m)}-01T00:00`)!,
    hasta: horaLocalAUtc(`${sigY}-${z(sigM)}-01T00:00`)!,
    nombre,
  };
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
