import { claveDia, horaLocalAUtc, mesActual, type Mes } from "./dates.ts";
import { combinarNota } from "./reparto.ts";
import type { Categoria, Movimiento, TipoMovimiento } from "./types.ts";

// Datos inventados para la demo pública: nada sale de la base de datos ni de cuentas reales.
// Son deterministas: el mismo mes da siempre los mismos movimientos, para que las capturas se puedan repetir.

const NOMBRES = [
  "Supermercado",
  "Restaurantes",
  "Transporte",
  "Compras",
  "Suscripciones",
  "Hogar",
  "Salud",
  "Ocio",
  "Deporte",
] as const;
type NombreCategoria = (typeof NOMBRES)[number];

export const CATEGORIAS_DEMO: Categoria[] = NOMBRES.map((nombre) => ({ id: idCategoria(nombre), nombre }));

function idCategoria(nombre: NombreCategoria): string {
  return `demo-${nombre.toLowerCase()}`;
}

/** Gastos del día a día: cada día salen 0, 1 o 2, elegidos según su peso. */
const HABITUALES: { comercio: string; categoria: NombreCategoria; min: number; max: number; peso: number }[] = [
  { comercio: "Mercadona", categoria: "Supermercado", min: 18, max: 75, peso: 4 },
  { comercio: "Lidl", categoria: "Supermercado", min: 9, max: 42, peso: 2 },
  { comercio: "Bar La Esquina", categoria: "Restaurantes", min: 2.4, max: 9.5, peso: 3 },
  { comercio: "Telepizza", categoria: "Restaurantes", min: 14, max: 27, peso: 1 },
  { comercio: "Renfe", categoria: "Transporte", min: 3.1, max: 14.4, peso: 2 },
  { comercio: "Cabify", categoria: "Transporte", min: 7, max: 18, peso: 1 },
  { comercio: "Repsol", categoria: "Transporte", min: 40, max: 62, peso: 1 },
  { comercio: "Zara", categoria: "Compras", min: 19.95, max: 59.95, peso: 1 },
  { comercio: "Amazon", categoria: "Compras", min: 8.99, max: 44.9, peso: 1 },
  { comercio: "Farmacia Plaza", categoria: "Salud", min: 3.5, max: 21, peso: 1 },
  { comercio: "Cines Yelmo", categoria: "Ocio", min: 8.5, max: 17, peso: 1 },
  { comercio: "Leroy Merlin", categoria: "Hogar", min: 6, max: 48, peso: 1 },
];

type Fijo = {
  dia: number;
  hora: string;
  comercio: string;
  categoria: NombreCategoria;
  importe: number;
  origen: Movimiento["origen"];
  tipo?: TipoMovimiento;
  reparto?: { total: number; personas: number };
};

/** Lo que se repite cada mes. Lo que enseña devoluciones y repartos va en los primeros días para que se vea pronto. */
const FIJOS: Fijo[] = [
  { dia: 1, hora: "07:30", comercio: "Basic-Fit", categoria: "Deporte", importe: 29.99, origen: "sms" },
  { dia: 2, hora: "21:40", comercio: "Sushi Shop", categoria: "Restaurantes", importe: 54, origen: "wallet" },
  { dia: 3, hora: "10:25", comercio: "Bizum de Lucía", categoria: "Restaurantes", importe: 27, origen: "manual", tipo: "reembolso" },
  { dia: 4, hora: "06:00", comercio: "Netflix", categoria: "Suscripciones", importe: 12.99, origen: "sms" },
  {
    dia: 6,
    hora: "22:10",
    comercio: "La Tagliatella",
    categoria: "Restaurantes",
    importe: 24,
    origen: "manual",
    reparto: { total: 72, personas: 3 },
  },
  { dia: 10, hora: "09:00", comercio: "Iberdrola", categoria: "Hogar", importe: 48.2, origen: "sms" },
  { dia: 14, hora: "06:00", comercio: "Spotify", categoria: "Suscripciones", importe: 10.99, origen: "sms" },
  { dia: 20, hora: "19:15", comercio: "Pádel Club Norte", categoria: "Deporte", importe: 9, origen: "wallet" },
];

const z2 = (n: number) => String(n).padStart(2, "0");
const redondear = (n: number) => Math.round(n * 100) / 100;
const indiceMes = (mes: Mes) => mes.y * 12 + mes.m;

