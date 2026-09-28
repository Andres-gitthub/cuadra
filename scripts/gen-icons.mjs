// Genera los iconos PNG de la PWA sin dependencias (solo zlib de Node).
// Uso: npm run icons
import { deflateSync, crc32 } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const FONDO = [15, 118, 110]; // #0f766e
const BLANCO = [255, 255, 255];
const MUESTRAS = 4; // antialiasing: 4x4 muestras por píxel

// Símbolo "€" dibujado con formas simples (coordenadas normalizadas 0..1).
function esBlanco(x, y) {
  const dx = x - 0.54;
  const dy = y - 0.5;
  const r = Math.hypot(dx, dy);
  const angulo = (Math.atan2(dy, dx) * 180) / Math.PI;
  const arco = r > 0.2 && r < 0.28 && Math.abs(angulo) > 45; // "C" abierta a la derecha
  const barra = (y0) => y > y0 && y < y0 + 0.055 && x > 0.18 && x < 0.56;
  return arco || barra(0.41) || barra(0.535);
}

function png(tamaño) {
  const filas = [];
  for (let py = 0; py < tamaño; py++) {
    const fila = Buffer.alloc(1 + tamaño * 3); // byte de filtro 0 + RGB
    for (let px = 0; px < tamaño; px++) {
      let blancos = 0;
      for (let sy = 0; sy < MUESTRAS; sy++)
        for (let sx = 0; sx < MUESTRAS; sx++)
          if (esBlanco((px + (sx + 0.5) / MUESTRAS) / tamaño, (py + (sy + 0.5) / MUESTRAS) / tamaño)) blancos++;
      const a = blancos / (MUESTRAS * MUESTRAS);
      for (let c = 0; c < 3; c++) fila[1 + px * 3 + c] = Math.round(FONDO[c] * (1 - a) + BLANCO[c] * a);
    }
    filas.push(fila);
  }

  const chunk = (tipo, datos) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(datos.length);
    const td = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamaño, 0);
  ihdr.writeUInt32BE(tamaño, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(filas))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
for (const [nombre, tamaño] of [
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
]) {
  writeFileSync(`public/icons/${nombre}`, png(tamaño));
  console.log(`public/icons/${nombre} (${tamaño}x${tamaño})`);
}
