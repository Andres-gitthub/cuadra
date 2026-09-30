-- Tipo de movimiento: 'gasto' (resta dinero) o 'reembolso' (te lo devuelven: Bizum, Tricount…).
-- Se puede ejecutar varias veces. Ejecutar en Supabase: SQL Editor → pegar → Run.
alter table public.transactions
  add column if not exists tipo text not null default 'gasto';
alter table public.transactions drop constraint if exists transactions_tipo_check;
alter table public.transactions
  add constraint transactions_tipo_check check (tipo in ('gasto', 'reembolso'));
notify pgrst, 'reload schema';
