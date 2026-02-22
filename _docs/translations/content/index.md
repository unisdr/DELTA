- [String Extraction](string-extraction.md)

## Design

Static content (HIP types, sectors, assets) is initially imported into the database from seed data.

A script, `yarn export_tables_for_translation`, exports this content to JSON files for translation into `app/locales/content/en.json`.

We have `scripts/delta-deepl-translate` than can run initial translation using [deepl](../deepl.md).

[Weblate](../weblate.md) has access to those files as well, so they can be manually adjusted.

On application startup, the function `importTranslationsIfNeeded` in `init.server.tsx` runs. It checks the `lastTranslationImportAt` timestamp in the `dts_system_info` table. If the JSON files have been modified since that time, updated translations are automatically imported into the DB.

For development purposes same script is exposed as `yarn import_translation_tables`.

The data is stored in the database as jsonb with language as key and translated text as value. In queries `dts_jsonb_localized` database function is used to select the passed language or english if not translated. It also supports special en-debug langauge to track untranslated strings in UI.

## Design details

### Translation key

A key used to identify the translation in weblate is built like this: `{type}.{id}.{hash}`, where `hash` is the first 6 characters of the SHA-256 hash of the `msg`. This means that when the original message changes, translation need to be re-done. We also keep type and id for easier debugging. As a side effect is ensures that same original string could be translated differently based on type and id. Though this is not strictly required. But since ids are stable, a bit better to include.

## Alternative Design Options Considered

- Retrieve translations from a JSON file in views instead. This approach was implemented first, since it's easier, but the problem was no support for database search using translated strings. Another minor issue was lack of proper sorting for paginated content.
- Use JSON instead of SQL as source data - rejected: no strong benefit, and would require rewriting migration logic.

## Usage in Code

Use dts_jsonb_localized to retrieve the field value.

### Drizzle select example

```
const hipTypes = await dr
	.select({
		id: hipTypeTable.id,
		name: sql<string>`dts_jsonb_localized(${hipTypeTable.name}, ${ctx.lang})`.as('name'),
	})
	.from(hipTypeTable)
	.limit(10)
	.orderBy(hipTypeTable.id);
```

### Drizzle ORM example

```
return await dr.query.assetTable.findMany({
	...offsetLimit,
	columns: {
		id: true,
	},
	extras: {
		name: sql<string>`CASE
			WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInName}, ${ctx.lang})
			ELSE ${assetTable.customName}
		END`.as("name"),
	},
	orderBy: [sql`name`],
	where: condition,
});

```
