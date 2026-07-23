import type { Metadata, Viewport } from "next";
import "./globals.css";
import Signature from "@/components/Signature/Signature";

export const metadata: Metadata = {
  title: "Prode Argentino — Liga Profesional",
  description:
    "Pronosticá los partidos de la Liga Profesional del fútbol argentino, sumá puntos y competí en el ranking con tus amigos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <Signature />
      </body>
    </html>
  );
}
