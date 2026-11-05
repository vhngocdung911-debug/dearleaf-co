/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'bcryptjs'],
  },
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'production',
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'Dearleaf ERP',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
}

module.exports = nextConfig
