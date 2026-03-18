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
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        return [
            {
                source: '/api/:path*',
                destination: `${backendUrl}/api/:path*`,
            },
            // Fallback for auth routes if they don't have /api prefix in some cases
            {
                source: '/auth/:path*',
                destination: `${backendUrl}/auth/:path*`,
            }
        ];
    },
};

export default nextConfig;
