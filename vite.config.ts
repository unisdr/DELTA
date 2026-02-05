import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

async function copyLocales() {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const localesDir = join(__dirname, 'app', 'locales');
    const dest = join(__dirname, 'build', 'server', 'locales');

    try {
        await fs.rm(dest, { recursive: true, force: true });
        await fs.mkdir(dest, { recursive: true });

        const subdirs = ['app', 'content'];

        for (const subdir of subdirs) {
            const source = join(localesDir, subdir);
            let files: string[] = [];

            try {
                files = await fs.readdir(source);
            } catch (err) {
                console.warn(`Locale subdir not found: ${source}`);
                continue;
            }

            const jsonFiles = files.filter((file) => file.endsWith('.json'));

            // Create corresponding dest subdir
            const destSubdir = join(dest, subdir);
            await fs.mkdir(destSubdir, { recursive: true });

            await Promise.all(
                jsonFiles.map(async (file) => {
                    await fs.copyFile(join(source, file), join(destSubdir, file));
                }),
            );
        }

        console.log('Locales copied to build/server/locales');
    } catch (error) {
        console.error('Failed to copy locales:', error);
    }
}

export default defineConfig({
    ssr: {
        noExternal: ['primereact', 'primeflex', 'primeicons'],
    },
    plugins: [
        reactRouter(),
        {
            name: 'copy-locales',
            closeBundle: async () => {
                await copyLocales();
            },
        },
        {
            name: 'custom-security-headers',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    req.url;
                    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
                    res.setHeader(
                        'Permissions-Policy',
                        'geolocation=(self), microphone=(), camera=(), fullscreen=(self), payment=()',
                    );
                    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
                    res.setHeader('X-Powered-By', '');
                    res.setHeader('X-XSS-Protection', '1; mode=block');
                    res.setHeader('X-Content-Type-Options', 'nosniff');
                    res.setHeader(
                        'Cache-Control',
                        'no-store, no-cache, must-revalidate, proxy-revalidate',
                    );
                    res.setHeader(
                        'Content-Security-Policy',
                        "default-src 'self'; script-src 'self' 'unsafe-inline' blob: https://unpkg.com https://cdnjs.cloudflare.com https://*.preventionweb.net https://ajax.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://*.preventionweb.net; img-src 'self' data: blob: https://*.preventionweb.net https://*.basemaps.cartocdn.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://maps.google.com https://rawgit.com; font-src 'self' https:; connect-src 'self' https: wss: ws: https://data.undrr.org https://nominatim.openstreetmap.org https://unb2c.b2clogin.com https://*.b2clogin.com; worker-src 'self' blob:; frame-src 'self' https://unb2c.b2clogin.com https://*.b2clogin.com; form-action 'self' https://*.b2clogin.com; object-src 'self' data: blob:; base-uri 'self'; frame-ancestors 'self';",
                    );
                    next();
                });
            },
        },
    ],
    resolve: {
        alias: {
            '~': path.resolve(__dirname, 'app'), // Define "~" as an alias for the "app" directory
            '~node_modules': path.resolve(__dirname, 'node_modules'), // Points to "node_modules"
        },
    },
    publicDir: path.resolve(__dirname, 'public'), // Ensures the "public" folder is correctly configured
});
