import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nodemailer usa APIs de Node (net/tls): no debe empaquetarse con el bundle.
  serverExternalPackages: ['nodemailer'],
};

export default nextConfig;
