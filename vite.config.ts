import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import path from "path";
import { flatRoutes } from "remix-flat-routes";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { promises as fs } from "fs";

async function copyLocales() {
  const source = join(dirname(fileURLToPath(import.meta.url)), "app", "locales");
  const dest = join(dirname(fileURLToPath(import.meta.url)), "build", "server", "locales");

  try {
    await fs.rm(dest, { recursive: true, force: true }); // Clear old
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(source);

    // Filter only .json files
    const jsonFiles = files.filter(file => file.endsWith(".json"));

    await Promise.all(
      jsonFiles.map(async (file) => {
        await fs.copyFile(join(source, file), join(dest, file));
      })
    );
    console.log("Locales copied to build/server/locales");
  } catch (error) {
    console.error("Failed to copy locales:", error);
  }
}

declare module "@remix-run/server-runtime" {
	interface Future {
		v3_singleFetch: true;
	}
}

export default defineConfig({
	ssr: {
		noExternal: ["primereact", "primeflex", "primeicons"],
	},
	plugins: [
		remix({
			routes: async (defineRoutes) => {
				// Integrate flatRoutes to dynamically define Remix routes
				return flatRoutes("routes", defineRoutes);
			},
			future: {
				v3_singleFetch: true,
				v3_fetcherPersist: true,
				v3_lazyRouteDiscovery: true,
				v3_relativeSplatPath: true,
				v3_throwAbortReason: true,
			},
		}),
		{
			name: "copy-locales",
			closeBundle: async () => {
				await copyLocales();
			},
		},
		{
			name: "custom-security-headers",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					req.url;
					res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
					res.setHeader(
						"Permissions-Policy",
						"geolocation=(self), microphone=(), camera=(), fullscreen=(self), payment=()"
					);
					res.setHeader("X-Frame-Options", "SAMEORIGIN");
					res.setHeader("X-Powered-By", "");
					res.setHeader("X-XSS-Protection", "1; mode=block");
					res.setHeader("X-Content-Type-Options", "nosniff");
					res.setHeader(
						"Cache-Control",
						"no-store, no-cache, must-revalidate, proxy-revalidate"
					);
					res.setHeader(
						"Content-Security-Policy",
						"default-src 'self'; script-src 'self' 'unsafe-inline' blob: https://unpkg.com https://cdnjs.cloudflare.com https://*.preventionweb.net https://ajax.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://*.preventionweb.net; img-src 'self' data: blob: https://*.preventionweb.net https://*.basemaps.cartocdn.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://maps.google.com https://rawgit.com; font-src 'self' https:; connect-src 'self' https: wss: ws: https://data.undrr.org https://nominatim.openstreetmap.org https://unb2c.b2clogin.com https://*.b2clogin.com; worker-src 'self' blob:; frame-src 'self' https://unb2c.b2clogin.com https://*.b2clogin.com; form-action 'self' https://*.b2clogin.com; object-src 'self' data: blob:; base-uri 'self'; frame-ancestors 'self';"
					);
					next();
				});
			},
		},
	],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "app"), // Define "~" as an alias for the "app" directory
			"~node_modules": path.resolve(__dirname, "node_modules"), // Points to "node_modules"
		},
	},
	publicDir: path.resolve(__dirname, "public"), // Ensures the "public" folder is correctly configured
});
