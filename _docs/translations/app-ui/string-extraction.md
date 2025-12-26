# App UI String Extraction

This tool extracts translation strings from frontend code (TypeScript and TSX files) in the `app/` directory. It scans for calls to `t({ ... })` and collects the translation messages to be processed.

## Usage
Run from the `scripts/data-string-extrator` sub-directory to scan the app directory and write to the default output file location. Install golang first. Then do the following:

```
cd scripts/delta-string-extractor
go run .
```

The tool will scan all `.ts` and `.tsx` files in the `app/` directory and generate the translation strings in `app/locales/app/en.json`.

## How it works

The extractor:
- Walks through all `.ts` and `.tsx` files in the `app/` directory
- Skips ignored directories like `node_modules`
- Looks for function calls matching `t({` followed by a JSON object
- Parses the JSON to extract:
  - `code`: unique message ID
  - `msg`: default message string (optional if `msgs` is used)
  - `msgs`: pluralized messages (optional if `msg` is used)
  - `desc`: description for translators (optional)

## It validates that:
- Every entry has a `code`
- Either `msg` or `msgs` is provided and non-empty
- Placeholders like {name} are preserved automatically

## Handling duplicates and conflicts
If multiple files define the same `code`, the tool:
- Groups entries by `code`
- Compares their translations (`msg` or `msgs`)
- If translations differ, it logs a conflict and stops
- If translations match, it picks the one with a description if available

## Output
The extracted strings are written to `app/locales/en.json` as an array of objects with:
- `id`: the `code` from the source
- `description`: combined from `desc` and location info
- `translation`: either `msg` or `msgs` from source

Each description includes the file path and line number for reference.



## Important notes

- This script overwrites the output file completely which is correct, since the output file is owned by this script
- Needs to run after any new string is added
