import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    clearScreen: false,
    server: {
        port: 5173,
        strictPort: true,
    },
    envPrefix: ['VITE_', 'TAURI_'],
    build: {
        target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
        minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
        sourcemap: !!process.env.TAURI_DEBUG,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                viewer: resolve(__dirname, 'viewer.html')
            }
        }
    }
});
