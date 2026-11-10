// Pure, unit-testable record-matching helpers mirroring the validator's semantics.
// A target record counts as MATCHED only when its key is expected AND every compared
// field agrees. Equal row counts alone are never sufficient.

export type RecordComparison = {
  expected: number;
  inScope: number;
  matched: number;
  missing: number;
  unexpected: number;
  mismatched: number;
};

export type KeyedRecord = Record<string, unknown>;

export type CompareOptions<T extends KeyedRecord> = {
  keyOf: (row: T) => string;
  fieldsEqual: (expected: T, actual: T) => boolean;
};

// Baseline-aware keyed comparison. `baselineKeys` (pre-existing rows) are excluded
// from in-scope and unexpected counts so unrelated rows are not treated as migrated.
export function compareKeyedRecords<T extends KeyedRecord>(
  expected: T[],
  actual: T[],
  options: CompareOptions<T>,
  baselineKeys: Set<string> = new Set(),
): RecordComparison {
  const expectedByKey = new Map<string, T>();
  for (const row of expected) expectedByKey.set(options.keyOf(row), row);

  const actualByKey = new Map<string, T>();
  for (const row of actual) actualByKey.set(options.keyOf(row), row);

  let matched = 0;
  let missing = 0;
  let mismatched = 0;
  for (const [key, exp] of expectedByKey) {
    const act = actualByKey.get(key);
    if (act === undefined) {
      missing += 1;
    } else if (options.fieldsEqual(exp, act)) {
      matched += 1;
    } else {
      mismatched += 1;
    }
  }

  let inScope = 0;
  let unexpected = 0;
  for (const [key] of actualByKey) {
    if (baselineKeys.has(key)) continue;
    inScope += 1;
    if (!expectedByKey.has(key)) unexpected += 1;
  }

  return {
    expected: expectedByKey.size,
    inScope,
    matched,
    missing,
    unexpected,
    mismatched,
  };
}

export type CausalityPair = { causeId: string; effectId: string };

const pairKey = (p: CausalityPair) => `${p.causeId}->${p.effectId}`;
const reverseKey = (p: CausalityPair) => `${p.effectId}->${p.causeId}`;

// Direction-aware, baseline-aware causality comparison. A pair present only in the
// reversed direction counts as MISMATCHED, never matched.
export function compareCausalityPairs(
  eligible: CausalityPair[],
  actual: CausalityPair[],
  baselineKeys: Set<string> = new Set(),
): RecordComparison {
  const actualKeys = new Set(actual.map(pairKey));
  const eligibleKeys = new Set(eligible.map(pairKey));

  let matched = 0;
  let missing = 0;
  let mismatched = 0;
  for (const p of eligible) {
    if (actualKeys.has(pairKey(p))) matched += 1;
    else if (actualKeys.has(reverseKey(p))) mismatched += 1;
    else missing += 1;
  }

  let inScope = 0;
  let unexpected = 0;
  for (const key of actualKeys) {
    if (baselineKeys.has(key)) continue;
    inScope += 1;
    const [a, b] = key.split("->");
    const reversed = `${b}->${a}`;
    if (!eligibleKeys.has(key) && !eligibleKeys.has(reversed)) unexpected += 1;
  }

  return {
    expected: eligibleKeys.size,
    inScope,
    matched,
    missing,
    unexpected,
    mismatched,
  };
}
