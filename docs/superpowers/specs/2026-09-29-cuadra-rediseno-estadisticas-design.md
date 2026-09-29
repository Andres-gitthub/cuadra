# Cuadra: rediseño "libreta de cuadros" y pantalla de Estadísticas

Fecha: 2026-09-29 · Estado: pendiente de revisión

## Objetivo

Que Cuadra tenga una identidad propia, se entienda mejor el gasto de cada mes y se use con menos toques.

**Lo que ha pedido el usuario**
- Mejorar el diseño con la dirección A, "libreta de cuadros", elegida entre tres maquetas.
- Una pantalla de Estadísticas con tres bloques: ritmo del mes, dónde más gasta y categorías frente al mes anterior. La evolución por meses queda descartada.
- Mantener lo aprobado en la ronda anterior: selector de mes, desglose por categoría, lista por días, formulario rápido, deslizar para borrar y pendientes con Revisar/Descartar.
- Arreglar "Salir": el usuario lo pulsaba para cerrar la app y le cerraba la sesión en todos los dispositivos (confirmado en los logs de Supabase: `/logout` 5 s después de abrir).

**Supuestos**
- Solo modo claro.
- Sin cambios en la base de datos ni dependencias nuevas de npm. La fuente se carga con `next/font/google`, que viene con Next y la incluye en la propia app al compilar.
- Todo el cálculo en el servidor y a partir de los movimientos del mes, que para un solo usuario son pocos.

## Identidad visual

**Idea:** el gasto se apunta como en una libreta de cuadros. La cuadrícula con el margen rojo aparece solo en la cabecera de cada pantalla principal: es el único elemento llamativo. Todo lo demás es blanco, sobrio y alineado a la izquierda, como una libreta.

**Colores**

| Nombre | Hex | Uso |
|---|---|---|
| Papel | `#fbfcfd` | Fondo general |
| Cuadrícula | `#dde5f1` | Líneas de la cabecera |
| Tinta | `#2440b3` | Acento: enlaces, barras, botón principal, pestaña activa |
| Margen | `#e5484d` | Línea de margen de la cabecera; subidas de gasto; borrar |
| Texto | `#1a1d24` | Texto principal |
| Lápiz | `#5b6270` | Texto secundario |
| Raya | `#e8edf4` | Separadores y fondos de barras |

Las barras usan **siempre la tinta**, no un color por categoría, para no convertir la pantalla en un arcoíris. Las bajadas de gasto se marcan en verde `#1f8a4c`, único color semántico extra.

**Tipografía:** Schibsted Grotesk (400, 500, 700, 800) para todo. Importes con `font-variant-numeric: tabular-nums`. Escala: total 44px/800; títulos 22px/700; texto 16px/400; secundario 13px/400. Sin mayúsculas sostenidas en etiquetas.

**Principios**
- Una sola cosa llamativa por pantalla: la cabecera con cuadrícula.
- Alineado a la izquierda, con el margen rojo como guía vertical del texto de la cabecera.
- Listas con separadores finos, no tarjetas con sombra. Nada de degradados.
- Movimiento solo como respuesta a una acción del usuario: deslizar, desplegar la fecha o cambiar un interruptor.

## Pantallas

### Barra inferior
Tres pestañas: **Inicio**, **Estadísticas** y **Pendientes** (con globo del número). El botón **+** flota encima de la barra a la derecha, en tinta. Las pestañas de navegación quedan simétricas y el botón de añadir gasto sigue siempre a mano.

### Inicio (`/?mes=YYYY-MM&cat=…`)
```
┌───────────────────────────────┐
│░│ ‹ septiembre 2026 ›         │  ← cuadrícula + margen rojo
│░│ 412,80 €                    │
│░│ 23 compras, 35 € menos que  │
│░│ agosto                      │
├───────────────────────────────┤
│ 🛒 Supermercado     182,40 €  │  desglose: tocar filtra
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░    44 %  │
│ …                             │
│ Hoy                   55,72 € │  lista por días
│ Lidl                  52,52 € │  (deslizar = Borrar)
│ …                             │
│        Cerrar sesión          │  al final, discreto
└───────────────────────────────┘
```
- **Cerrar sesión**: al final de la página, con confirmación. Cierra la sesión **solo en ese dispositivo** (`signOut({ scope: "local" })`).

### Estadísticas (`/estadisticas?mes=YYYY-MM`)
Misma cabecera de libreta con selector de mes. Debajo, tres bloques:

1. **Ritmo del mes**
   - Gasto medio por día: total del mes ÷ días contados. En el mes en curso cuentan los días transcurridos, incluido hoy; en meses pasados, todos los días del mes.
   - **Previsión a fin de mes** (solo en el mes en curso): media diaria × días del mes. Se muestra como "Si sigues así, cerrarás el mes en ~X €".
   - Días transcurridos / días del mes, como texto: "Día 28 de 30".
2. **Dónde más gastas**: los 8 comercios con más gasto del mes, con número de compras e importe. Los comercios se agrupan sin distinguir mayúsculas ni espacios, y se muestra el nombre con que más veces aparece. Los movimientos sin comercio o sin importe no cuentan.
3. **Categorías frente a {mes anterior}**: por cada categoría con gasto en este mes o en el anterior, su importe actual y la diferencia (`+12,40 €` en rojo margen, `−8,00 €` en verde), ordenadas por diferencia absoluta. "Sin categoría" cuenta como una categoría más.

Estado vacío: "Aún no hay gastos en {mes}. Las estadísticas aparecerán con el primero."

### Formulario, Editar y Pendientes
Mismo contenido que en la ronda anterior, con los nuevos colores y la nueva tipografía. Los botones de categoría seleccionados, el interruptor y el botón principal usan la tinta.

### Login
Cabecera de libreta con "Cuadra" en grande y el formulario debajo.

## Estructura del código

**Funciones de cálculo nuevas** en `lib/estadisticas.ts`, con tests:
- `ritmoDelMes(total, mes, ahora)` devuelve `{ mediaDiaria, diasContados, diasDelMes, prevision | null }`.
- `topComercios(movs, n)` devuelve `[{ nombre, compras, total }]`.
- `comparativaCategorias(actual, anterior)` devuelve `[{ id, nombre, actual, anterior, diferencia }]`.

**Componentes**
- `CabeceraLibreta` (cuadrícula + margen): se reutiliza en Inicio, Estadísticas, Pendientes y Login.
- La barra inferior se actualiza con la nueva pestaña y el botón +.
- Página `app/estadisticas/page.tsx`.
- El proxy ya protege la ruta nueva: el matcher cubre todo salvo lo público.

**Datos:** Estadísticas consulta los movimientos del mes y los del mes anterior (dos consultas en paralelo), igual que Inicio.

## Errores y casos límite
- Mes sin movimientos: estado vacío en cada bloque; la previsión no se muestra.
- Movimientos sin importe (pendientes): no cuentan en totales, medias ni comparativas.
- Mes futuro o parámetro inválido: se muestra el mes actual (ya lo hace `parseMes`).
- Error de Supabase: mensaje en la parte superior, como ahora.

## Pruebas
- Tests unitarios de `lib/estadisticas.ts`: media y previsión en el mes en curso y en meses pasados, agrupación de comercios, orden y signos de la comparativa.
- `npm test` y `npm run build` en verde.
- Revisión visual a 375 px en local: el usuario inicia sesión en el panel del navegador.
- Despliegue solo con su permiso.

## Fuera de alcance
Gráficas de evolución por meses, presupuestos, modo oscuro, exportar datos y una pantalla para editar categorías.
