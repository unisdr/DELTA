import { dr } from '~/db.server';
import { initDB } from '~/db.server';
import { getTranslationSources } from '~/backend.server/services/translationDBUpdates/sources';
import fs from 'fs';
import { dirname } from 'path';
import { loadEnvFile } from '~/utils/env';

main().catch(console.error);

async function main() {
    loadEnvFile('');
    initDB();

    const sources = await getTranslationSources();

    const items = sources.map(({ id, msg }) => ({
        id,
        translation: msg,
    }));

    // Sort by ID
    items.sort((a, b) => a.id.localeCompare(b.id));

    const filePath = 'app/locales/content/en.json';
    const dir = dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));

    console.log(`Exported ${items.length} translations to ${filePath}`);
    await dr.$client.end();
}
