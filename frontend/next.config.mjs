/** @type {import('next').NextConfig} */
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
                destination: 'https://dignova-ai-1.onrender.com/api/:path*',
            },
            {
                source: '/auth/:path*',
                destination: 'https://dignova-ai-1.onrender.com/api/auth/:path*',
            }
        ];
    },
};

export default nextConfig;
