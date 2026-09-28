# Guía de configuración

Esta guía te lleva desde cero hasta tener la app instalada en el iPhone y recibiendo gastos automáticamente.
Todo usa planes gratuitos. Tiempo aproximado: 45 minutos.

**Qué vas a hacer:**

1. [Crear la base de datos en Supabase](#1-supabase-base-de-datos-y-login)
2. [Generar tu token secreto](#2-generar-el-token-secreto-ingest_token)
3. [Publicar la app en Vercel](#3-vercel-publicar-la-app)
4. [Instalar la app en el iPhone](#4-instalar-la-app-en-el-iphone)
5. [Crear el Atajo de Apple Pay (Wallet)](#5-atajo-1-gastos-con-apple-pay-wallet)
6. [Crear el Atajo de SMS del banco](#6-atajo-2-sms-del-banco)
7. [Comprobar que todo funciona](#7-comprobar-que-todo-funciona)

> ⚠️ **Secretos:** los valores de las claves y del token **solo** se pegan en Vercel (y, si programas en tu ordenador, en `.env.local`). Nunca en el código, en GitHub ni en capturas de pantalla.

---

## Variables de entorno

La app necesita estas 5 variables. Irás apuntando sus valores durante la guía:

| Nombre | Qué es | Dónde se obtiene |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Dirección de tu proyecto Supabase | Paso 1.7 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon / publishable) | Paso 1.7 |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta (service_role / secret). **Muy sensible** | Paso 1.7 |
| `OWNER_USER_ID` | El identificador (UID) de tu usuario | Paso 1.3 |
| `INGEST_TOKEN` | Contraseña larga que usarán los Atajos | Paso 2 |

---

## 1. Supabase (base de datos y login)

### 1.1 Crear el proyecto
1. Entra en <https://supabase.com> → **Start your project** → regístrate (con GitHub o email).
2. **New project**.
   - **Name:** `cuadra`
   - **Database Password:** pulsa **Generate a password** y guárdala en tu gestor de contraseñas (no la necesitará la app).
   - **Region:** una de Europa (p. ej. *Central EU (Frankfurt)*).
   - Plan **Free**.
3. **Create new project** y espera 1–2 minutos.

### 1.2 Crear las tablas
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abre el archivo `supabase/migrations/0001_init.sql` de este proyecto, copia **todo** su contenido y pégalo.
3. Pulsa **Run**. Debe aparecer *Success. No rows returned*.
4. Comprueba en **Table Editor** que existen las tablas `transactions` y `categories`.

### 1.3 Crear tu usuario (el único que podrá entrar)
1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Escribe tu email, pon cualquier contraseña larga (no la usarás) y marca **Auto Confirm User**.
3. **Create user**.
4. Pulsa sobre tu usuario en la lista y copia el **User UID** (algo como `3f1c…-…`). 👉 Es tu `OWNER_USER_ID`.

### 1.4 Crear las categorías iniciales
1. **SQL Editor** → **New query**.
2. Pega el contenido de `supabase/seed.sql`.
3. En la línea `where email = 'TU_EMAIL@ejemplo.com'` cambia el email por el tuyo (el mismo del paso 1.3).
4. **Run** → *Success*.
5. En **Table Editor → categories** verás 8 categorías. Puedes editar la columna `palabras_clave` cuando quieras: si el nombre del comercio contiene alguna de esas palabras, el gasto se asigna a esa categoría. Escríbelas en minúsculas.

### 1.5 Impedir que otras personas se registren
1. **Authentication** → **Sign In / Providers** (en algunas versiones: **Providers → Email**).
2. Desactiva **Allow new users to sign up** y guarda.
   (La app ya lo impide, esto es una segunda barrera.)

### 1.6 Email de acceso (enlace + código)
En el iPhone, la app instalada y Safari no comparten la sesión: si pulsas el enlace del email se abre Safari, no la app. Por eso el email llevará también un **código** que escribirás dentro de la app.

1. **Authentication** → **Emails** (o **Email Templates**) → plantilla **Magic Link**.
2. **Subject:** `Tu acceso a Cuadra`
3. Sustituye el cuerpo (**Body / Message**) por:

   ```html
   <h2>Acceso a Cuadra</h2>
   <p>Tu código: <strong style="font-size:24px">{{ .Token }}</strong></p>
   <p>Si estás en Safari (no en la app instalada), también puedes pulsar:
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Entrar</a></p>
   ```
4. **Save**.

> ℹ️ El plan gratuito de Supabase envía pocos emails por hora (unos 2–4). Si pides varios seguidos y no llegan, espera un rato.

### 1.7 Copiar las claves
1. **Project Settings** (rueda dentada) → **Data API**: copia la **Project URL** → 👉 `NEXT_PUBLIC_SUPABASE_URL`.
2. **Project Settings** → **API Keys**:
   - La clave **anon public** (o **publishable**, empieza por `sb_publishable_`) → 👉 `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - La clave **service_role** (o **secret**, empieza por `sb_secret_`) → 👉 `SUPABASE_SERVICE_ROLE_KEY`. **No la compartas con nadie**: da acceso total a tu base de datos.

La URL del sitio (Site URL) se configura en el paso 3.4, cuando ya tengas la dirección de Vercel.

---

## 2. Generar el token secreto (`INGEST_TOKEN`)

Es la contraseña que los Atajos envían en cada gasto. Debe ser larga y aleatoria.

- **En un ordenador con Node.js**, ejecuta en la terminal:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Sin ordenador:** usa el generador de contraseñas de tu gestor (o de *Ajustes → Contraseñas* en el iPhone) con al menos 40 caracteres, **solo letras y números**.

Guárdalo en tu gestor de contraseñas. 👉 Es tu `INGEST_TOKEN`.

---

## 3. Vercel (publicar la app)

### 3.1 Subir el código a GitHub
1. Crea una cuenta en <https://github.com> si no tienes.
2. **New repository** → nombre `cuadra` → marca **Private** → **Create repository**.
3. Sube el código de esta carpeta. La forma más sencilla, desde la terminal y dentro de la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Cuadra: primera versión"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/cuadra.git
   git push -u origin main
   ```
   El archivo `.gitignore` ya evita que se suban `.env.local` y `node_modules`.

### 3.2 Crear el proyecto en Vercel
1. Entra en <https://vercel.com> → **Sign Up** → **Continue with GitHub** (plan **Hobby**, gratuito).
2. **Add New… → Project** → importa el repositorio `cuadra`.
3. Framework: **Next.js** (se detecta solo). No cambies los comandos de build.

### 3.3 Añadir las variables de entorno
Antes de pulsar Deploy, abre **Environment Variables** y añade las 5, una a una (nombre exacto + valor):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OWNER_USER_ID
INGEST_TOKEN
```

Pulsa **Deploy** y espera 1–2 minutos. Tu app quedará en una dirección como `https://cuadra-xxxx.vercel.app`. 👉 Apúntala: la llamaremos **TU_URL**.

> Si más adelante cambias una variable: **Settings → Environment Variables**, edítala y luego **Deployments → ⋯ → Redeploy** (las variables `NEXT_PUBLIC_…` solo se aplican al volver a desplegar).

### 3.4 Decirle a Supabase cuál es tu URL
1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** `TU_URL` (p. ej. `https://cuadra-xxxx.vercel.app`, sin barra final).
3. **Redirect URLs** → **Add URL**: `TU_URL/**`. Si vas a probar en local, añade también `http://localhost:3000/**`.
4. **Save**.

---

## 4. Instalar la app en el iPhone

1. Abre **Safari** (tiene que ser Safari) y ve a `TU_URL`.
2. Botón **Compartir** (cuadrado con flecha hacia arriba) → **Añadir a pantalla de inicio** → **Añadir**.
3. Abre la app **Cuadra** desde la pantalla de inicio (no desde Safari).
4. Escribe tu email → **Enviarme el acceso**.
5. Abre el email y **escribe el código** en la app → **Entrar**. (No pulses el enlace: abriría Safari.)
6. Verás el total del mes (0 €) y la lista vacía. Pulsa **+** para probar a añadir un gasto.

La sesión se mantiene: no tendrás que volver a entrar salvo que pulses **Salir**.

---

## 5. Atajo 1: gastos con Apple Pay (Wallet)

Se ejecuta automáticamente cada vez que pagas con una tarjeta de Apple Wallet.

> Los nombres de los menús pueden variar un poco según la versión de iOS (esta guía sigue iOS 17/18).

### 5.1 Crear la automatización
1. Abre la app **Atajos** → pestaña **Automatización** (abajo).
2. Pulsa **Nueva automatización** (o **+** arriba a la derecha).
3. Busca y elige **Transacción** (icono de Wallet).
4. Configura:
   - **Tarjeta:** marca las tarjetas que quieras registrar.
   - **Categoría / Comercio:** déjalo en **Cualquiera**.
   - Selecciona **Ejecutar inmediatamente** y **desactiva** *Notificar al ejecutar*.
5. **Siguiente** → **Nuevo atajo en blanco** (o *Crear atajo nuevo*).

### 5.2 Añadir la acción "Obtener contenido de URL"
1. En la barra de búsqueda de acciones (abajo), escribe **Obtener contenido de URL** y pulsa sobre ella.
2. En la acción, pulsa el texto azul **URL** y escribe:
   ```
   TU_URL/api/ingest
   ```
   (p. ej. `https://cuadra-xxxx.vercel.app/api/ingest`)
3. Pulsa la flecha **›** (o **Mostrar más**) de la acción para ver las opciones.
4. **Método:** cambia `GET` por **POST**.
5. **Cabeceras** → **Añadir nueva cabecera**:
   - **Clave:** `Authorization`
   - **Texto:** `Bearer ` seguido de tu token, **con un espacio después de Bearer**. Ejemplo: `Bearer 4f9a…`
6. **Cuerpo de la solicitud:** elige **JSON**.
7. Pulsa **Añadir nuevo campo** 4 veces, eligiendo cada vez el tipo **Texto**:

   | Clave | Valor |
   |---|---|
   | `source` | escribe `wallet` |
   | `amount` | pulsa en el valor → **Seleccionar variable** → toca **Entrada de atajo** → en el menú de propiedades elige **Importe** |
   | `merchant` | igual, pero elige **Comercio** |
   | `card` | igual, pero elige **Tarjeta** (o **Tarjeta o pase**) |

   Para cambiar la propiedad de la variable: toca la burbuja **Entrada de atajo** que acabas de insertar y elige la propiedad en la lista que aparece.
8. Pulsa **OK** / **Listo** arriba a la derecha.

✅ Listo: el próximo pago con Apple Pay aparecerá en la app en unos segundos.

---

## 6. Atajo 2: SMS del banco

Se ejecuta cuando te llega un SMS de tu banco. El servidor lee el texto y extrae el importe y el comercio. Si no puede hacerlo con seguridad, guarda el SMS en **Pendientes de revisar**, sin inventar datos.

### 6.1 Crear la automatización
1. **Atajos** → **Automatización** → **Nueva automatización** (o **+**).
2. Elige **Mensaje**.
3. Configura:
   - **Remitente:** pulsa **Elegir** y selecciona el contacto del banco. (Si el SMS viene de un nombre como "BBVA" o de un número corto y no lo tienes como contacto, guárdalo primero como contacto desde la app Mensajes.)
   - **El mensaje contiene:** escribe `EUR`. Si tu banco usa el símbolo, crea otra automatización igual con `€`. Así se ignoran los SMS sin importes.
   - Selecciona **Ejecutar inmediatamente** y **desactiva** *Notificar al ejecutar*.
4. **Siguiente** → **Nuevo atajo en blanco**.

### 6.2 Añadir la acción "Obtener contenido de URL"
Igual que en el paso 5.2 (misma URL, **Método POST**, misma cabecera `Authorization` con `Bearer TU_TOKEN`, **Cuerpo de la solicitud: JSON**), pero con **solo 2 campos** de tipo **Texto**:

| Clave | Valor |
|---|---|
| `source` | escribe `sms` |
| `text` | **Seleccionar variable** → **Entrada de atajo** → propiedad **Contenido** (el texto del mensaje) |

Pulsa **OK** / **Listo**.

### Sobre duplicados
Si pagas con Apple Pay **y** tu banco además te manda un SMS, la app descarta el segundo si tiene **el mismo importe y el mismo comercio con menos de 2 minutos de diferencia**. Pero Wallet y el banco a veces escriben el comercio de forma distinta (p. ej. `Mercadona` frente a `MERCADONA VALENCIA`), y entonces verás el gasto dos veces y tendrás que borrar uno. Para evitarlo, lo más sencillo es usar el Atajo de SMS solo para las tarjetas que **no** tienes en Apple Wallet.

---

## 7. Comprobar que todo funciona

### Desde un ordenador (curl)
Sustituye `TU_URL` y `TU_TOKEN`:

```bash
curl -i -X POST TU_URL/api/ingest -H "Authorization: Bearer TU_TOKEN" -H "Content-Type: application/json" -d '{"source":"wallet","amount":"12,34 €","merchant":"Mercadona","card":"Prueba"}'
```
Respuesta esperada: `HTTP/2 201` y `{"ok":true,"id":"…","importe":12.34,"comercio":"Mercadona","revisado":true}`.

Sin token debe devolver **401**:
```bash
curl -i -X POST TU_URL/api/ingest -H "Content-Type: application/json" -d '{"source":"sms","text":"x"}'
```

Un SMS de prueba:
```bash
curl -i -X POST TU_URL/api/ingest -H "Authorization: Bearer TU_TOKEN" -H "Content-Type: application/json" -d '{"source":"sms","text":"BBVA: Compra con tu tarjeta ****1234 en MERCADONA por 23,45 EUR"}'
```

### Desde el iPhone
En la app **Atajos**, pestaña **Automatización**, abre la automatización de **Transacción** y pulsa el botón ▶︎ (reproducir) del atajo. Como no hay un pago real, el gasto llegará vacío y aparecerá en **Pendientes de revisar**: eso confirma que la conexión y el token funcionan. Puedes borrarlo desde la app.
(La del SMS no se puede probar así: sin mensaje no hay texto y el servidor responde 400. Pruébala con el `curl` de SMS de arriba o esperando a un SMS real.)

### Qué significan las respuestas del servidor
| Código | Significado |
|---|---|
| 201 | Gasto guardado |
| 200 + `"duplicate": true` | Ya existía (mismo importe y comercio en ±2 min); no se guarda otra vez |
| 400 | El JSON está mal (revisa las claves `source`, `amount`, `merchant`, `text`) |
| 401 | Token incorrecto o sin `Bearer ` delante |
| 500 | Falta alguna variable de entorno en Vercel o la base de datos no está creada. Mira **Vercel → Logs** |

---

## Programar en tu ordenador (opcional)

```bash
npm install
cp .env.example .env.local   # y rellena los valores
npm run dev                  # http://localhost:3000
npm test                     # tests del parser de SMS
npm run build
```

## Notas del plan gratuito
- **Supabase** pausa los proyectos gratuitos tras 7 días sin actividad. Si usas la app o llegan gastos, no pasará. Si se pausa, reactívalo desde el panel de Supabase.
- **Vercel Hobby** es gratuito para uso personal.
