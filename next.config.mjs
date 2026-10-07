import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Keep server-only / native-ish packages out of the bundle so they resolve at runtime.
  serverExternalPackages: [
    '@prisma/client',
    '.prisma/client',
    'bcryptjs',
    'nodemailer',
    '@react-pdf/renderer',
    'pino',
  ],
  // We type-check separately (npm run typecheck); don't let lint config block production builds.
  eslint: { ignoreDuringBuilds: true },
  // Define the "@/" alias explicitly so every webpack layer resolves it uniformly.
  webpack: (config) => {
    config.resolve.alias = { ...(config.resolve.alias ?? {}), '@': path.join(__dirname, 'src') };
    return config;
  },
};

export default nextConfig;
