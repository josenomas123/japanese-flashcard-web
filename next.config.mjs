/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow server-only packages in API routes
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

export default nextConfig
