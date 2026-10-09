import type { Metadata, Viewport } from "next";
import { RegistrarSW } from "./RegistrarSW";
import "./globals.css";
import { Fraunces, Instrument_Sans } from "next/font/google";

const fuente = Instrument_Sans({ subsets: ["latin"], variable: "--fuente", display: "swap" });
const fuenteTitulo = Fraunces({ subsets: ["latin"], variable: "--fuente-titulo", display: "swap" });

export const metadata: Metadata = {
  title: "Cuadra",
  description: "Mis gastos",
  // Hace que iOS Safari abra la app a pantalla completa al añadirla a la pantalla de inicio.
  appleWebApp: { capable: true, title: "Cuadra", statusBarStyle: "default" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f0e8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fuente.variable} ${fuenteTitulo.variable}`}>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
