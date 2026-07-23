import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prode Argentino — Liga Profesional",
  description:
    "Pronosticá los partidos de la Liga Profesional del fútbol argentino, sumá puntos y competí en el ranking con tus amigos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
