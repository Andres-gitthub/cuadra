-- Esquema inicial de Cuadra (app de finanzas personales).
-- Ejecutar en Supabase: SQL Editor → pegar → Run.
-- Se puede ejecutar varias veces sin error: lo que ya existe se mantiene y lo que falta se crea.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  -- Palabras clave (en minúsculas) que se buscan dentro del nombre del comercio.
  palabras_clave text[] not null default '{}',
  unique (user_id, nombre)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha timestamptz not null default now(),
  importe numeric(12, 2) check (importe is null or importe > 0), -- NULL si no se pudo extraer con seguridad
  moneda text not null default 'EUR',
  comercio text,
  categoria_id uuid references public.categories (id) on delete set null,
  origen text not null check (origen in ('manual', 'wallet', 'sms')),
  texto_original text,
  revisado boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_fecha_idx on public.transactions (user_id, fecha desc);
create index if not exists transactions_pendientes_idx on public.transactions (user_id) where not revisado;

-- Permisos explícitos (necesarios si el proyecto tiene desactivado "Automatically expose new tables").
-- anon (sin sesión) no recibe ningún permiso. authenticated queda limitado además por RLS.
-- service_role solo lo usa el endpoint /api/ingest en el servidor.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.categories, public.transactions to authenticated, service_role;

-- Row Level Security: cada usuario solo ve y modifica sus propias filas.
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "categories: solo el propietario" on public.categories;
create policy "categories: solo el propietario"
  on public.categories for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "transactions: solo el propietario" on public.transactions;
create policy "transactions: solo el propietario"
  on public.transactions for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Que la API (PostgREST) vea las tablas nuevas sin esperar.
notify pgrst, 'reload schema';
