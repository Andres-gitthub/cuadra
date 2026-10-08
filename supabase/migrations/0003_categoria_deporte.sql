-- Categoría Deporte (gimnasio, pádel, piscina…). Antes, el gimnasio caía en Ocio.
-- Se puede ejecutar varias veces. Ejecutar en Supabase: SQL Editor → pegar → Run.

-- 1) Crea Deporte para cada usuario que ya tiene categorías.
insert into public.categories (user_id, nombre, palabras_clave)
select distinct user_id, 'Deporte',
  array['gimnasio','gym','basic fit','fitness','crossfit','mcfit','altafit','anytime fitness','holmes place',
        'padel','playtomic','piscina','polideportivo','yoga','pilates']
from public.categories
on conflict (user_id, nombre) do nothing;

-- 2) Quita de Ocio las palabras del gimnasio, para que no compitan con Deporte.
--    Solo de Ocio: si tú moviste el gimnasio a otra categoría con "Recordar", se respeta.
update public.categories
set palabras_clave = array(
  select k from unnest(palabras_clave) k where k not in ('gimnasio', 'gym', 'basic fit')
)
where nombre = 'Ocio';

-- 3) Pasa a Deporte los gastos que ya tenías en Ocio o sin categoría y encajan con sus palabras.
update public.transactions t
set categoria_id = d.id
from public.categories d
where d.user_id = t.user_id
  and d.nombre = 'Deporte'
  and t.tipo = 'gasto'
  and t.comercio is not null
  and (
    t.categoria_id is null
    or t.categoria_id in (select o.id from public.categories o where o.user_id = t.user_id and o.nombre = 'Ocio')
  )
  and exists (
    select 1 from unnest(d.palabras_clave) k
    where (' ' || lower(t.comercio) || ' ') like '%' || k || '%'
  );
