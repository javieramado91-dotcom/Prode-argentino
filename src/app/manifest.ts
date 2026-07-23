import type { MetadataRoute } from 'next'

// Web App Manifest: permite instalar el Prode como app desde Chrome en el
// celular ("Agregar a pantalla de inicio") y abrirla a pantalla completa.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Prode Argentino — Liga Profesional',
    short_name: 'Prode Argentino',
    description:
      'Pronosticá los partidos de la Liga Profesional del fútbol argentino, sumá puntos y competí en el ranking con tus amigos.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    lang: 'es-AR',
    categories: ['sports', 'games', 'entertainment'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
