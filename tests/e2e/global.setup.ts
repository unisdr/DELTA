import { test as setup } from "@playwright/test";
import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

// Load test environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

setup("create new database", async ({}) => {
	console.log("creating new database...");

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL not found in .env.test");
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
		console.log("Running database schema and initial data...");

		// Read and execute the SQL schema file
		const schemaPath = path.resolve(
			__dirname,
			"..",
			"..",
			"scripts",
			"dts_database",
			"dts_db_schema.sql",
		);
		const schemaSql = await fs.readFile(schemaPath, "utf-8");

		await testDbClient.query(schemaSql);

		console.log("✓ Database schema and initial data loaded successfully");

		await testDbClient.end();
	} catch (error) {
		console.error("Error setting up database:", error);
		throw error;
	}
});
