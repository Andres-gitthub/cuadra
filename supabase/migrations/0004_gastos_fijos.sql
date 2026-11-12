-- Gastos fijos: cargos mensuales del mismo importe que el banco no avisa (alquiler, seguro, gimnasio…).
-- Cuadra crea el movimiento de cada mes al abrir la app. Se puede ejecutar varias veces.
-- Ejecutar en Supabase: SQL Editor → pegar → Run. Primero la migración y después desplegar el código.

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
-- No es parcial a propósito: el upsert de PostgREST (ON CONFLICT) no encaja con un índice parcial.
-- Los movimientos sin fijo no chocan entre sí porque en Postgres los NULL son distintos.
create unique index if not exists transactions_fijo_fecha_idx
  on public.transactions (gasto_fijo_id, fecha);

grant select, insert, update, delete on public.gastos_fijos to authenticated, service_role;

alter table public.gastos_fijos enable row level security;
drop policy if exists "gastos_fijos: solo el propietario" on public.gastos_fijos;
create policy "gastos_fijos: solo el propietario"
  on public.gastos_fijos for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

notify pgrst, 'reload schema';
