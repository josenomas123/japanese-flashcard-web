/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude AI SDKs from webpack bundling — they run in Node.js at runtime
  serverExternalPackages: ['anthropic', 'openai', '@google/generative-ai'],
}

export default nextConfig
