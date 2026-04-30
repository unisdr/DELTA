## 1. Failing Tests (Red Phase)

- [x] 1.1 Create `tests/integration/db/human-effects-delete-all-data.test.ts` with
  `import "./setup"` at the top. Write a failing test that seeds a disaster record,
  calls `deleteAllData` with a mismatched `countryAccountsId` (forces a 404 inside
  `clearThrows`), and asserts that `deleteAllData` throws rather than returning
  silently.
- [x] 1.2 In the same file, write a failing test that wraps a `deleteAllData` call
  (designed to fail) inside a `dr.transaction()` callback, then asserts the disaster
  record row still exists after the transaction rejects (Drizzle rolled back — no
  partial delete).
- [x] 1.3 Write a test asserting `clear()` called with an unrecognised `tableIdStr`
  returns a `Response` object (does not throw), verifying the public contract is
  unchanged.

## 2. Implementation

- [x] 2.1 In `app/backend.server/handlers/human_effects.ts` — add unexported:
  ```typescript
  async function clearThrows(
    tableIdStr: string,
    recordId: string,
    countryAccountsId: string,
  ): Promise<void>
  ```
  Move the `HumanEffectsTableFromString` parse and `dr.transaction` block from
  `clear()` into it. On invalid table: throw the parse error. On `ETError` from
  `clearData`: throw the ETError. On 404 (tenant check): throw the `Response`.
  On success: return.
- [x] 2.2 Rewrite `clear()` to call `clearThrows()` inside try/catch and convert
  thrown errors to Responses:
  - `Error` from invalid table parse → `Response.json({ ok: false, error: String(e) })`
  - `ETError` → `Response.json({ ok: false, error: e })`
  - Anything else → re-throw (preserves current behaviour for `Response(404)` and
    unknown errors)
- [x] 2.3 Rewrite `deleteAllData` — replace:
  ```typescript
  let r = await clear(def.id, recordId, countAccountsId);
  if (!r.ok) { return r; }
  ```
  with:
  ```typescript
  await clearThrows(def.id, recordId, countAccountsId);
  ```
  Let any throw from `clearThrows` propagate out of `deleteAllData` naturally.
- [x] 2.4 In `app/routes/$lang+/disaster-record+/edit-sub.$disRecId+/human-effects+/delete-all-data.ts`
  — wrap the `deleteAllData` call:
  ```typescript
  try {
    return await deleteAllData(ctx, recordId, countryAccountsId);
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
  ```

## 3. Quality Gates

- [x] 3.1 `yarn vitest run tests/integration/db/human-effects-delete-all-data.test.ts`
  — all tests from task 1 must pass green
- [x] 3.3 `yarn tsc` — zero TypeScript errors
- [x] 3.3 `yarn format:check` — Prettier clean (fix with `yarn format` if needed)
- [x] 3.4 Anti-pattern review — work through `.github/skills/anti-pattern-check/SKILL.md`
  and confirm no checklist item is violated by this change, particularly:
  - AP-P0-7 is now fixed (not reproduced elsewhere)
  - Auth checks intact (`authActionWithPerm` still used in route)
  - Every Drizzle mutation is awaited
  - No error is swallowed in the new `clearThrows` or updated `deleteAllData`
- [x] 3.5 SOLID review — invoke `solid-reviewer` agent on the changed handler file
- [x] 3.6 Documentation review — confirm inline comments in `clearThrows` and
  `clear()` explain WHY the split exists (i.e. that `clearThrows` is the throwing
  core and `clear()` is the HTTP boundary wrapper), not just WHAT the code does
- [x] 3.7 Project conventions review — re-read `.github/copilot-instructions.md` and
  confirm the change is consistent with multi-tenancy scoping, auth patterns, and
  the handler/model separation described there

## 4. Housekeeping

- [x] 4.1 In `gap-analysis/source-code-audits/p0-items.md` update P0-7 status from
  `todo` to `done`.
- [x] 4.2 Run `opsx:archive` on this branch before raising the PR.
