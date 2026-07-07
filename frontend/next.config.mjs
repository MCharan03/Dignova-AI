/** @type {import('next').NextConfig} */

// We use process.env.BACKEND_URL to toggle between local and production
// On Render/Vercel, set BACKEND_URL=https://dignova-ai.onrender.com
const BACKEND_URL = process.env.BACKEND_URL || 'https://dignova-ai.onrender.com';

const nextConfig = {
    images: {
        unoptimized: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    transpilePackages: ['three'],
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${BACKEND_URL}/api/:path*`,
            },
            {
                source: '/auth/:path*',
                destination: `${BACKEND_URL}/api/auth/:path*`,
            }
        ];
    },
};

export default nextConfig;
