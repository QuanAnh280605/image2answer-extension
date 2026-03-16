import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin to copy manifest and static assets
const copyManifest = () => ({
    name: 'copy-manifest',
    closeBundle() {
        const distDir = resolve(__dirname, 'dist');

        // Copy manifest.json
        copyFileSync(
            resolve(__dirname, 'src/manifest.json'),
            resolve(distDir, 'manifest.json')
        );

        // Copy HTML files
        copyFileSync(
            resolve(__dirname, 'src/popup.html'),
            resolve(distDir, 'popup.html')
        );
        copyFileSync(
            resolve(__dirname, 'src/options.html'),
            resolve(distDir, 'options.html')
        );

        // Copy icons
        const iconsDir = resolve(__dirname, 'src/public/icons');
        const distIconsDir = resolve(distDir, 'icons');
        if (!existsSync(distIconsDir)) {
            mkdirSync(distIconsDir, { recursive: true });
        }
        if (existsSync(iconsDir)) {
            readdirSync(iconsDir).forEach((file: string) => {
                copyFileSync(
                    resolve(iconsDir, file),
                    resolve(distIconsDir, file)
                );
            });
        }

        // Copy CSS files
        copyFileSync(
            resolve(__dirname, 'src/popup.css'),
            resolve(distDir, 'popup.css')
        );
        copyFileSync(
            resolve(__dirname, 'src/options.css'),
            resolve(distDir, 'options.css')
        );
        copyFileSync(
            resolve(__dirname, 'src/content.css'),
            resolve(distDir, 'content.css')
        );

        console.log('✅ Extension assets copied to dist/');
    }
});

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyDirFirst: true,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup.ts'),
                options: resolve(__dirname, 'src/options.ts'),
                background: resolve(__dirname, 'src/background.ts'),
                content: resolve(__dirname, 'src/content.ts'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name].js',
                assetFileNames: '[name].[ext]',
                format: 'es',
            },
        },
    },
    plugins: [copyManifest()],
});
