import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nodemailer usa APIs de Node (net/tls): no debe empaquetarse con el bundle.
  serverExternalPackages: ['nodemailer'],
  async headers() {
    return [
      {
        // El service worker debe servirse como JS, sin cache, para que el
        // navegador siempre tome la última versión.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
