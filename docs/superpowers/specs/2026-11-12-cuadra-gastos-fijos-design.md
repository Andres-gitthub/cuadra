# Cuadra: gastos fijos (alquiler, seguro, gimnasio…)

Fecha: 2026-11-12 · Estado: pendiente de revisión

## Objetivo

Que los gastos que se repiten cada mes por el mismo importe aparezcan solos en Cuadra, sin tener que apuntarlos a mano cada mes.

**Lo que ha pedido el usuario**
- Una opción de "gasto fijo": siempre el mismo importe, cada mes.
- Son cargos que **no llegan solos** (domiciliaciones y transferencias que el banco no avisa por SMS ni pasan por Apple Pay). Cuadra debe crear el movimiento cada mes.
- Aparecen **el día del cargo**, no el día 1.
- Enfoque A: se generan **al abrir la app**, sin cron.
- Se crean desde **Añadir** con una casilla "Repetir cada mes", y se gestionan en una pantalla **Gastos fijos** enlazada desde Inicio.

**Supuestos**
- Importe fijo: un recibo que varía (luz) no es un fijo; se sigue apuntando como siempre.
- Un solo usuario. Sin dependencias nuevas. Misma identidad "libreta de cuadros".
- Como los fijos no llegan por SMS ni Apple Pay, no hay riesgo de duplicarlos con la ingesta automática.

## Datos

Migración `supabase/migrations/0004_gastos_fijos.sql`. Se puede ejecutar varias veces; el usuario la ejecuta en el SQL Editor.

```sql
create table if not exists public.gastos_fijos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  comercio text not null check (length(trim(comercio)) > 0),
  importe numeric(12, 2) not null check (importe > 0),
  categoria_id uuid references public.categories (id) on delete set null,
  dia smallint not null check (dia between 1 and 31),
  activo boolean not null default true,
  -- Primer día del último mes ya generado (o en el que se creó). Nunca se rellena antes de él.
  ultimo_mes date not null,
  created_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists gasto_fijo_id uuid references public.gastos_fijos (id) on delete set null;

alter table public.transactions drop constraint if exists transactions_origen_check;
alter table public.transactions
  add constraint transactions_origen_check check (origen in ('manual', 'wallet', 'sms', 'fijo'));

-- Un fijo no puede generar dos movimientos en el mismo instante: evita duplicados si dos cargas coinciden.
create unique index if not exists transactions_fijo_fecha_idx
  on public.transactions (gasto_fijo_id, fecha) where gasto_fijo_id is not null;

grant select, insert, update, delete on public.gastos_fijos to authenticated, service_role;
alter table public.gastos_fijos enable row level security;
drop policy if exists "gastos_fijos: solo el propietario" on public.gastos_fijos;
create policy "gastos_fijos: solo el propietario"
  on public.gastos_fijos for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

notify pgrst, 'reload schema';
```

- Comprobar antes el nombre real de la restricción de `origen` en 0001 (`transactions_origen_check` es el que Postgres pone por defecto).
- `Movimiento.origen` pasa a `"manual" | "wallet" | "sms" | "fijo"`; `COLUMNAS_MOVIMIENTO` añade `gasto_fijo_id`.
- Tipo nuevo `GastoFijo` en `lib/types.ts`.
- **Orden de despliegue:** primero la migración y después el código.

## Generación (`lib/fijos.ts`)

**Función pura** `movimientosPendientes(fijo, ahora): { fecha: Date; mes: Mes }[]`, con tests:

- Recorre los meses posteriores a `ultimo_mes` hasta el mes actual (hora de Madrid, `ZONA`).
- Un mes cuenta si su día de cargo ya ha llegado: `ahora >= día de cargo a las 00:00 Madrid`.
- Día de cargo = `min(dia, días del mes)`: un fijo del 31 cae el 28/29 en febrero y el 30 en abril.
- Fecha del movimiento: ese día a las 12:00 hora de Madrid (convertida a UTC con los helpers de `lib/dates.ts`).
- Como mucho los 12 meses más recientes; los anteriores se saltan.
- Fijo con `activo = false` → nada.

**Función de servidor** `generarFijos(supabase, ahora)`:

1. Lee los fijos activos (con `ultimo_mes` anterior al mes actual).
2. Para cada uno con movimientos pendientes:
   - Inserta los movimientos con `upsert(..., { onConflict: "gasto_fijo_id,fecha", ignoreDuplicates: true })`: `tipo = 'gasto'`, `origen = 'fijo'`, `revisado = true`, `moneda = 'EUR'`, `comercio`, `importe`, `categoria_id` y `gasto_fijo_id` del fijo.
   - Después actualiza `ultimo_mes` al primer día del último mes generado.
3. Si falla, registra el error en consola y la página sigue cargando: un fallo de generación no debe dejar la app en blanco. El siguiente intento lo reintenta (el índice único evita duplicados).

Se llama al principio de `app/page.tsx`, `app/estadisticas/page.tsx` y `app/pendientes/page.tsx`, antes de leer movimientos. No en la demo.

