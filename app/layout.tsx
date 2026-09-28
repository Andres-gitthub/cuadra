import type { Metadata, Viewport } from "next";
import { RegistrarSW } from "./RegistrarSW";
import "./globals.css";

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
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
