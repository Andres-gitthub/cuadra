// Service worker mínimo: hace la app instalable y muestra un aviso si no hay conexión.
// No guarda en caché datos de movimientos (son privados y cambian constantemente).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const OFFLINE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title></head>
<body style="font-family:-apple-system,sans-serif;padding:48px 24px;text-align:center;color:#1c1917;background:#f5f5f4">
<h1 style="font-size:1.3rem">Sin conexión</h1><p>Conéctate a internet y vuelve a abrir la app.</p></body></html>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
