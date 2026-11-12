# Estado — Cuadra
Última actualización: 2026-11-12

## Hecho recientemente
- 2026-11-12: gastos fijos (cargos mensuales de importe fijo que el banco no avisa):
  spec aprobada (docs/superpowers/specs/2026-11-12-cuadra-gastos-fijos-design.md) y
  plan de implementación en 8 tareas (docs/superpowers/plans/2026-11-12-cuadra-gastos-fijos.md).
- 2026-10-09: CI (tipos, tests y build, también con Node 22.18), engines >=22.18 <25, licencia MIT.
- Demo pública en https://cuadra-phi-green.vercel.app/demo.

## En qué punto está
- App funcional: Inicio, Estadísticas, Pendientes, Añadir; captura por Apple Pay y SMS.
- Gastos fijos: plan escrito, pendiente de revisión y de elegir cómo ejecutarlo. Sin código todavía.

## Pendientes y bloqueos
- Revisar el plan de gastos fijos y elegir modo de ejecución.
- Al implementar: ejecutar la migración 0004 en Supabase antes de desplegar el código.
- Commits de spec y plan solo en local (main), sin push.

## Siguiente paso recomendado
- Ejecutar el plan en la rama gastos-fijos, empezando por la Task 1 (migración y tipos).

## Próximas fechas
- ninguna
