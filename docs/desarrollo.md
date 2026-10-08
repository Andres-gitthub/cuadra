# Cuadra: notas de desarrollo

Cómo está montado por dentro y las decisiones que conviene recordar. Para ponerlo en marcha desde cero, con los Atajos del iPhone: [SETUP.md](../SETUP.md).

## Qué hay dentro

| Pantalla | Qué hace |
| --- | --- |
| **Inicio** | Total del mes, diferencia con el mes anterior, desglose por categoría (tocar una filtra la lista) y movimientos por día. Deslizar una fila a la izquierda la borra. |
| **Estadísticas** | Media diaria, gasto de cada día frente a la media, previsión a fin de mes, comercios con más gasto y categorías frente al mes anterior. |
| **Pendientes** | Lo que llegó de Apple Pay o del SMS y no se pudo leer con seguridad, con el texto original. |
| **Añadir / Editar** | Gasto o "Me devuelven", repartir entre varias personas y "Recordar" la categoría de un comercio. |
| **Demo** (`/demo`) | Las mismas pantallas con datos inventados, sin sesión y sin guardar nada. |

## Cómo está montado

```
app/
  page.tsx, estadisticas/, pendientes/, movimiento/
                      Páginas con sesión: leen de Supabase y pasan los datos a su vista
  vistas/             Las pantallas como vistas puras: no consultan nada
  demo/               Las mismas vistas con lib/demo.ts. Pública y sin Supabase
  actions.ts          Server actions: login con código, guardar, borrar y cerrar sesión
  api/ingest/         Entrada de los Atajos (Apple Pay y SMS), con token
  login/, auth/       Login con código de 6 dígitos (y enlace, si se abre en Safari)
  globals.css         Todos los estilos y los colores, en variables
lib/
  sms-parser.ts       Importe y comercio de un SMS del banco, sin inventar nada
  amount.ts           Importes en texto a número; null si es ambiguo
  ingest-input.ts     Valida y normaliza lo que manda el Atajo
  ingest-auth.ts      Comprueba el token en tiempo constante
  ingest.ts           Guarda, descarta duplicados (±2 min) y categoriza
  categorize.ts       Categoría por palabras clave: gana la más larga
  aprender.ts         "Recordar": mueve la palabra clave y corrige los gastos anteriores
  reparto.ts          Repartir entre N personas y la nota del total
  resumen.ts          Totales netos, desglose por categoría y agrupación por días
  estadisticas.ts     Ritmo, previsión, gasto por día, comercios y comparativa
  categorias-ui.ts    Color e icono de cada categoría
  dates.ts            Fechas y meses, siempre en hora de Madrid
  rutas.ts            Rutas seguras para volver y rutas de la demo
  demo.ts             Datos inventados y repetibles para la demo
  supabase/           Cliente con sesión (server.ts) y cliente admin solo para la ingesta (admin.ts)
supabase/
  migrations/         El esquema, en orden. Se ejecutan a mano en el SQL Editor
  seed.sql            Categorías iniciales
tests/                Tests de los módulos de lib/, con node:test
docs/
  screenshots/        Capturas del README, sacadas de /demo
  superpowers/        Especificaciones y planes de las funciones grandes
```

## Comandos

```bash
npm run dev      # desarrollo en localhost:3000
npm run build    # compilación de producción
npm test         # tests de lib/ con node:test, sin base de datos
npm run icons    # regenera los iconos de la app
```

## Decisiones que conviene recordar

**Una sola persona.** No hay registro: la ingesta guarda siempre para `OWNER_USER_ID`, el registro está desactivado en Supabase y cada tabla tiene RLS (`user_id = auth.uid()`). El rol `anon` no tiene permisos sobre ninguna tabla.

**No inventar datos.** Si el SMS es dudoso (dos importes, otra moneda, un código de verificación, un ingreso) se guarda lo seguro y el resto queda en Pendientes con el texto original. `amount.ts` devuelve `null` ante formatos ambiguos como `1,234`.

**Las devoluciones restan.** Un movimiento de tipo `reembolso` resta del total del mes y de su categoría. Un gasto repartido guarda solo tu parte, y la nota "Pagado X entre N" va en la primera línea de `texto_original`, junto a lo que llegó de Apple Pay o del SMS.

**Pantallas = datos + vista.** Las páginas solo leen; las vistas de `app/vistas/` reciben los datos y una `base` (`""` en la app, `"/demo"` en la demo) para que todos los enlaces se queden en su sitio. En la demo, guardar, borrar y descartar solo muestran un aviso: el formulario no tiene acción.

**La demo es la única ruta pública** además del login. El proxy la reconoce con `esRutaDemo` y sus páginas usan `connection()` para generarse en cada visita, porque los datos dependen de la fecha de hoy.

**Hora de Madrid.** Días, meses y horas se calculan en `Europe/Madrid` (`lib/dates.ts`), esté donde esté el servidor.

**El service worker no guarda datos.** Solo hace la app instalable y muestra una página sin conexión. Los movimientos no se cachean nunca.

**Migraciones a mano.** Cada cambio de esquema es un archivo nuevo en `supabase/migrations/` que se puede ejecutar varias veces. Hay que pegarlo en el SQL Editor de Supabase; el código no lo aplica solo.
