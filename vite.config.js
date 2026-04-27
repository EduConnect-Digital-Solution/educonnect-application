import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import jsconfigPaths from 'vite-jsconfig-paths';

/**
 * Vite config with PWA-friendly settings.
 *
 * Key additions:
 * - sw.js excluded from Vite processing (it's a raw service worker)
 * - Asset filenames include content hash for cache busting
 * - Build output organized by asset type
 */
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        jsconfigPaths(),
    ],

    server: {
        proxy: {
            '/api': {
                target: 'https://educonnect-backend-t7j1.onrender.com',
                changeOrigin: true,
                secure: true,
            },
        },
    },

    build: {
        // Ensure assets have content hashes for reliable cache busting
        rollupOptions: {
            output: {
                // Organize output by asset type
                assetFileNames: (assetInfo) => {
                    const ext = assetInfo.name?.split('.').pop();
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
                        return 'assets/images/[name]-[hash][extname]';
                    }
                    if (/woff2?|ttf|eot/i.test(ext)) {
                        return 'assets/fonts/[name]-[hash][extname]';
                    }
                    return 'assets/[name]-[hash][extname]';
                },
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
            },
        },

        // Source maps for production debugging (disable if concerned about size)
        sourcemap: false,

        // Chunk size warning threshold
        chunkSizeWarningLimit: 600,
    },

    // Explicitly handle sw.js as a static asset (don't process through Vite)
    publicDir: 'public',
});
