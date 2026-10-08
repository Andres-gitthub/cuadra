import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cuadra · demo",
  description: "Demo de Cuadra con datos inventados",
};

/** Demo pública: las mismas pantallas que la app, con datos inventados y sin guardar nada. */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="banda-demo">Demo con datos inventados · no se guarda nada</p>
      {children}
    </>
  );
}
