import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Isolates third-party dependencies from application logic
                    if (id.includes('node_modules')) {
                        if (id.includes('@supabase')) return 'vendor-supabase';
                        if (id.includes('luxon')) return 'vendor-luxon';
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                            return 'vendor-react';
                        }
                        // Fallback for remaining dependencies
                        return 'vendor-core';
                    }
                }
            }
        },
        // Adjusts the warning threshold to accommodate standard vendor chunk sizes
        chunkSizeWarningLimit: 600
    }
});