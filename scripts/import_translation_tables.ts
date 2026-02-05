import { initDB } from '~/db.server';
import { importTranslationsIfNeeded } from '~/backend.server/services/translationDBUpdates/update';
import { loadEnvFile } from '~/utils/env';
import { dr } from '~/db.server';

main().catch(console.error);

async function main() {
    loadEnvFile('');
    initDB();
    await importTranslationsIfNeeded();
    await dr.$client.end();
}
