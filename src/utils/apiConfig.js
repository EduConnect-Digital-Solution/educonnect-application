// Single source of truth for the backend URL.
// Set VITE_API_URL in .env (local) and in the hosting provider's env settings.
// There is deliberately no fallback, so a missing value can never silently
// point a build at the wrong backend.
const raw = import.meta.env.VITE_API_URL;

if (!raw) {
    throw new Error(
        'VITE_API_URL is not set. Add it to .env (see .env.example) or your hosting environment variables.'
    );
}

export const API_BASE_URL = raw.replace(/\/+$/, '');
