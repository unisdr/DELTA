# Content String Extraction

This script extracts translatable content from the database that originates in seed data via SQL migrations. It reads text fields from tables like HIP types, sectors, and assets to generate translation entries. While the data starts as static seeds, it is pulled from the database to ensure consistency with current content and schema.

## How it works

The script:

- Connects to the database
- Queries specific tables for English text fields
- Combines results into a single list of strings to translate
- Generates unique IDs using table type, record ID, and a hash of the text
- Writes output to `app/locales/content/en.json`

Each entry includes:

- `id`: structured as `type.recordId.textHash` to ensure uniqueness and detect changes
- `translation`: the original English text

Supported content types:

- HIP types: name
- HIP clusters: name
- HIP hazards: name
- Sectors: name, description
- Assets (only built-in ones): name, category, notes
- Categories: name

## ID format with hash

The ID includes a 6-character SHA-256 hash of the text. This ensures:

- If the text changes, the ID changes
- Translation systems treat it as a new string
- Old translations don’t get incorrectly reused

This helps maintain accuracy when content evolves.

## Usage

Run from project root:

```
yarn export_tables_for_translation
```

This executes:

```
tsx scripts/export_tables_for_translation
```

The script requires:

- Database access
- Environment variables loaded (via `loadEnvFile`)

Output example:

```json
[
	{
		"id": "sector.name.1.abc123",
		"translation": "Health"
	},
	{
		"id": "sector.description.1.def456",
		"translation": "This sector covers hospitals and clinics."
	}
]
```

## Important notes

- Always run this after updating seed data or adding new records
- Resulting files are the used by Deepl and Weblate
- Do not edit generated files manually - changes will be overwritten
- Compile output for Linux (GOOS=linux CGO=0 go build -o string-extractor) and Windows (GOOS=windows CGO=0 go build -o string-extractor.exe)
