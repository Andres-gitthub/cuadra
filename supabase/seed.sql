-- Categorías iniciales. Ejecutar DESPUÉS de crear tu usuario en Supabase (Authentication → Users).
-- 1) Cambia 'TU_EMAIL@ejemplo.com' por tu email.
-- 2) SQL Editor → pegar → Run.
-- Las palabras clave se pueden editar luego en Table Editor → categories → palabras_clave.

do $$
declare
  uid uuid := (select id from auth.users where email = 'TU_EMAIL@ejemplo.com');
begin
  if uid is null then
    raise exception 'No existe ningún usuario con ese email. Créalo primero en Authentication → Users.';
  end if;

  insert into public.categories (user_id, nombre, palabras_clave) values
    (uid, 'Supermercado',  array['mercadona','carrefour','lidl','aldi','dia ','eroski','alcampo','consum','hipercor','bonpreu','ahorramas','supercor']),
    (uid, 'Restaurantes',  array['restaurante','bar ','cafeteria','cafe','burger','mcdonald','telepizza','glovo','just eat','uber eats','deliveroo','starbucks']),
    (uid, 'Transporte',    array['repsol','cepsa','galp','bp ','shell','renfe','metro','emt','cabify','uber','bolt','parking','autopista','ryanair','vueling','iberia']),
    (uid, 'Compras',       array['amazon','zara','primark','el corte ingles','decathlon','ikea','mediamarkt','fnac','aliexpress','shein','pull&bear','mango']),
    (uid, 'Suscripciones', array['netflix','spotify','hbo','disney','apple.com','icloud','google','youtube','prime video','dazn','movistar']),
    (uid, 'Hogar',         array['iberdrola','endesa','naturgy','holaluz','agua','vodafone','orange','digi','leroy merlin','bricomart']),
    (uid, 'Salud',         array['farmacia','clinica','dentista','optica','hospital','sanitas','adeslas']),
    (uid, 'Ocio',          array['cine','teatro','steam','playstation','nintendo','ticketmaster','gimnasio','gym','basic fit'])
  on conflict (user_id, nombre) do nothing;
end $$;
