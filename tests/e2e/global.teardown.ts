import { test as teardown } from '@playwright/test';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

teardown('delete database', async ({}) => {
    console.log('deleting test database...');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL not found in .env.test');
    }

    // Parse the database URL
    const url = new URL(databaseUrl);
    const dbName = url.pathname.slice(1); // Remove leading '/'

    // Connect to postgres database to drop the test database
    const client = new Client({
        host: url.hostname,
        port: parseInt(url.port),
        user: url.username,
        password: url.password,
        database: 'postgres', // Connect to default postgres database
    });

    try {
        await client.connect();

        // Terminate existing connections to the database
        await client.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '${dbName}'
            AND pid <> pg_backend_pid()
        `);

        // Drop the database
        await client.query(`DROP DATABASE IF EXISTS ${dbName}`);

        console.log(`✓ Database '${dbName}' deleted successfully`);
    } catch (error) {
        console.error('Error deleting database:', error);
        throw error;
    } finally {
        await client.end();
    }
});
