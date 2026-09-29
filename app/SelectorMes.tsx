import Link from "next/link";
import { claveMes, desplazarMes, nombreMes, type Mes } from "@/lib/dates";

export function SelectorMes({ mes, esActual, ruta = "/" }: { mes: Mes; esActual: boolean; ruta?: string }) {
  const anterior = desplazarMes(mes, -1);
  const siguiente = desplazarMes(mes, 1);

  return (
    <div className="selector-mes">
      <Link href={`${ruta}?mes=${claveMes(anterior)}`} className="flecha" aria-label={`Ver ${nombreMes(anterior)}`}>
        ‹
      </Link>
      <span className="nombre-mes">{nombreMes(mes)}</span>
      {esActual ? (
        <span className="flecha desactivada" aria-hidden>
          ›
        </span>
      ) : (
        <Link href={`${ruta}?mes=${claveMes(siguiente)}`} className="flecha" aria-label={`Ver ${nombreMes(siguiente)}`}>
          ›
        </Link>
      )}
    </div>
  );
}
