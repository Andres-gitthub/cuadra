# Estado — Cuadra
Última actualización: 2026-11-12

## Hecho recientemente
- 2026-11-12: gastos fijos implementados en la rama `gastos-fijos` (sin push):
  migración 0004, generación al abrir la app, "Repetir cada mes" en Añadir,
  pantalla /fijos (editar, pausar, borrar), enlace en Inicio y en Editar, demo.
  Spec y plan en docs/superpowers/. Tipos, 134 tests y build en verde; demo probada en móvil.
- 2026-10-09: CI (tipos, tests y build, también con Node 22.18), engines >=22.18 <25, licencia MIT.

## En qué punto está
- App funcional: Inicio, Estadísticas, Pendientes, Añadir, Gastos fijos; captura por Apple Pay y SMS.
- Rama `gastos-fijos` lista para revisar; main tiene spec y plan commiteados en local, sin push.

## Pendientes y bloqueos
- Migración 0004 aplicada en Supabase (2026-11-12).
- Probar con datos reales tras la migración: crear un fijo desde Añadir, editarlo, pausarlo y reactivarlo.
- Merge y push de `gastos-fijos`: solo con permiso.

## Siguiente paso recomendado
- Aplicar la migración 0004, probar con datos reales y después mergear y pushear.

## Próximas fechas
- ninguna