/** Números pseudoaleatorios repetibles a partir de una semilla (mulberry32). */
function aleatorio(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Texto como el que guardaría la ingesta real, con una tarjeta y un banco de ejemplo. */
function textoOriginal(origen: Movimiento["origen"], comercio: string, importe: number): string | null {
  const cifra = importe.toFixed(2).replace(".", ",");
  if (origen === "wallet") return `Wallet · Importe: ${cifra} € · Comercio: ${comercio} · Tarjeta: Tarjeta demo`;
  if (origen === "sms") return `BBVA: Compra con tu tarjeta ****1234 en ${comercio.toUpperCase()} por ${cifra} EUR`;
  return null;
}

/** Movimientos inventados de un mes, del más reciente al más antiguo. El mes en curso llega hasta `ahora`. */
export function movimientosDemo(mes: Mes, ahora = new Date()): Movimiento[] {
  const actual = mesActual(ahora);
  if (indiceMes(mes) > indiceMes(actual)) return [];
  const esActual = indiceMes(mes) === indiceMes(actual);
  const diasDelMes = new Date(Date.UTC(mes.y, mes.m, 0)).getUTCDate();
  const r = aleatorio(indiceMes(mes));
  const pesoTotal = HABITUALES.reduce((s, h) => s + h.peso, 0);

  const movs: Movimiento[] = [];
  const añadir = (dia: number, hora: string, datos: Partial<Movimiento> & Pick<Movimiento, "origen">) => {
    const fecha = horaLocalAUtc(`${mes.y}-${z2(mes.m)}-${z2(dia)}T${hora}`)!.toISOString();
    movs.push({
      id: `demo-${mes.y}-${z2(mes.m)}-${movs.length + 1}`,
      fecha,
      importe: null,
      moneda: "EUR",
      comercio: null,
      categoria_id: null,
      texto_original: null,
      revisado: true,
      tipo: "gasto",
      categories: null,
      ...datos,
    });
  };
  const deCategoria = (nombre: NombreCategoria) => ({ categoria_id: idCategoria(nombre), categories: { nombre } });

  for (let dia = 1; dia <= diasDelMes; dia++) {
    const cuantos = r() < 0.25 ? 0 : r() < 0.66 ? 1 : 2;
    for (let i = 0; i < cuantos; i++) {
      let elegido = r() * pesoTotal;
      const h = HABITUALES.find((x) => (elegido -= x.peso) < 0) ?? HABITUALES[0];
      const importe = redondear(h.min + r() * (h.max - h.min));
      const origen = r() < 0.6 ? "wallet" : "sms";
      const hora = `${z2(8 + Math.floor(r() * 14))}:${z2(Math.floor(r() * 60))}`;
      añadir(dia, hora, {
        importe,
        comercio: h.comercio,
        origen,
        texto_original: textoOriginal(origen, h.comercio, importe),
        ...deCategoria(h.categoria),
      });
    }
  }

  for (const f of FIJOS) {
    if (f.dia > diasDelMes) continue;
    añadir(f.dia, f.hora, {
      importe: f.importe,
      comercio: f.comercio,
      origen: f.origen,
      tipo: f.tipo ?? "gasto",
      texto_original: f.reparto ? combinarNota(null, f.reparto) : textoOriginal(f.origen, f.comercio, f.importe),
      ...deCategoria(f.categoria),
    });
  }

  if (esActual) {
    // Dos SMS que no se pudieron leer con seguridad, como los que acaban en Pendientes.
    const hoy = Number(claveDia(ahora.toISOString()).slice(8));
    añadir(Math.max(1, hoy - 1), "09:12", {
      importe: 30,
      origen: "sms",
      revisado: false,
      texto_original: "BBVA: Cargo en cuenta de 30,00 EUR. Recibo domiciliado.",
    });
    añadir(hoy, "08:05", {
      comercio: "AMAZON",
      origen: "sms",
      revisado: false,
      texto_original: "BBVA: Se ha realizado una compra con tu tarjeta en AMAZON. Consulta el detalle en la app.",
    });
  }

  const limite = esActual ? ahora.getTime() : Infinity;
  return movs
    .filter((m) => new Date(m.fecha).getTime() <= limite)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

/** Movimientos sin revisar de la demo: solo los del mes en curso. */
export function pendientesDemo(ahora = new Date()): Movimiento[] {
  return movimientosDemo(mesActual(ahora), ahora).filter((m) => !m.revisado);
}