**Consecuencias de las reglas**
- Si el usuario borra el movimiento de un mes, no vuelve: `ultimo_mes` ya avanzó.
- Cambiar importe, comercio, categoría o día de un fijo solo afecta a los meses siguientes; los movimientos ya creados no cambian.
- Al reactivar un fijo pausado, `ultimo_mes` pasa al mes anterior al actual: no se rellenan los meses en pausa, y el de este mes se crea cuando llegue su día.
- Borrar un fijo no borra sus movimientos; quedan con `gasto_fijo_id = null` y `origen = 'fijo'`.

## Alta desde Añadir (`app/movimiento/MovimientoForm.tsx`, `lib/formulario.ts`, `app/actions.ts`)

- Solo en "Nuevo" y solo para gastos (`solo-gasto`): interruptor **"Repetir cada mes"** debajo de "Fecha". Al activarlo aparece **"Día del cargo"** (select 1–31), por defecto el día de la fecha elegida.
- `leerFormularioMovimiento` lee `repetir` y `dia`. Validación: con `repetir`, el comercio es obligatorio y `dia` debe estar entre 1 y 31; si no, error y se conservan los valores enviados, como ya hace el formulario.
- `guardarMovimientoManual`, al crear con `repetir`:
  1. Resuelve la categoría: si es "Automática", usa la que `categorize` asigna al movimiento; guarda el id concreto (o null).
  2. Inserta el fijo con `importe` = lo que se guarda en el movimiento (tu parte, si hay reparto), y `ultimo_mes` = primer día del **mes de la fecha del movimiento**.
  3. Inserta el movimiento como hoy, con `origen = 'manual'` y `gasto_fijo_id` del fijo: cuenta como el de ese mes.
  4. Si falla el movimiento después de crear el fijo, borra el fijo y devuelve el error.
- Al editar un movimiento con `gasto_fijo_id`, el formulario muestra el enlace **"Gasto fijo · ver fijos ›"** a `/fijos`. No hay casilla al editar.

## Pantalla Gastos fijos

**Enlace en Inicio** (`InicioVista`): bajo la cabecera, la fila **"Gastos fijos · N · X € al mes ›"** a `/fijos`. Solo si hay al menos un fijo. X = suma de los activos. `app/page.tsx` lee los fijos para pasar `N` y `X`.

**`/fijos`** (`app/fijos/page.tsx` + `app/vistas/FijosVista.tsx`):
- Cabecera libreta con "Gastos fijos" y el total mensual de los activos.
- Lista: icono de categoría, comercio, "día 5", importe. Pausados atenuados y al final, con "En pausa".
- Ordenados por día.
- Sin botón "Nuevo": se crean desde Añadir. Si no hay ninguno, un texto que lo explica con enlace a Añadir.

**`/fijos/[id]`** (`app/fijos/[id]/page.tsx` + formulario cliente):
- Campos: importe, comercio, categoría (chips, sin "Automática"), día del cargo, interruptor "Activo".
- Acciones de servidor nuevas en `app/actions.ts`: `guardarGastoFijo` (valida igual que el alta; al pasar de pausado a activo aplica la regla de `ultimo_mes`) y `borrarGastoFijo` (con confirmación, como `BorrarBoton`).
- Tras guardar o borrar: `revalidatePath` y vuelta a `/fijos`.

## Icono de origen

`ORIGEN.fijo` en `app/Iconos.tsx`: flechas en círculo, título "Gasto fijo". `FilaMovimiento` lo acepta en su tipo de `origen`.

## Demo

- `lib/demo.ts`: 2–3 fijos inventados (alquiler, Basic-Fit) y sus movimientos del mes pasan a `origen: "fijo"`.
- `app/demo/fijos/page.tsx` y `app/demo/fijos/[id]/page.tsx` reutilizan las vistas con `base="/demo"`; guardar solo avisa (`AVISO_DEMO`), como el resto de la demo.
- `generarFijos` no se llama en la demo.

## Pruebas

- `tests/fijos.test.ts`: mes actual antes y después del día de cargo; varios meses atrasados; tope de 12; día 31 en febrero (bisiesto y no) y en abril; cambio de año; fijo pausado; fecha a las 12:00 Madrid en horario de invierno y de verano.
- `tests/formulario.test.ts`: `repetir` sin comercio → error; `dia` fuera de rango → error; valores conservados tras error.
- `tests/demo.test.ts`: los fijos de la demo son coherentes con sus movimientos.
- Verificación final: typecheck, `npm test`, `npm run build`, y en el navegador crear un fijo desde Añadir, verlo en `/fijos`, editarlo y pausarlo.

## Fuera de alcance

- Fijos con importe variable, periodicidad distinta de mensual, o ingresos fijos (nómina).
- Crear fijos desde la pantalla `/fijos` o convertir un movimiento existente en fijo.
- Avisos o notificaciones antes del cargo.
