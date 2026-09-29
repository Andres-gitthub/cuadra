/** Cabecera con cuadrícula y margen rojo de libreta: el único elemento llamativo de cada pantalla. */
export function CabeceraLibreta({ children }: { children: React.ReactNode }) {
  return <header className="cabecera-libreta">{children}</header>;
}
