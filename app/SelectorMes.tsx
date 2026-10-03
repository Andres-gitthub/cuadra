import Link from "next/link";
import { claveMes, desplazarMes, nombreMes, type Mes } from "@/lib/dates";
import { Trazo } from "./Iconos";

const IZQUIERDA = "M15 6l-6 6 6 6";
const DERECHA = "M9 6l6 6-6 6";

export function SelectorMes({ mes, esActual, ruta = "/" }: { mes: Mes; esActual: boolean; ruta?: string }) {
  const anterior = desplazarMes(mes, -1);
  const siguiente = desplazarMes(mes, 1);

  return (
    <div className="selector-mes">
      <Link href={`${ruta}?mes=${claveMes(anterior)}`} className="flecha" aria-label={`Ver ${nombreMes(anterior)}`}>
        <Trazo d={IZQUIERDA} tamaño={18} grosor={2.2} />
      </Link>
      <span className="nombre-mes">{nombreMes(mes)}</span>
      {esActual ? (
        <span className="flecha desactivada" aria-hidden>
          <Trazo d={DERECHA} tamaño={18} grosor={2.2} />
        </span>
      ) : (
        <Link href={`${ruta}?mes=${claveMes(siguiente)}`} className="flecha" aria-label={`Ver ${nombreMes(siguiente)}`}>
          <Trazo d={DERECHA} tamaño={18} grosor={2.2} />
        </Link>
      )}
    </div>
  );
}
