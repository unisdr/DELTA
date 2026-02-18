# Use DeepL for Pre-translation

This tool generates machine-translated strings using the DeepL API. It reads the source language file (usually en.json), translates all strings into target languages, and writes the results into corresponding JSON files. These pre-translations are then imported into Weblate for human review.

The process supports both simple strings and pluralized messages, and preserves placeholders like {name} or {n} by normalizing them during translation and restoring them afterward.

## How it works

The translation script:

- Reads translation keys and source text from the base language file (e.g., en.json)
- Extracts all translatable strings, including plural forms
- Normalizes placeholders (e.g., {user} → {0}) so they don’t interfere with translation
- Sends clean text to DeepL API in batches
- Restores original placeholders after receiving translations
- Writes translated entries into language-specific JSON files (e.g., fr.json, de.json)

Translations are cached in json file stored in git locally to avoid re-translating the same text and reduce API costs.

## Usage

Run from the `scripts/delta-deepl-translate` directory. Install Go first. Then do the following:

```
# Set your DeepL API key in an environment variable
# Free key is enough for the number of strings we have.
export DELTA_DEEPL_KEY=your-free-api-key-here

# Optional: verify the variable is set
echo $DELTA_DEEPL_KEY

# Change to the script directory
cd scripts/delta-deepl-translate

# Run the translator for desired languages
go run . --langs=ar,es,fr,ru,zh
```

Use `-h` to see help. Here is the list of flags.

- `--source-lang`: source language code (default: en)
- `--langs`: comma-separated list of target languages (e.g., fr,es,de)
- `--api-key-env-var`: environment variable containing DeepL API key (default: DELTA_DEEPL_KEY)

Optional flags:

- `--dry-run`: show estimated character count and cost without making API calls
- `--sample`: translate only first 10 entries for testing

## Caching

All translations are stored in a json cache file stored in git at app/locales/api-cache/data.json. This prevents redundant API calls and allows resuming work after interruptions. The cache is automatically saved and reloaded.

## Cost Estimation

Before translating, the script estimates total characters and cost based on DeepL pricing (€20 per 1 million characters).

# Integration with Workflow

This script translates all strings every time it runs - it does not merge or preserve existing translations. Running it will overwrite all non-English files with fresh machine translations.

Use carefully: only run when new strings are added and no manual edits have been made, or risk losing existing translations.

Currently not safe for mixed workflows. Future version should support merging.
