import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs'

// Custom plugin: Copy build/icon*.png into dist/build/ so PWA manifest icons work
function copyBuildIcons() {
    return {
        name: 'copy-build-icons',
        closeBundle() {
            const srcDir = resolve(__dirname, 'build');
            const destDir = resolve(__dirname, 'dist', 'build');
            if (!existsSync(srcDir)) return;
            if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
            for (const file of readdirSync(srcDir)) {
                if (file.endsWith('.png') || file.endsWith('.ico') || file.endsWith('.svg')) {
                    copyFileSync(resolve(srcDir, file), resolve(destDir, file));
                }
            }
            console.log('[Vite] Copied build icons for PWA manifest');
        }
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), copyBuildIcons()],
    base: './',
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/api/ollama': {
                target: 'http://127.0.0.1:11434',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/ollama/, '')
            }
        }
    }
})
