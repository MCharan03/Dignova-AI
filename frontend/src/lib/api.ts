/**
 * Centralized API base URL utility.
 * 
 * Priority order (runtime, not build-time):
 *  1. NEXT_PUBLIC_API_URL env var (set in Vercel dashboard to https://dignova-ai.onrender.com)
 *  2. If running in browser and URL matches vercel.app or dignova.ai, use Render prod URL
 *  3. Fallback: https://dignova-ai.onrender.com (hardcoded safe default)
 *  4. Local dev: http://localhost:8000
 */
export function getApiBase(): string {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;

    // If env var is set AND is not localhost, trust it
    if (envUrl && !envUrl.includes('localhost')) {
        return envUrl;
    }

    // Browser runtime detection: if we're on vercel/production, use Render
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (
            hostname.includes('vercel.app') ||
            hostname.includes('dignova.ai') ||
            hostname.includes('onrender.com') ||
            (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'))
        ) {
            return 'https://dignova-ai.onrender.com';
        }
    }

    // Local dev
    if (envUrl) return envUrl;
    return 'https://dignova-ai.onrender.com';
}

/**
 * Convenience helper: builds a full backend URL from a relative path.
 * Usage: apiUrl('/api/auth/login') → 'https://dignova-ai.onrender.com/api/auth/login'
 */
export function apiUrl(path: string): string {
    const base = getApiBase();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}

/** Returns the Authorization header object given a stored token */
export function authHeader(): { Authorization: string } {
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('access_token') || ''
        : '';
    return { Authorization: `Bearer ${token}` };
}
