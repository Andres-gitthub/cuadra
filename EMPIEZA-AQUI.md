# Empieza aquí

Cuadra es una app de gastos que se rellena sola: los pagos con Apple Pay y los SMS del banco se registran automáticamente. Es de **un solo usuario**, así que cada persona monta **su propia copia** (su base de datos y su web). Es gratis y se tarda unos 45 minutos.

## Antes de empezar

- Un **iPhone** (los Atajos de iOS son lo que captura los gastos; sin él solo podrías añadirlos a mano).
- Un ordenador, para seguir los pasos.
- Cuentas gratuitas en **GitHub**, **Supabase** y **Vercel**.
- Un **Gmail personal** (para el código de acceso por email).

## Los 4 pasos

1. **Copia el código.** En GitHub, abre el repositorio y pulsa **Fork** para tener tu copia.
2. **Sigue [SETUP.md](SETUP.md) en orden.** Ahí está todo:
   1. Crear tu base de datos en Supabase (tablas, tu usuario, categorías).
   2. Generar tu token secreto.
   3. Publicar la app en Vercel con las 5 variables de entorno.
   4. Instalarla en el iPhone (Safari → Compartir → *Añadir a pantalla de inicio*).
   5. Crear los dos Atajos: Apple Pay y SMS del banco.
3. **Prueba que funciona** (paso 7 de SETUP.md): haz un pago pequeño o manda un SMS de prueba y mira si aparece en Inicio.
4. **Ajusta las categorías** en Supabase → Table Editor → `categories`, columna `palabras_clave` (en minúsculas). Si el nombre del comercio contiene una de esas palabras, el gasto va a esa categoría.

## Usar Claude para que te guíe

Abre Claude, pásale este repositorio y `SETUP.md`, y pídele: *"Guíame paso a paso con SETUP.md, un paso cada vez, y espera a que te diga que lo he hecho."* Las cuentas y los clics los haces tú.

## Tres cosas importantes

- **Secretos:** las claves y el token solo se pegan en Vercel (o en `.env.local`). Nunca en GitHub, ni en capturas, ni en un chat.
- **No uses los datos de otra persona:** tu Supabase, tu token y tu `OWNER_USER_ID` son solo tuyos.
- **Actualizaciones:** si el proyecto original añade migraciones nuevas (`supabase/migrations/0004_…`), ejecútalas en el SQL Editor de tu Supabase, en orden.

## ¿Te quedas atascada?

Dile a Claude en qué paso estás y copia el mensaje de error (sin claves). Casi siempre es una variable de entorno mal pegada en Vercel.
