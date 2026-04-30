import { test as setup } from "@playwright/test";
import { Client } from "pg";
// import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Load test environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// dotenv.config({ path: path.resolve(__dirname, ".env.playwright") });

setup("create new database", async ({}) => {
	console.log("creating new database...");

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL not found in .env.playwright");
	}

	// Parse the database URL
	const url = new URL(databaseUrl);
	const dbName = url.pathname.slice(1);

	// Connect to postgres database to create the test database
	const client = new Client({
		host: url.hostname,
		port: parseInt(url.port),
		user: url.username,
		password: url.password,
		database: "postgres",
	});

	try {
		await client.connect();

		// Drop database if it exists and create fresh one
		await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
		await client.query(`CREATE DATABASE ${dbName}`);

		console.log(`✓ Database '${dbName}' created successfully`);

		await client.end();

		// Connect to the new database to run schema
		const testDbClient = new Client({
			connectionString: databaseUrl,
		});

		await testDbClient.connect();
		console.log("Running Drizzle migrations...");

		const migrationsFolder = path.resolve(
			__dirname,
			"..",
			"..",
			"app",
			"drizzle",
			"migrations",
		);

		const db = drizzle(testDbClient);
		await migrate(db, { migrationsFolder });

		console.log("✓ Drizzle migrations completed successfully");

		await testDbClient.end();
	} catch (error) {
		console.error("Error setting up database:", error);
		throw error;
	}
});
