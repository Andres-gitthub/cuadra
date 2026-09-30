# Cuadra: devoluciones (Bizum recibidos, cuentas compartidas, Tricount)

Fecha: 2026-09-30 · Estado: pendiente de revisión

## Objetivo

Que Cuadra refleje **lo que de verdad le cuesta al usuario** cada gasto compartido. Si paga una cena de 60 € y le devuelven 45 € por Bizum, su gasto real es 15 €.

**Lo que ha pedido el usuario**
- Poder apuntar cuando le hacen un Bizum, cuando paga una cuenta de todos y le devuelven su parte, y cuando cuadra un Tricount.
- Lo devuelto **resta** del gasto: del total del mes y de la categoría. Elegido frente a llevar gastos y entradas por separado.
- La devolución se relaciona **solo con una categoría** y un concepto opcional, no con un gasto concreto. Elegido para que sirva también para un Tricount que reparte muchos gastos.
- Guardarlo como un **tipo** de movimiento (opción A).

**Supuestos**
- Los Bizum recibidos llegan como notificación de la app del banco, que iOS no deja leer. Se apuntan a mano desde el formulario.
- La ingesta automática (Apple Pay y SMS) sigue creando solo gastos.
- Sin dependencias nuevas. Solo modo claro. Misma identidad "libreta de cuadros".

## Datos

Migración `supabase/migrations/0002_tipo_movimiento.sql`. Se puede ejecutar varias veces; el usuario la ejecuta en el SQL Editor:

```sql
alter table public.transactions
  add column if not exists tipo text not null default 'gasto';
alter table public.transactions drop constraint if exists transactions_tipo_check;
alter table public.transactions
  add constraint transactions_tipo_check check (tipo in ('gasto', 'reembolso'));
notify pgrst, 'reload schema';
```

- Los movimientos existentes quedan como `gasto` por el valor por defecto.
- `importe` se sigue guardando siempre en positivo (la restricción `importe > 0` no cambia). El tipo decide si suma o resta.
- Para una devolución, el campo `comercio` guarda el **concepto** ("Bizum de Ana · cena cumple"). No hace falta una columna nueva.
- RLS no cambia: la columna pertenece a la misma fila del usuario.
- **Orden de despliegue:** primero la migración y después el código. El código nuevo pide la columna `tipo`, y sin ella las páginas fallarían.

## Cálculos (`lib/resumen.ts`, `lib/estadisticas.ts`)

Regla única: **una devolución cuenta con signo negativo**. Un movimiento sin `tipo` se trata como gasto.

- `totalImportes(movs)` pasa a ser el **neto**: Σ gastos − Σ devoluciones. Los movimientos sin importe siguen sin contar.
- `desglosePorCategoria(movs)` da el neto por categoría.
  - El `pct` se calcula sobre la suma de las categorías con neto positivo.
  - Las categorías con neto ≤ 0 tienen `pct = 0` y van al final, ordenadas por neto de mayor a menor.
- `agruparPorDia` usa el neto en el subtotal de cada día.
- `ritmoDelMes` recibe el total neto; si es ≤ 0, no hay previsión.
- `comparativaCategorias` compara netos.
- `topComercios` solo cuenta gastos: una devolución no es "donde gastas".

## Interfaz

**Formulario (+ y editar)**
- Arriba, un selector de dos opciones: **Gasto | Me devuelven** (botones de radio con el mismo estilo que las categorías, a todo el ancho).
- Con *Me devuelven*:
  - el campo "Comercio" pasa a llamarse **Concepto**, con el ejemplo "Bizum de Ana · cena cumple";
  - la opción de categoría "Automática" no aparece, y la categoría por defecto es "Sin categoría";
  - el resto (importe, fecha con "Ahora · cambiar") no cambia.
- Al editar una devolución, el selector aparece en *Me devuelven*.
- Se puede cambiar el tipo de un movimiento existente, por ejemplo si un Bizum se apuntó por error como gasto.
- El selector funciona sin JavaScript (radios nativos). El cambio de etiqueta y la ocultación de "Automática" se hacen con CSS (`:has()`), que Safari soporta desde la 15.4.

**Lista de movimientos**
- Una devolución muestra el importe en **verde con "+"** ("+45,00 €") y un icono ↩ en lugar del icono de origen.
- Si no tiene concepto, se lee "Devolución".
- El subtotal del día es neto.

**Inicio**
- El total es neto, y puede ser negativo si ese mes entró más de lo que se gastó.
- La línea de resumen sigue contando gastos: "N gastos" cuenta solo los de tipo gasto con importe.
- Si hay devoluciones, se añade "y M devoluciones".
- En el desglose, una categoría con neto ≤ 0 muestra su importe con signo y no lleva barra.

**Estadísticas:** mismos bloques, con las reglas de cálculo de arriba.

**Pendientes y endpoint de ingesta:** no cambian.

## Casos límite
- Devolución en un mes sin gastos de esa categoría: la categoría sale con neto negativo, al final y sin barra.
- Mes solo con devoluciones: total negativo, sin previsión y sin comercios en "Dónde más gastas".
- `tipo` con un valor desconocido en el formulario: se rechaza con "Elige si es un gasto o una devolución".
- Movimientos antiguos sin `tipo` en memoria (o si falta la columna): se tratan como gasto.

## Pruebas
- Tests unitarios:
  - neto en `totalImportes`;
  - desglose con una categoría negativa (pct y orden);
  - subtotal neto por día;
  - `topComercios` ignora devoluciones;
  - comparativa y ritmo con netos, incluido un total ≤ 0 sin previsión.
- Test de validación del tipo en el formulario, con la lógica de lectura del formulario extraída a una función pura.
- `npm test` y `npm run build` en verde.
- Revisión visual con el usuario conectado en el panel, si está disponible. Si no, revisa él en el iPhone tras desplegar.
- Despliegue solo con su permiso, **después** de que ejecute la migración `0002`.

## Fuera de alcance
- Ingresos generales, como la nómina, o un balance de entradas y salidas.
- Captura automática de Bizum.
- Vincular una devolución a un gasto concreto.
- Repartir un gasto entre personas dentro de la app.
