# Bug Triage — Interactive P0 Audit

Use this file when running the full P0 codebase audit from your IDE.
Load it alongside `.github/agents/bug-triage.agent.md` — the anti-pattern
catalogue and output schemas are defined there.

---

## Setup

1. Read `specs/source-code-audits/p0-items.md`.
   - The items table lists P0-0 through P0-27 with their current status.
   - The item notes section (below the table) clarifies the intended fix for
     9 specific items. **Item notes take precedence over your own code reading.**
2. Optionally run `yarn tsc --noEmit` in the terminal and note any compiler errors.
   Use the output as a signal to guide your search — not as a replacement for
   reading the actual source files.

---

## Per-item procedure

Work through every item where status ≠ `done`, in list order.

**For each item:**

1. Extract the primary symbol(s) from the item title: function names, variable
   names, file path hints, configuration keys, script names.

2. Search the codebase for those symbols. Cast a wide net — check `app/`,
   `scripts/`, shell scripts, Dockerfiles, and config files as appropriate
   to the item title. Do not limit yourself to TypeScript files.

3. Read the matching file(s). Locate the exact line where the bug manifests.

4. If the initial search returns no matches: try alternative spellings, partial
   names, or related symbols. If the symbol genuinely does not exist in the
   codebase, set `file: null` and explain why in `root_cause` (e.g. "function
   not yet implemented", "item is a creation task with no existing source file").

5. **Verify before writing.** Before recording `file:` and `line:`, confirm the
   symbol or pattern is present at that exact line in the file you just read.
   Do not estimate. Do not adjust a nearby line number.

6. Write output to `gap-analysis/bug-triage/{id}.md` using the Mode A YAML
   schema from `.github/agents/bug-triage.agent.md`. One file per item.

---

## After all items

Regenerate `gap-analysis/bug-triage/INDEX.md` with:

- A header line noting the date, agent, and that output was produced interactively
- The full items table: `| ID | Title | Complexity | Status |`
- The Gate 1 checklist at the bottom (verify P0-2, P0-8, P0-12 root causes)
- Summary counts: total · trivial · simple · complex · errors
