/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add output configuration for better deployment compatibility
  output: 'standalone',
  // Ensure proper static file serving
  poweredByHeader: false,
  compress: true,
  async rewrites() {
    // Use environment variable for API URL in production, localhost in development
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
}

export default nextConfig
