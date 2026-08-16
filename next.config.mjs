/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  experimental: {
    cpus: 2,
    webpackMemoryOptimizations: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
