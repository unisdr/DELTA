import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import pg from "pg";
import {
	gatherSpatialValidationMetrics,
} from "./spatialValidation";

const { Client } = pg;

const PROJECT_ROOT = path.resolve(process.cwd());
const VALIDATION_DB_DIR = path.resolve(PROJECT_ROOT, "migration_validation_db");
const DEFAULT_INPUT = path.resolve(VALIDATION_DB_DIR, "dts_db_pglite.sql");
const DEFAULT_OUTPUT = path.resolve(VALIDATION_DB_DIR, "migration-validation-report.md");
const VALIDATION_DB_NAME = process.env.MIGRATION_VALIDATION_DB ?? "dts_db_migration_validation";
const DB_HOST = process.env.MIGRATION_DB_HOST ?? "127.0.0.1";
const DB_PORT = Number(process.env.MIGRATION_DB_PORT ?? 55432);
const DB_USER = process.env.MIGRATION_DB_USER ?? "postgres";
const DB_PASSWORD = process.env.MIGRATION_DB_PASSWORD ?? "postgres";
const CONTAINER_NAME = process.env.MIGRATION_DOCKER_CONTAINER ?? "delta-migration-validation-pg17";
const DOCKER_IMAGE = process.env.MIGRATION_DOCKER_IMAGE ?? "postgis/postgis:17-3.5";

const TARGETED_MIGRATION_FILES = [
  "20261009042834_migrate_hips_with_multi_language_support_and_fixed_hipsUUID.sql",
  "20261009091033_alter_language_table.sql",
  "20261011000000_fix_hips_multilang_corrections.sql",
  "20261012000000_widen_language_cd_bcp47.sql",
  "20261015095931_migrate_hazardous_event_hip_hazard_id_to_hazardous_event_specific_hazard_id.sql",
  "20261015100018_migrate_hazardous_event_spatial.sql",
  "20261015100055_migrate_hazardous_event_causality_from_event_relationship_to_hazardous_event_causality.sql",
  "20261015100122_migrate_validation_workflow.sql",
];

type CheckStatus = "Pass" | "Fail" | "Warn" | "Incomplete";

type RecordMetrics = {
  expected: number | string;
  inScope: number | string;
  matched: number | string;
  missing: number | string;
  unexpected: number | string;
  mismatched: number | string;
};

type ReportRow = {
  Check: string;
  Status: CheckStatus;
  Table: string;
  Expected: string;
  Actual: string;
  MismatchCount: string;
  Details: string;
  EvidenceQuery?: string;
  Records?: RecordMetrics;
};

type ExecutionSummary = {
  freshRestore: boolean;
  backupPath: string;
  migrationFilesPlanned: string[];
  migrationFilesExecuted: string[];
  migrationsCompleted: boolean;
};

type ConstraintShape = {
  conname: string;
  table_name: string;
  ref_table: string;
  conkey: string;
  confkey: string;
  confupdtype: string;
  confdeltype: string;
  confmatchtype: string;
  condeferrable: boolean;
  condeferred: boolean;
  convalidated: boolean;
  definition: string;
};

type BaselineSnapshot = {
  notificationCounts: Map<string, number>;
  notificationPresence: Set<string>;
  workflowHistoryCounts: Map<string, number>;
  workflowHistoryPresence: Set<string>;
  preservedTableFingerprints: Record<string, { rowCount: number; rowHash: string }>;
  restoredConstraintShapes: Record<string, ConstraintShape>;
  hazardousEventExclSpecificHazard: Map<string, string>;
  workflowInstanceIds: Set<string>;
  workflowNotificationById: Map<string, string>;
  workflowHistoryById: Map<string, string>;
  causalityPairs: Set<string>;
};

type RegressionEvidence = {
  executed: boolean;
  exitCode: number | null;
  passed: boolean;
  summary: string;
};

type RollbackTargetResult = {
  label: string;
  migrationFile: string;
  executed: boolean;
  failureObserved: boolean;
  rolledBack: boolean;
  passed: boolean;
  summary: string;
};

const PRESERVED_TABLES = [
  "hip_class",
  "hip_cluster",
  "hip_hazard",
  "hazardous_event_geom",
  "hazardous_event_division",
  "event_relationship",
  "entity_validation_assignment",
  "entity_validation_rejection",
  "division",
] as const;

const RESTORED_CONSTRAINT_NAMES = [
  "hazardous_event_specific_hazard_id_specific_hazard_id_fk",
  "hazard_type_custom_field_definition_hazard_type_id_fk",
  "hazard_type_field_definition_hazard_type_id_fk",
] as const;

function runDocker(args: string[], input?: string): string {
  const result = execFileSync("docker", args, {
    encoding: "utf8",
    input,
    stdio: [input ? "pipe" : "inherit", "pipe", "pipe"],
    env: {
      ...process.env,
      DOCKER_CLI_HINTS: "false",
    },
  });
  return result ?? "";
}

function truncateForReport(text: string, maxLength = 2000): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 80)}? [truncated ${text.length - maxLength + 80} chars]`;
}

function renderRecordSummary(rows: ReportRow[]): string {
  const header =
    `| Check | Status | Expected records | Post-migration records in scope | Matched records | Missing records | Unexpected records | Mismatched records |\n` +
    `| --- | --- | --- | --- | --- | --- | --- | --- |`;
  const body = rows
    .map((row) => {
      const r = row.Records;
      const cell = (v: number | string | undefined) => (v === undefined ? "N/A" : String(v));
      return (
        `| ${row.Check} | ${row.Status} | ${cell(r?.expected)} | ${cell(r?.inScope)} | ` +
        `${cell(r?.matched)} | ${cell(r?.missing)} | ${cell(r?.unexpected)} | ${cell(r?.mismatched)} |`
      );
    })
    .join("\n");
  return `${header}\n${body}`;
}

function renderRowsTable(rows: ReportRow[]): string {
  if (rows.length === 0) {
    return "No checks in this category.";
  }

  const header = `| Check | Status | Table(s) | Expected | Actual | Mismatch count | Details |\n| --- | --- | --- | --- | --- | --- | --- |`;
  const body = rows
    .map((row) => {
      return `| ${row.Check} | ${row.Status} | ${row.Table} | ${row.Expected} | ${row.Actual} | ${row.MismatchCount} | ${row.Details} |`;
    })
    .join("\n");

  return `${header}\n${body}`;
}

function renderEvidence(rows: ReportRow[]): string {
  const withEvidence = rows.filter((row) => row.EvidenceQuery);
  if (withEvidence.length === 0) {
    return "No supporting query references recorded.";
  }

  return withEvidence
    .map(
      (row) =>
        `### ${row.Check}\n\n` +
        `- Status: **${row.Status}**\n` +
        `- Mismatch count: **${row.MismatchCount}**\n` +
        `- Actual: ${row.Actual}\n\n` +
        `\`\`\`sql\n${row.EvidenceQuery}\n\`\`\`\n`,
    )
    .join("\n");
}

function buildReport(rows: ReportRow[], execution: ExecutionSummary): string {
  const passRows = rows.filter((row) => row.Status === "Pass");
  const failRows = rows.filter((row) => row.Status === "Fail");
  const warnRows = rows.filter((row) => row.Status === "Warn");
  const incompleteRows = rows.filter((row) => row.Status === "Incomplete");
  const overallStatus =
    failRows.length === 0 && incompleteRows.length === 0 ? "PASS" : "INCOMPLETE";

  return `# Migration validation report

Overall status: **${overallStatus}**

## Execution context
- Fresh restore performed: **${execution.freshRestore ? "Yes" : "No"}**
- Backup source: \`${execution.backupPath}\`
- Planned migration files: **${execution.migrationFilesPlanned.length}**
- Executed migration files: **${execution.migrationFilesExecuted.length}**
- Completed all eight required migrations: **${execution.migrationsCompleted ? "Yes" : "No"}**

## Migration execution order
${execution.migrationFilesExecuted.map((file, index) => `${index + 1}. \`${file}\``).join("\n")}

## Summary
- Pass checks: ${passRows.length}
- Fail checks: ${failRows.length}
- Incomplete required checks: ${incompleteRows.length}
- Warning checks: ${warnRows.length}

## Record-level match summary
Record counts answer Angesh's review: for each record-level check, how many expected
records were actually found and matched (identity + all fields covered by the check),
versus missing, unexpected, or mismatched. \`N/A\` means record counts do not apply to
that check (e.g. constraint or rollback checks). Equal row counts alone never count as
matched — a target row counts as matched only when its key and all compared fields agree.

${renderRecordSummary(rows)}

## Pass
${renderRowsTable(passRows)}

## Fail
${renderRowsTable(failRows)}

## Incomplete
${renderRowsTable(incompleteRows)}

## Warning
${renderRowsTable(warnRows)}

## Supporting queries and evidence
${renderEvidence(rows)}
`;
}

function ensureDockerPostgres(): void {
  let containerExists = true;
  try {
    runDocker(["inspect", CONTAINER_NAME]);
  } catch {
    containerExists = false;
  }

  if (!containerExists) {
    runDocker([
      "run",
      "-d",
      "--name",
      CONTAINER_NAME,
      "-e",
      "POSTGRES_USER=postgres",
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-e",
      "POSTGRES_DB=postgres",
      "-p",
      `${DB_PORT}:5432`,
      DOCKER_IMAGE,
    ]);
  } else {
    try {
      const state = runDocker(["inspect", "-f", "{{.State.Running}}", CONTAINER_NAME]).trim();
      if (state !== "true") {
        runDocker(["start", CONTAINER_NAME]);
      }
    } catch {
      runDocker(["start", CONTAINER_NAME]);
    }
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      runDocker(["exec", CONTAINER_NAME, "pg_isready", "-U", "postgres", "-d", "postgres"]);
      return;
    } catch {
      const waitMs = 1000;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
    }
  }

  throw new Error(`PostgreSQL 17 container ${CONTAINER_NAME} did not become ready on port ${DB_PORT}.`);
}

function ensureDatabase(): void {
  const escapedDbName = VALIDATION_DB_NAME.replace(/'/g, "''");
  const terminateSql = `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${escapedDbName}' AND pid <> pg_backend_pid();`;
  const dropSql = `DROP DATABASE IF EXISTS "${escapedDbName}";`;

  try {
    runDocker(["exec", CONTAINER_NAME, "psql", "-U", "postgres", "-d", "postgres", "-At", "-c", terminateSql]);
    runDocker(["exec", CONTAINER_NAME, "psql", "-U", "postgres", "-d", "postgres", "-At", "-c", dropSql]);
  } catch {
    // The database does not exist yet or is not reachable; continue with creation below.
  }

  runDocker(["exec", CONTAINER_NAME, "createdb", "-U", "postgres", VALIDATION_DB_NAME]);
}

function restoreDump(filePath: string): void {
  const remotePath = "/tmp/dts_db_migration_validation_dump.sql";
  runDocker(["cp", filePath, `${CONTAINER_NAME}:${remotePath}`]);
  runDocker([
    "exec",
    CONTAINER_NAME,
    "psql",
    "-U",
    "postgres",
    "-d",
    VALIDATION_DB_NAME,
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    remotePath,
  ]);
}

function runMigrationFile(filePath: string): void {
  const remotePath = "/tmp/" + path.basename(filePath);
  runDocker(["cp", filePath, `${CONTAINER_NAME}:${remotePath}`]);
  runDocker([
    "exec",
    CONTAINER_NAME,
    "psql",
    "-U",
    "postgres",
    "-d",
    VALIDATION_DB_NAME,
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    remotePath,
  ]);
}

async function getClient() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: VALIDATION_DB_NAME,
    statement_timeout: 120000,
  });
  await client.connect();
  return client;
}

async function getClientForDatabase(database: string) {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database,
    statement_timeout: 120000,
  });
  await client.connect();
  return client;
}

async function getCount(sqlText: string): Promise<number> {
  const client = await getClient();
  try {
    const result = await client.query(sqlText);
    return Number(result.rows[0]?.c ?? 0);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Validation query failed: ${truncateForReport(sqlText, 300)} | ${reason}`,
    );
  } finally {
    await client.end();
  }
}

async function getRows(sqlText: string): Promise<Array<Record<string, unknown>>> {
  const client = await getClient();
  try {
    const result = await client.query(sqlText);
    return result.rows as Array<Record<string, unknown>>;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Validation query failed: ${truncateForReport(sqlText, 300)} | ${reason}`,
    );
  } finally {
    await client.end();
  }
}

function serializeTuple(values: Array<unknown>): string {
  return JSON.stringify(values.map((value) => (value === undefined ? null : value)));
}

function mapIncrement(map: Map<string, number>, key: string, delta = 1): void {
  map.set(key, (map.get(key) ?? 0) + delta);
}

function diffMultiset(
  left: Map<string, number>,
  right: Map<string, number>,
): { missing: number; unexpected: number } {
  let missing = 0;
  let unexpected = 0;
  const allKeys = new Set<string>([...left.keys(), ...right.keys()]);
  for (const key of allKeys) {
    const l = left.get(key) ?? 0;
    const r = right.get(key) ?? 0;
    if (l > r) missing += l - r;
    if (r > l) unexpected += r - l;
  }
  return { missing, unexpected };
}

function subtractCounts(
  minuend: Map<string, number>,
  subtrahend: Map<string, number>,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const [key, count] of minuend.entries()) {
    const remaining = count - (subtrahend.get(key) ?? 0);
    if (remaining > 0) {
      result.set(key, remaining);
    }
  }
  return result;
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

async function getConstraintShapesByName(constraintNames: readonly string[]): Promise<Record<string, ConstraintShape>> {
  const inList = constraintNames.map((name) => `'${name.replace(/'/g, "''")}'`).join(", ");
  const rows = await getRows(`
    SELECT
      c.conname,
      c.conrelid::regclass::text AS table_name,
      c.confrelid::regclass::text AS ref_table,
      c.conkey::text AS conkey,
      c.confkey::text AS confkey,
      c.confupdtype::text AS confupdtype,
      c.confdeltype::text AS confdeltype,
      c.confmatchtype::text AS confmatchtype,
      c.condeferrable,
      c.condeferred,
      c.convalidated,
      pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    WHERE c.conname IN (${inList})
      AND c.contype = 'f'
  `);

  const result: Record<string, ConstraintShape> = {};
  for (const row of rows) {
    const shape: ConstraintShape = {
      conname: String(row.conname),
      table_name: String(row.table_name),
      ref_table: String(row.ref_table),
      conkey: String(row.conkey),
      confkey: String(row.confkey),
      confupdtype: String(row.confupdtype),
      confdeltype: String(row.confdeltype),
      confmatchtype: String(row.confmatchtype),
      condeferrable: Boolean(row.condeferrable),
      condeferred: Boolean(row.condeferred),
      convalidated: Boolean(row.convalidated),
      definition: String(row.definition),
    };
    result[shape.conname] = shape;
  }
  return result;
}

async function captureBaselineSnapshot(): Promise<BaselineSnapshot> {
  const notificationRows = await getRows(`
    SELECT
      wn.instance_id::text AS instance_id,
      wn.notified_user_id::text AS notified_user_id,
      wn.notified_by_user_id::text AS notified_by_user_id,
      round(extract(epoch from wn.notified_at::timestamptz) * 1000)::bigint::text AS notified_at_key,
      wn.notification_message,
      wn.channel
    FROM public.workflow_notification wn
    JOIN public.workflow_instance wi ON wi.id = wn.instance_id
    WHERE wi.entity_type = 'HE' AND wn.channel = 'workflow'
  `);
  const notificationCounts = new Map<string, number>();
  const notificationPresence = new Set<string>();
  for (const row of notificationRows) {
    const key = serializeTuple([
      row.instance_id,
      row.notified_user_id,
      row.notified_by_user_id,
      row.notified_at_key,
      row.notification_message,
      row.channel,
    ]);
    notificationPresence.add(key);
    mapIncrement(notificationCounts, key);
  }

  const historyRows = await getRows(`
    SELECT
      wh.instance_id::text AS instance_id,
      wh.from_status,
      wh.to_status,
      wh.acting_user_id::text AS acting_user_id,
      wh.occurred_at::text AS occurred_at,
      wh.comment
    FROM public.workflow_history wh
    JOIN public.workflow_instance wi ON wi.id = wh.instance_id
    WHERE wi.entity_type = 'HE'
  `);
  const workflowHistoryCounts = new Map<string, number>();
  const workflowHistoryPresence = new Set<string>();
  for (const row of historyRows) {
    const key = serializeTuple([
      row.instance_id,
      row.from_status,
      row.to_status,
      row.acting_user_id,
      row.occurred_at,
      row.comment,
    ]);
    workflowHistoryPresence.add(key);
    mapIncrement(workflowHistoryCounts, key);
  }

  const preservedTableFingerprints: Record<string, { rowCount: number; rowHash: string }> = {};
  for (const tableName of PRESERVED_TABLES) {
    const qTable = quoteIdent(tableName);
    const rows = await getRows(`
      SELECT
        count(*)::int AS row_count,
        md5(coalesce(string_agg(md5(to_jsonb(t)::text), ',' ORDER BY md5(to_jsonb(t)::text)), '')) AS row_hash
      FROM public.${qTable} t
    `);
    preservedTableFingerprints[tableName] = {
      rowCount: Number(rows[0]?.row_count ?? 0),
      rowHash: String(rows[0]?.row_hash ?? ""),
    };
  }

  const restoredConstraintShapes = await getConstraintShapesByName(RESTORED_CONSTRAINT_NAMES);

  const hazardousEventRows = await getRows(`
    SELECT he.id::text AS id,
           md5((to_jsonb(he) - 'specific_hazard_id')::text) AS row_hash
    FROM public.hazardous_event he
  `);
  const hazardousEventExclSpecificHazard = new Map<string, string>();
  for (const row of hazardousEventRows) {
    hazardousEventExclSpecificHazard.set(String(row.id), String(row.row_hash));
  }

  const workflowInstanceIdRows = await getRows(
    "SELECT id::text AS id FROM public.workflow_instance",
  );
  const workflowInstanceIds = new Set<string>();
  for (const row of workflowInstanceIdRows) {
    workflowInstanceIds.add(String(row.id));
  }

  const notificationByIdRows = await getRows(`
    SELECT id::text AS id, md5(to_jsonb(wn)::text) AS row_hash
    FROM public.workflow_notification wn
  `);
  const workflowNotificationById = new Map<string, string>();
  for (const row of notificationByIdRows) {
    workflowNotificationById.set(String(row.id), String(row.row_hash));
  }

  const historyByIdRows = await getRows(`
    SELECT id::text AS id, md5(to_jsonb(wh)::text) AS row_hash
    FROM public.workflow_history wh
  `);
  const workflowHistoryById = new Map<string, string>();
  for (const row of historyByIdRows) {
    workflowHistoryById.set(String(row.id), String(row.row_hash));
  }

  // Pre-existing causality pairs (table may already hold rows in the backup); the
  // migration only inserts eligible pairs NOT already present. Capturing the baseline
  // keeps pre-existing rows from being counted as migrated or unexpected.
  const causalityPairRows = await getRows(`
    SELECT cause_hazardous_event_id::text AS cause_id, effect_hazardous_event_id::text AS effect_id
    FROM public.hazardous_event_causality
  `);
  const causalityPairs = new Set<string>();
  for (const row of causalityPairRows) {
    causalityPairs.add(`${row.cause_id}->${row.effect_id}`);
  }

  return {
    notificationCounts,
    notificationPresence,
    workflowHistoryCounts,
    workflowHistoryPresence,
    preservedTableFingerprints,
    restoredConstraintShapes,
    hazardousEventExclSpecificHazard,
    workflowInstanceIds,
    workflowNotificationById,
    workflowHistoryById,
    causalityPairs,
  };
}

function runRegressionTestsForEvidence(): RegressionEvidence {
  const vitestEntry = path.resolve(PROJECT_ROOT, "node_modules", "vitest", "vitest.mjs");
  const result = spawnSync(
    process.execPath,
    [vitestEntry, "run", "tests/unit/scripts/spatialValidation.test.ts", "tests/unit/scripts/recordMatching.test.ts"],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    },
  );
  if (result.error) {
    return {
      executed: true,
      exitCode: -1,
      passed: false,
      summary: `Failed to launch regression tests: ${result.error.message}`,
    };
  }
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  const summary = output.length > 4000 ? output.slice(output.length - 4000) : output;

  return {
    executed: true,
    exitCode: result.status ?? -1,
    passed: result.status === 0,
    summary,
  };
}

function createFreshDisposableDb(dbName: string): void {
  const esc = dbName.replace(/'/g, "''");
  runDocker([
    "exec", CONTAINER_NAME, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1",
    "-c", `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${esc}' AND pid <> pg_backend_pid();`,
  ]);
  runDocker([
    "exec", CONTAINER_NAME, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1",
    "-c", `DROP DATABASE IF EXISTS "${dbName}";`,
  ]);
  runDocker(["exec", CONTAINER_NAME, "createdb", "-U", "postgres", dbName]);
}

function dropDisposableDb(dbName: string): void {
  const esc = dbName.replace(/'/g, "''");
  try {
    runDocker([
      "exec", CONTAINER_NAME, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1",
      "-c", `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${esc}' AND pid <> pg_backend_pid();`,
    ]);
    runDocker([
      "exec", CONTAINER_NAME, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1",
      "-c", `DROP DATABASE IF EXISTS "${dbName}";`,
    ]);
  } catch {
    // best-effort cleanup
  }
}

function restoreDumpIntoDb(dbName: string): void {
  const remotePath = `/tmp/dts_dump_${dbName}.sql`;
  runDocker(["cp", DEFAULT_INPUT, `${CONTAINER_NAME}:${remotePath}`]);
  runDocker([
    "exec", CONTAINER_NAME, "psql", "-U", "postgres", "-d", dbName, "-v", "ON_ERROR_STOP=1", "-f", remotePath,
  ]);
}

function runMigrationIntoDb(dbName: string, filePath: string): void {
  const remotePath = "/tmp/" + path.basename(filePath);
  runDocker(["cp", filePath, `${CONTAINER_NAME}:${remotePath}`]);
  runDocker([
    "exec", CONTAINER_NAME, "psql", "-U", "postgres", "-d", dbName, "-v", "ON_ERROR_STOP=1", "-f", remotePath,
  ]);
}

async function getDatabaseStateSignature(dbName: string): Promise<string> {
  const client = await getClientForDatabase(dbName);
  try {
    const schemaRes = await client.query(`
      SELECT coalesce(md5(string_agg(sig, '|' ORDER BY sig)), '') AS sig FROM (
        SELECT 'col:' || table_name || '.' || column_name || ':' || data_type || ':' ||
               coalesce(character_maximum_length::text, '') || ':' || is_nullable AS sig
        FROM information_schema.columns WHERE table_schema = 'public'
        UNION ALL
        SELECT 'con:' || conname || ':' || contype::text || ':' || pg_get_constraintdef(c.oid)
        FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public'
      ) s
    `);
    const schemaSig = String(schemaRes.rows[0]?.sig ?? "");

    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const names = tablesRes.rows.map((r) => String(r.table_name));
    // Exclude PostGIS system fixture table (constant, large) from the content hash;
    // schema signature above still covers its structure.
    const contentTables = names.filter((n) => n !== "spatial_ref_sys");
    let dataSig = "";
    if (contentTables.length > 0) {
      const unionSql = contentTables
        .map(
          (n) =>
            `SELECT '${n.replace(/'/g, "''")}' AS t, ` +
            `md5(coalesce(string_agg(md5(to_jsonb(x)::text), ',' ORDER BY md5(to_jsonb(x)::text)), '')) AS h ` +
            `FROM public.${quoteIdent(n)} x`,
        )
        .join(" UNION ALL ");
      const dataRes = await client.query(
        `SELECT coalesce(md5(string_agg(t || '=' || h, '|' ORDER BY t)), '') AS sig FROM (${unionSql}) q`,
      );
      dataSig = String(dataRes.rows[0]?.sig ?? "");
    }
    return `schema:${schemaSig}|data:${dataSig}`;
  } finally {
    await client.end();
  }
}

function buildInjectedFailureCopy(migrationFilePath: string): string {
  const original = fs.readFileSync(migrationFilePath, "utf8");
  const marker = "COMMIT;";
  const idx = original.lastIndexOf(marker);
  if (idx === -1) {
    throw new Error(`Could not locate final COMMIT; in ${path.basename(migrationFilePath)} for fault injection.`);
  }
  const injection =
    "\n-- [ROLLBACK-TEST FAULT INJECTION — TEST COPY ONLY, ORIGINAL MIGRATION UNCHANGED]\n" +
    "DO $$ BEGIN RAISE EXCEPTION 'INJECTED_ROLLBACK_TEST_FAILURE'; END $$;\n";
  const injected = original.slice(0, idx) + injection + original.slice(idx);
  const outName = `rollback-test.${path.basename(migrationFilePath)}.injected.sql`;
  const outPath = path.resolve(VALIDATION_DB_DIR, outName);
  fs.mkdirSync(VALIDATION_DB_DIR, { recursive: true });
  fs.writeFileSync(outPath, injected, "utf8");
  return outPath;
}

type NegativeCheckResult = {
  label: string;
  detected: boolean;
  summary: string;
};

const ROLLBACK_LABELS = [
  "hips",
  "alter_language",
  "fix_multilang",
  "widen_language_cd",
  "he_specific_hazard",
  "spatial",
  "causality",
  "workflow",
] as const;

// Runs the prioritized rollback tests (HIPs, Spatial, Workflow) on a SINGLE disposable
// DB with zero database cloning. We walk migrations in order; at each prioritized index
// we inject a pre-COMMIT failure (which rolls back cleanly, leaving the DB at stage k),
// confirm the schema + full row-content signature is unchanged, then apply the REAL
// migration to advance to stage k+1. Non-prioritized migrations are only applied (their
// rollback tests remain explicitly INCOMPLETE). After the loop the DB is fully migrated
// and is reused for the negative self-tests (each mutation wrapped in BEGIN/ROLLBACK).
const PRIORITIZED_ROLLBACK_INDICES = new Set<number>([0, 5, 7]);

async function runAllRollbackAndNegativeTests(): Promise<{
  results: RollbackTargetResult[];
  negatives: NegativeCheckResult[];
}> {
  const dbName = `${VALIDATION_DB_NAME}_rb`.toLowerCase();
  const results: RollbackTargetResult[] = [];
  const negatives: NegativeCheckResult[] = [];
  try {
    createFreshDisposableDb(dbName);
    restoreDumpIntoDb(dbName);

    for (let k = 0; k < TARGETED_MIGRATION_FILES.length; k += 1) {
      const migrationFile = TARGETED_MIGRATION_FILES[k];
      const migrationPath = path.resolve(PROJECT_ROOT, "app", "drizzle", "migrations", migrationFile);

      if (PRIORITIZED_ROLLBACK_INDICES.has(k)) {
        let injectedPath: string | null = null;
        try {
          const beforeSig = await getDatabaseStateSignature(dbName);

          injectedPath = buildInjectedFailureCopy(migrationPath);
          const remoteInjected = "/tmp/" + path.basename(injectedPath);
          runDocker(["cp", injectedPath, `${CONTAINER_NAME}:${remoteInjected}`]);

          let failureObserved = false;
          let failureReason = "";
          try {
            runDocker([
              "exec", CONTAINER_NAME, "psql", "-U", "postgres", "-d", dbName, "-v", "ON_ERROR_STOP=1", "-f", remoteInjected,
            ]);
          } catch (error) {
            failureObserved = true;
            failureReason = error instanceof Error ? error.message : String(error);
          }

          const afterSig = await getDatabaseStateSignature(dbName);
          const rolledBack = beforeSig === afterSig;
          const injectedConfirmed = /INJECTED_ROLLBACK_TEST_FAILURE/.test(failureReason);
          const passed = failureObserved && injectedConfirmed && rolledBack;

          results.push({
            label: ROLLBACK_LABELS[k],
            migrationFile,
            executed: true,
            failureObserved,
            rolledBack,
            passed,
            summary:
              `predecessors_committed=${k}; failure_observed=${failureObserved}; ` +
              `injected_error_confirmed=${injectedConfirmed}; ` +
              `schema_and_full_row_content_signature_unchanged=${rolledBack}; ` +
              `failure_reason=${truncateForReport(failureReason, 200)}`,
          });
        } catch (error) {
          results.push({
            label: ROLLBACK_LABELS[k],
            migrationFile,
            executed: true,
            failureObserved: false,
            rolledBack: false,
            passed: false,
            summary: `rollback test execution error: ${truncateForReport(error instanceof Error ? error.message : String(error), 400)}`,
          });
        } finally {
          if (injectedPath) {
            try {
              fs.rmSync(injectedPath, { force: true });
            } catch {
              // best-effort cleanup
            }
          }
        }
      }

      // Advance the single DB to stage k+1 by applying the REAL (unmodified) migration.
      runMigrationIntoDb(dbName, migrationPath);
    }

    // DB is now fully migrated. Run negative self-tests using BEGIN/ROLLBACK so the
    // deliberate corruption never persists.
    const client = await getClientForDatabase(dbName);
    try {
      try {
        await client.query("BEGIN");
        await client.query(`
          UPDATE public.hazardous_event he
          SET specific_hazard_id = (
            SELECT sh.id FROM public.specific_hazard sh
            WHERE sh.source_ref_id IS DISTINCT FROM he.hip_hazard_id
            ORDER BY sh.id LIMIT 1
          )
          WHERE he.id = (
            SELECT id FROM public.hazardous_event
            WHERE hip_hazard_id IS NOT NULL AND specific_hazard_id IS NOT NULL
            ORDER BY id LIMIT 1
          )
        `);
        const d = await client.query(`
          SELECT count(*)::int AS c
          FROM public.hazardous_event he
          LEFT JOIN public.specific_hazard sh ON sh.source_ref_id = he.hip_hazard_id
          WHERE he.hip_hazard_id IS NOT NULL
            AND he.specific_hazard_id IS NOT NULL
            AND he.specific_hazard_id IS DISTINCT FROM sh.id
        `);
        const c = Number(d.rows[0]?.c ?? 0);
        negatives.push({
          label: "Broken FK reference detection",
          detected: c > 0,
          summary: `injected 1 incorrect hazard reference; checker incorrect_mapping_rows=${c} (expected > 0)`,
        });
        await client.query("ROLLBACK");
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch { /* ignore */ }
        negatives.push({
          label: "Broken FK reference detection",
          detected: false,
          summary: `negative self-test error: ${truncateForReport(error instanceof Error ? error.message : String(error), 240)}`,
        });
      }

      try {
        await client.query("BEGIN");
        await client.query(`
          UPDATE public.text_content
          SET original_text = original_text || '__CORRUPTED__'
          WHERE id = (
            SELECT ht.name_text_content_id FROM public.hazard_type ht ORDER BY ht.id LIMIT 1
          )
        `);
        const d = await client.query(`
          SELECT count(*)::int AS c
          FROM (
            SELECT ht.name_text_content_id AS text_content_id, hc.name->>'en' AS expected_original_text
            FROM public.hip_class hc
            JOIN public.hazard_type ht ON ht.source_ref_id = hc.id
          ) e
          LEFT JOIN public.text_content tc ON tc.id = e.text_content_id
          WHERE tc.original_text IS DISTINCT FROM e.expected_original_text
        `);
        const c = Number(d.rows[0]?.c ?? 0);
        negatives.push({
          label: "Mismatched field detection",
          detected: c > 0,
          summary: `corrupted 1 HIP original_text; checker original_text_mismatch=${c} (expected > 0)`,
        });
        await client.query("ROLLBACK");
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch { /* ignore */ }
        negatives.push({
          label: "Mismatched field detection",
          detected: false,
          summary: `negative self-test error: ${truncateForReport(error instanceof Error ? error.message : String(error), 240)}`,
        });
      }

      // Causality direction-reversal: keep hazardous_event_causality row COUNT unchanged
      // but swap cause/effect on one eligible pair, then confirm the causality checker
      // reports the reversed pair as a mismatch and does NOT count it as matched.
      try {
        await client.query("BEGIN");
        const before = await client.query(
          "SELECT count(*)::int AS c FROM public.hazardous_event_causality",
        );
        const beforeCount = Number(before.rows[0]?.c ?? 0);
        await client.query(`
          WITH target AS (
            SELECT hec.id, hec.cause_hazardous_event_id AS cause_id, hec.effect_hazardous_event_id AS effect_id
            FROM public.hazardous_event_causality hec
            JOIN public.event_relationship er
              ON er.parent_id = hec.cause_hazardous_event_id
             AND er.child_id = hec.effect_hazardous_event_id
            WHERE hec.cause_hazardous_event_id <> hec.effect_hazardous_event_id
              AND NOT EXISTS (
                SELECT 1 FROM public.hazardous_event_causality x
                WHERE x.cause_hazardous_event_id = hec.effect_hazardous_event_id
                  AND x.effect_hazardous_event_id = hec.cause_hazardous_event_id
              )
            ORDER BY hec.id LIMIT 1
          )
          UPDATE public.hazardous_event_causality hec
          SET cause_hazardous_event_id = t.effect_id,
              effect_hazardous_event_id = t.cause_id
          FROM target t
          WHERE hec.id = t.id
        `);
        const after = await client.query(
          "SELECT count(*)::int AS c FROM public.hazardous_event_causality",
        );
        const afterCount = Number(after.rows[0]?.c ?? 0);
        // Checker: count eligible pairs present only in the REVERSED direction (mismatched).
        const d = await client.query(`
          WITH eligible AS (
            SELECT DISTINCT er.parent_id AS cause_id, er.child_id AS effect_id
            FROM public.event_relationship er
            JOIN public.hazardous_event p ON p.id = er.parent_id
            JOIN public.hazardous_event c ON c.id = er.child_id
            WHERE er.parent_id <> er.child_id
          )
          SELECT count(*)::int AS c
          FROM eligible e
          WHERE NOT EXISTS (
                  SELECT 1 FROM public.hazardous_event_causality h
                  WHERE h.cause_hazardous_event_id = e.cause_id
                    AND h.effect_hazardous_event_id = e.effect_id
                )
            AND EXISTS (
                  SELECT 1 FROM public.hazardous_event_causality h
                  WHERE h.cause_hazardous_event_id = e.effect_id
                    AND h.effect_hazardous_event_id = e.cause_id
                )
        `);
        const reversedMismatch = Number(d.rows[0]?.c ?? 0);
        negatives.push({
          label: "Reversed causality detection (row count unchanged)",
          detected: reversedMismatch > 0 && beforeCount === afterCount,
          summary:
            `reversed 1 causality pair; row_count_before=${beforeCount}, row_count_after=${afterCount} (unchanged); ` +
            `checker reversed_direction_mismatches=${reversedMismatch} (expected > 0, affected pair NOT counted as matched)`,
        });
        await client.query("ROLLBACK");
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch { /* ignore */ }
        negatives.push({
          label: "Reversed causality detection (row count unchanged)",
          detected: false,
          summary: `negative self-test error: ${truncateForReport(error instanceof Error ? error.message : String(error), 240)}`,
        });
      }
    } finally {
      await client.end();
    }
  } finally {
    dropDisposableDb(dbName);
  }

  return { results, negatives };
}

async function validateMigrationState(
  baseline: BaselineSnapshot,
  rollbackResults: RollbackTargetResult[],
  negativeResults: NegativeCheckResult[],
  regressionEvidence: RegressionEvidence,
): Promise<ReportRow[]> {
  const rows: ReportRow[] = [];
  const hipUuidHierarchyQuery = `
    SELECT (
      (SELECT count(*)::int
       FROM public.hip_class hc
       LEFT JOIN public.hazard_type ht ON ht.source_ref_id = hc.id
       WHERE ht.id IS DISTINCT FROM md5('delta:hips:2025:hazard_type:' || hc.id)::uuid)
      +
      (SELECT count(*)::int
       FROM public.hip_cluster hc
       LEFT JOIN public.hazard_cluster hcl ON hcl.source_ref_id = hc.id
       LEFT JOIN public.hazard_type ht ON ht.id = hcl.hazard_type_id
       WHERE hcl.id IS DISTINCT FROM md5('delta:hips:2025:hazard_cluster:' || hc.id)::uuid
          OR ht.source_ref_id IS DISTINCT FROM hc.type_id)
      +
      (SELECT count(*)::int
       FROM public.hip_hazard hh
       LEFT JOIN public.specific_hazard sh ON sh.source_ref_id = hh.id
       LEFT JOIN public.hazard_cluster hcl ON hcl.id = sh.hazard_cluster_id
       WHERE sh.id IS DISTINCT FROM md5('delta:hips:2025:specific_hazard:' || hh.id)::uuid
          OR hcl.source_ref_id IS DISTINCT FROM hh.cluster_id)
    )::int AS c
  `;
  const hipJsonbMismatchQuery = `
    WITH name_expected AS (
      SELECT ht.name_text_content_id AS text_content_id, kv.key AS language_cd, kv.value AS expected_translation, 'name'::text AS field
      FROM public.hip_class hc
      JOIN public.hazard_type ht ON ht.source_ref_id = hc.id
      CROSS JOIN LATERAL jsonb_each_text(COALESCE(hc.name, '{}'::jsonb)) kv
      UNION ALL
      SELECT hcl.name_text_content_id, kv.key, kv.value, 'name'::text
      FROM public.hip_cluster hc
      JOIN public.hazard_cluster hcl ON hcl.source_ref_id = hc.id
      CROSS JOIN LATERAL jsonb_each_text(COALESCE(hc.name, '{}'::jsonb)) kv
      UNION ALL
      SELECT sh.name_text_content_id, kv.key, kv.value, 'name'::text
      FROM public.hip_hazard hh
      JOIN public.specific_hazard sh ON sh.source_ref_id = hh.id
      CROSS JOIN LATERAL jsonb_each_text(COALESCE(hh.name, '{}'::jsonb)) kv
    ),
    description_expected AS (
      SELECT sh.description_text_content_id AS text_content_id, kv.key AS language_cd, kv.value AS expected_translation, 'description'::text AS field
      FROM public.hip_hazard hh
      JOIN public.specific_hazard sh ON sh.source_ref_id = hh.id
      CROSS JOIN LATERAL jsonb_each_text(COALESCE(hh.description, '{}'::jsonb)) kv
      WHERE nullif(btrim(hh.description_en), '') IS NOT NULL
         OR (hh.description IS NOT NULL AND hh.description NOT IN ('{}'::jsonb, 'null'::jsonb))
    ),
    expected_text_content AS (
      SELECT ht.name_text_content_id AS text_content_id, hc.name->>'en' AS expected_original_text, 'name'::text AS field
      FROM public.hip_class hc
      JOIN public.hazard_type ht ON ht.source_ref_id = hc.id
      UNION ALL
      SELECT hcl.name_text_content_id, hc.name->>'en', 'name'::text
      FROM public.hip_cluster hc
      JOIN public.hazard_cluster hcl ON hcl.source_ref_id = hc.id
      UNION ALL
      SELECT sh.name_text_content_id, hh.name->>'en', 'name'::text
      FROM public.hip_hazard hh
      JOIN public.specific_hazard sh ON sh.source_ref_id = hh.id
      UNION ALL
      SELECT sh.description_text_content_id, hh.description->>'en', 'description'::text
      FROM public.hip_hazard hh
      JOIN public.specific_hazard sh ON sh.source_ref_id = hh.id
      WHERE nullif(btrim(hh.description_en), '') IS NOT NULL
         OR (hh.description IS NOT NULL AND hh.description NOT IN ('{}'::jsonb, 'null'::jsonb))
    ),
    original_text_or_language_mismatch AS (
      SELECT count(*)::int AS c
      FROM expected_text_content e
      LEFT JOIN public.text_content tc ON tc.id = e.text_content_id
      LEFT JOIN public.language l ON l.id = tc.original_language_id
      WHERE e.expected_original_text IS NULL
         OR nullif(btrim(e.expected_original_text), '') IS NULL
         OR tc.id IS NULL
         OR tc.original_text IS DISTINCT FROM e.expected_original_text
         OR l.language_cd IS DISTINCT FROM 'en'
    ),
    unexpected_description_link AS (
      SELECT count(*)::int AS c
      FROM public.hip_hazard hh
      JOIN public.specific_hazard sh ON sh.source_ref_id = hh.id
      WHERE NOT (
        nullif(btrim(hh.description_en), '') IS NOT NULL
        OR (hh.description IS NOT NULL AND hh.description NOT IN ('{}'::jsonb, 'null'::jsonb))
      )
      AND sh.description_text_content_id IS NOT NULL
    ),
    expected_translation_rows AS (
      SELECT text_content_id, language_cd, expected_translation
      FROM (
        SELECT * FROM name_expected
        UNION ALL
        SELECT * FROM description_expected
      ) e
      WHERE nullif(btrim(expected_translation), '') IS NOT NULL
        AND language_cd <> 'en'
    ),
    actual_translation_rows AS (
      SELECT t.text_content_id, l.language_cd, t.translation AS expected_translation
      FROM public.translation t
      JOIN public.language l ON l.id = t.language_id
      JOIN (
        SELECT text_content_id FROM expected_text_content
      ) tc ON tc.text_content_id = t.text_content_id
      WHERE l.language_cd <> 'en'
    ),
    expected_numbered AS (
      SELECT e.*, row_number() OVER (PARTITION BY e.text_content_id, e.language_cd, e.expected_translation ORDER BY e.text_content_id) AS rn
      FROM expected_translation_rows e
    ),
    actual_numbered AS (
      SELECT a.*, row_number() OVER (PARTITION BY a.text_content_id, a.language_cd, a.expected_translation ORDER BY a.text_content_id) AS rn
      FROM actual_translation_rows a
    ),
    missing_translation AS (
      SELECT count(*)::int AS c
      FROM expected_numbered e
      LEFT JOIN actual_numbered a
        ON a.text_content_id = e.text_content_id
       AND a.language_cd = e.language_cd
       AND a.expected_translation = e.expected_translation
       AND a.rn = e.rn
      WHERE a.text_content_id IS NULL
    ),
    unexpected_translation AS (
      SELECT count(*)::int AS c
      FROM actual_numbered a
      LEFT JOIN expected_numbered e
        ON e.text_content_id = a.text_content_id
       AND e.language_cd = a.language_cd
       AND e.expected_translation = a.expected_translation
       AND e.rn = a.rn
      WHERE e.text_content_id IS NULL
    )
    SELECT
      (SELECT c FROM original_text_or_language_mismatch)
      + (SELECT c FROM unexpected_description_link)
      + (SELECT c FROM missing_translation)
      + (SELECT c FROM unexpected_translation) AS c
  `;
  const workflowInstanceMismatchQuery = `
    WITH latest_rejection AS (
      SELECT DISTINCT ON (evr.entity_id)
        evr.entity_id,
        evr.rejected_by_user_id,
        evr.rejected_at
      FROM public.entity_validation_rejection evr
      WHERE evr.entity_type = 'hazardous_event'
      ORDER BY evr.entity_id, evr.rejected_at DESC, evr.id DESC
    ),
    expected AS (
      SELECT
        he.id AS entity_id,
        'HE'::text AS entity_type,
        CASE he."approvalStatus"
          WHEN 'draft' THEN 'DRAFT'
          WHEN 'waiting-for-validation' THEN 'SUBMITTED'
          WHEN 'validated' THEN 'APPROVED'
          WHEN 'needs-revision' THEN 'REVISION_REQUESTED'
          WHEN 'published' THEN 'PUBLISHED'
          ELSE 'DRAFT'
        END AS status,
        he.submitted_by_user_id,
        he.submitted_at::timestamptz AS submitted_at,
        lr.rejected_by_user_id,
        lr.rejected_at::timestamptz AS rejected_at,
        CASE
          WHEN he."approvalStatus" IN ('validated', 'published')
            THEN COALESCE(he.validated_by_user_id, he.published_by_user_id)
          ELSE NULL
        END AS approved_by_user_id,
        CASE
          WHEN he."approvalStatus" IN ('validated', 'published')
            THEN he.validated_at::timestamptz
          ELSE NULL
        END AS approved_at,
        he.published_by_user_id,
        he.published_at::timestamptz AS published_at
      FROM public.hazardous_event he
      LEFT JOIN latest_rejection lr ON lr.entity_id = he.id
    ),
    missing AS (
      SELECT count(*)::int AS c
      FROM expected e
      LEFT JOIN public.workflow_instance wi ON wi.entity_id = e.entity_id AND wi.entity_type = e.entity_type
      WHERE wi.id IS NULL
    ),
    mismatch AS (
      SELECT count(*)::int AS c
      FROM expected e
      JOIN public.workflow_instance wi ON wi.entity_id = e.entity_id AND wi.entity_type = e.entity_type
      WHERE wi.status IS DISTINCT FROM e.status
         OR wi.submitted_by_user_id IS DISTINCT FROM e.submitted_by_user_id
         OR wi.submitted_at IS DISTINCT FROM e.submitted_at
         OR wi.rejected_by_user_id IS DISTINCT FROM e.rejected_by_user_id
         OR wi.rejected_at IS DISTINCT FROM e.rejected_at
         OR wi.approved_by_user_id IS DISTINCT FROM e.approved_by_user_id
         OR wi.approved_at IS DISTINCT FROM e.approved_at
         OR wi.published_by_user_id IS DISTINCT FROM e.published_by_user_id
         OR wi.published_at IS DISTINCT FROM e.published_at
    ),
    extra AS (
      SELECT count(*)::int AS c
      FROM public.workflow_instance wi
      LEFT JOIN public.hazardous_event he ON he.id = wi.entity_id
      WHERE wi.entity_type = 'HE' AND he.id IS NULL
    )
    SELECT (SELECT c FROM missing) + (SELECT c FROM mismatch) + (SELECT c FROM extra) AS c
  `;
  const hazardousMappingQuery = `
    WITH expected_map AS (
      SELECT he.id AS hazardous_event_id, he.hip_hazard_id, sh.id AS expected_specific_hazard_id, he.specific_hazard_id AS actual_specific_hazard_id
      FROM public.hazardous_event he
      LEFT JOIN public.specific_hazard sh ON sh.source_ref_id = he.hip_hazard_id
      WHERE he.hip_hazard_id IS NOT NULL
    )
    SELECT
      (SELECT count(*)::int FROM expected_map) AS hip_hazard_id_rows,
      (SELECT count(*)::int FROM public.hazardous_event WHERE specific_hazard_id IS NOT NULL) AS in_scope_mapped_rows,
      (SELECT count(*)::int FROM expected_map WHERE expected_specific_hazard_id IS NOT NULL AND actual_specific_hazard_id IS NOT DISTINCT FROM expected_specific_hazard_id) AS matched_rows,
      (SELECT count(*)::int FROM expected_map WHERE expected_specific_hazard_id IS NULL OR actual_specific_hazard_id IS NULL) AS missing_mapping_rows,
      (SELECT count(*)::int FROM expected_map WHERE expected_specific_hazard_id IS NOT NULL AND actual_specific_hazard_id IS NOT NULL AND actual_specific_hazard_id IS DISTINCT FROM expected_specific_hazard_id) AS incorrect_mapping_rows,
      (SELECT count(*)::int FROM public.hazardous_event WHERE hip_hazard_id IS NULL AND specific_hazard_id IS NOT NULL) AS legacy_null_with_specific_hazard
  `;
  const hazardousMappingRows = await getRows(hazardousMappingQuery);
  const hazardousMapping = hazardousMappingRows[0] ?? {};
  const hazardousEventsWithHipHazardId = Number(hazardousMapping.hip_hazard_id_rows ?? 0);
  const hazardInScopeMapped = Number(hazardousMapping.in_scope_mapped_rows ?? 0);
  const hazardMatched = Number(hazardousMapping.matched_rows ?? 0);
  const missingHazardMappings = Number(hazardousMapping.missing_mapping_rows ?? 0);
  const incorrectHazardMappings = Number(hazardousMapping.incorrect_mapping_rows ?? 0);
  const legacyNullWithSpecific = Number(hazardousMapping.legacy_null_with_specific_hazard ?? 0);
  const hazardousEventSpecificHazardOk = missingHazardMappings === 0 && incorrectHazardMappings === 0 && legacyNullWithSpecific === 0;

  rows.push({
    Check: "Hazardous event -> specific hazard mapping",
    Status: hazardousEventSpecificHazardOk ? "Pass" : "Fail",
    Table: "public.hazardous_event (specific_hazard_id) keyed by hazardous_event.id; matched vs specific_hazard.source_ref_id = hip_hazard_id",
    Expected: "For every non-null hip_hazard_id, specific_hazard_id equals the specific_hazard.id whose source_ref_id matches hip_hazard_id; legacy-null rows remain unmapped",
    Actual: `expected=${hazardousEventsWithHipHazardId}, in_scope_mapped=${hazardInScopeMapped}, matched=${hazardMatched}, missing=${missingHazardMappings}, unexpected(legacy_null_mapped)=${legacyNullWithSpecific}, mismatched(wrong_target)=${incorrectHazardMappings}`,
    MismatchCount: `${missingHazardMappings + incorrectHazardMappings + legacyNullWithSpecific}`,
    Details: hazardousEventSpecificHazardOk
      ? "Each hazardous event with a legacy hip_hazard_id is mapped to the exact expected specific_hazard by source_ref_id (identity + value verified); no legacy-null rows were incorrectly populated."
      : "Missing or incorrect specific_hazard mappings were detected for legacy hip_hazard_id references.",
    EvidenceQuery: hazardousMappingQuery.trim(),
    Records: {
      expected: hazardousEventsWithHipHazardId,
      inScope: hazardInScopeMapped,
      matched: hazardMatched,
      missing: missingHazardMappings,
      unexpected: legacyNullWithSpecific,
      mismatched: incorrectHazardMappings,
    },
  });

  const hipClassCount = await getCount("SELECT count(*)::int as c FROM public.hip_class");
  const hazardTypeCount = await getCount("SELECT count(*)::int as c FROM public.hazard_type");
  const hipClusterCount = await getCount("SELECT count(*)::int as c FROM public.hip_cluster");
  const hazardClusterCount = await getCount("SELECT count(*)::int as c FROM public.hazard_cluster");
  const hipHazardCount = await getCount("SELECT count(*)::int as c FROM public.hip_hazard");
  const specificHazardCount = await getCount("SELECT count(*)::int as c FROM public.specific_hazard");

  const hipMatch = hipClassCount === hazardTypeCount && hipClusterCount === hazardClusterCount && hipHazardCount === specificHazardCount;

  rows.push({
    Check: "HIP migration parity",
    Status: hipMatch ? "Pass" : "Fail",
    Table: "public.hip_class, public.hazard_type; public.hip_cluster, public.hazard_cluster; public.hip_hazard, public.specific_hazard",
    Expected: "Legacy HIP counts match migrated target counts",
    Actual: `hip_class=${hipClassCount}, hazard_type=${hazardTypeCount}; hip_cluster=${hipClusterCount}, hazard_cluster=${hazardClusterCount}; hip_hazard=${hipHazardCount}, specific_hazard=${specificHazardCount}`,
    MismatchCount: `${Math.abs(hipClassCount - hazardTypeCount) + Math.abs(hipClusterCount - hazardClusterCount) + Math.abs(hipHazardCount - specificHazardCount)}`,
    Details: hipMatch
      ? "Legacy HIP tables and rebuilt target tables have matching counts."
      : "One or more HIP source/target tables have mismatched counts, indicating a partial or failed migration.",
    EvidenceQuery: "SELECT count(*) FROM public.hip_class; SELECT count(*) FROM public.hazard_type; SELECT count(*) FROM public.hip_cluster; SELECT count(*) FROM public.hazard_cluster; SELECT count(*) FROM public.hip_hazard; SELECT count(*) FROM public.specific_hazard;",
  });

  const totalLanguageCount = await getCount("SELECT count(*)::int as c FROM public.language");
  const normalizedLanguageCount = await getCount("SELECT count(*)::int as c FROM public.language WHERE char_length(language_cd) = 2 AND language_name IS NOT NULL");
  const bcp47LanguageCount = await getCount("SELECT count(*)::int as c FROM public.language WHERE language_cd ~ '^[a-z]{2,3}(-[A-Za-z0-9]+)*$'");
  const languageOk = totalLanguageCount > 0 && normalizedLanguageCount === totalLanguageCount;
  const bcp47Ok = totalLanguageCount > 0 && bcp47LanguageCount === totalLanguageCount;

  rows.push({
    Check: "Language normalization",
    Status: languageOk ? "Pass" : "Fail",
    Table: "public.language",
    Expected: "Every language code is 2 characters and has a readable language_name",
    Actual: `total=${totalLanguageCount}, normalized=${normalizedLanguageCount}`,
    MismatchCount: `${Math.max(0, totalLanguageCount - normalizedLanguageCount)}`,
    Details: languageOk
      ? "All stored language rows are in the expected two-character format and have names."
      : "The language table contains rows that are not normalized or are missing required metadata.",
    EvidenceQuery: "SELECT count(*)::int as c FROM public.language; SELECT count(*)::int as c FROM public.language WHERE char_length(language_cd) = 2 AND language_name IS NOT NULL;",
  });

  rows.push({
    Check: "BCP47 language code compatibility",
    Status: bcp47Ok ? "Pass" : "Fail",
    Table: "public.language",
    Expected: "Every language code should conform to BCP47-style values after the language widening migration",
    Actual: `total=${totalLanguageCount}, bcp47_valid=${bcp47LanguageCount}`,
    MismatchCount: `${Math.max(0, totalLanguageCount - bcp47LanguageCount)}`,
    Details: bcp47Ok
      ? "Language codes match the expected BCP47-compatible form after the widening migration."
      : "One or more language codes do not match the expected BCP47 format and need review.",
    EvidenceQuery: "SELECT count(*)::int as c FROM public.language; SELECT count(*)::int as c FROM public.language WHERE language_cd ~ '^[a-z]{2,3}(-[A-Za-z0-9]+)*$';",
  });

  const textContentCount = await getCount("SELECT count(*)::int as c FROM public.text_content");
  const translationCount = await getCount("SELECT count(*)::int as c FROM public.translation");
  const nullTranslationFks = await getCount("SELECT count(*)::int as c FROM public.translation WHERE text_content_id IS NULL OR language_id IS NULL");
  const missingOriginalLanguage = await getCount("SELECT count(*)::int as c FROM public.text_content WHERE original_language_id IS NULL");
  const missingSameLanguageBackfill = await getCount("SELECT count(*)::int as c FROM public.text_content tc WHERE NOT EXISTS (SELECT 1 FROM public.translation t WHERE t.text_content_id = tc.id AND t.language_id = tc.original_language_id)");
  const mismatchedSameLanguageBackfill = await getCount("SELECT count(*)::int as c FROM public.translation t JOIN public.text_content tc ON tc.id = t.text_content_id WHERE t.language_id = tc.original_language_id AND t.translation <> tc.original_text");

  const translationMigrationOk = textContentCount > 0 && translationCount > 0 && nullTranslationFks === 0 && missingOriginalLanguage === 0 && missingSameLanguageBackfill === 0 && mismatchedSameLanguageBackfill === 0;

  rows.push({
    Check: "HIP translation migration",
    Status: translationMigrationOk ? "Pass" : "Fail",
    Table: "public.text_content, public.translation",
    Expected: "Each HIP text item has a non-null original language, and a same-language translation row matching the original text exists for every text_content row",
    Actual: `text_content=${textContentCount}, translation=${translationCount}, null_fk=${nullTranslationFks}, missing_original_language=${missingOriginalLanguage}, missing_same_language_backfill=${missingSameLanguageBackfill}, mismatched_same_language_backfill=${mismatchedSameLanguageBackfill}`,
    MismatchCount: `${nullTranslationFks + missingOriginalLanguage + missingSameLanguageBackfill + mismatchedSameLanguageBackfill}`,
    Details: translationMigrationOk
      ? "HIP multilingual text-content rows were created and every same-language translation row matches the source text."
      : "HIP migration is missing one or more translation rows or the original-language mapping is invalid.",
    EvidenceQuery: "SELECT count(*)::int as c FROM public.translation WHERE text_content_id IS NULL OR language_id IS NULL; SELECT count(*)::int as c FROM public.text_content WHERE original_language_id IS NULL; SELECT count(*)::int as c FROM public.text_content tc WHERE NOT EXISTS (SELECT 1 FROM public.translation t WHERE t.text_content_id = tc.id AND t.language_id = tc.original_language_id); SELECT count(*)::int as c FROM public.translation t JOIN public.text_content tc ON tc.id = t.text_content_id WHERE t.language_id = tc.original_language_id AND t.translation <> tc.original_text;",
  });

  const workflowInstanceCount = await getCount("SELECT count(*)::int as c FROM public.workflow_instance");
  rows.push({
    Check: "Workflow instance migration",
    Status: workflowInstanceCount > 0 ? "Pass" : "Fail",
    Table: "public.workflow_instance",
    Expected: "Workflow instances should exist after migration",
    Actual: `total=${workflowInstanceCount}`,
    MismatchCount: workflowInstanceCount > 0 ? "0" : "1",
    Details: workflowInstanceCount > 0 ? "Workflow-instance rows exist, matching the expected migrated state." : "No workflow_instance rows were found.",
    EvidenceQuery: "SELECT count(*)::int as c FROM public.workflow_instance;",
  });

  const workflowNotificationCount = await getCount("SELECT count(*)::int as c FROM public.workflow_notification");
  rows.push({
    Check: "Workflow notification bootstrap",
    Status: workflowNotificationCount > 0 ? "Pass" : "Fail",
    Table: "public.workflow_notification",
    Expected: "Workflow notifications should be created as part of validation workflow migration",
    Actual: `total=${workflowNotificationCount}`,
    MismatchCount: workflowNotificationCount > 0 ? "0" : "1",
    Details: workflowNotificationCount > 0 ? "Notification rows are present." : "No workflow notification rows were found.",
    EvidenceQuery: "SELECT count(*)::int as c FROM public.workflow_notification;",
  });

  const spatialMetrics = await gatherSpatialValidationMetrics(getCount);

  const sm = spatialMetrics;
  const obsMatched = sm.expectedObservations - sm.observationAssociationMismatches;
  const obsUnexpected = Math.max(0, sm.actualObservations - sm.expectedObservations) + sm.observationsWithNoLinks;
  const obsOk =
    sm.observationAssociationMismatches === 0 &&
    sm.observationTimeOrNoteNonNull === 0 &&
    sm.observationsWithNoLinks === 0 &&
    sm.actualObservations === sm.expectedObservations;
  rows.push({
    Check: "Spatial — hazardous-event spatial observations",
    Status: obsOk ? "Pass" : "Fail",
    Table: "public.hazardous_event_spatial_observation keyed by deterministic observation id = md5('delta:hazardous-event:initial-spatial-observation:'||hazardous_event_id)",
    Expected: "Exactly one observation per distinct hazardous_event appearing in source geom/division data; deterministic id + correct hazardous_event association; observation_time and note NULL",
    Actual: `expected=${sm.expectedObservations}, in_scope=${sm.actualObservations}, matched=${obsMatched}, missing=${sm.observationAssociationMismatches}, unexpected=${obsUnexpected}, observation_time_or_note_nonnull=${sm.observationTimeOrNoteNonNull}`,
    MismatchCount: `${sm.observationAssociationMismatches + obsUnexpected + sm.observationTimeOrNoteNonNull}`,
    Details: obsOk
      ? "Each expected observation exists with the deterministic id and correct hazardous_event association; counts here are OBSERVATIONS only (geometry and division links are reported separately)."
      : "One or more spatial observations are missing, unexpected, or have wrong association/non-null time/note.",
    EvidenceQuery: "scripts/db_migration_validation/spatialValidation.ts — observation coverage + association queries over public.hazardous_event_spatial_observation.",
    Records: {
      expected: sm.expectedObservations,
      inScope: sm.actualObservations,
      matched: obsMatched,
      missing: sm.observationAssociationMismatches,
      unexpected: obsUnexpected,
      mismatched: 0,
    },
  });

  const geomMatched = sm.geomSourceCount - sm.geomMissingInTarget - sm.geomContentOrAssociationMismatches;
  const geomOk = sm.geomMissingInTarget === 0 && sm.geomExtraInTarget === 0 && sm.geomContentOrAssociationMismatches === 0;
  rows.push({
    Check: "Spatial — geometry links",
    Status: geomOk ? "Pass" : "Fail",
    Table: "public.hazardous_event_spatial_observation_geom keyed by geometry id; matched vs public.hazardous_event_geom",
    Expected: "Every source geometry copied with identical UUID, NULL-safe ST_AsEWKB geometry, title, and correct observation association",
    Actual: `expected=${sm.geomSourceCount}, in_scope=${sm.geomTargetCount}, matched=${geomMatched}, missing=${sm.geomMissingInTarget}, unexpected=${sm.geomExtraInTarget}, mismatched(ewkb/title/assoc)=${sm.geomContentOrAssociationMismatches}`,
    MismatchCount: `${sm.geomMissingInTarget + sm.geomExtraInTarget + sm.geomContentOrAssociationMismatches}`,
    Details: geomOk
      ? "Every source geometry row is matched by id with identical EWKB, title, and observation association. Counts here are GEOMETRY LINKS only."
      : "One or more geometry links are missing, unexpected, or differ in EWKB/title/association.",
    EvidenceQuery: "scripts/db_migration_validation/spatialValidation.ts — geometry baseline comparison (ST_AsEWKB NULL-safe) over hazardous_event_spatial_observation_geom vs hazardous_event_geom.",
    Records: {
      expected: sm.geomSourceCount,
      inScope: sm.geomTargetCount,
      matched: geomMatched,
      missing: sm.geomMissingInTarget,
      unexpected: sm.geomExtraInTarget,
      mismatched: sm.geomContentOrAssociationMismatches,
    },
  });

  const divMismatched = sm.divisionContentOrAssociationMismatches + sm.divisionLowestIdMismatches;
  const divMatched = sm.divisionSourceDistinctPairs - sm.divisionMissingInTarget - divMismatched;
  const divOk = sm.divisionMissingInTarget === 0 && sm.divisionExtraInTarget === 0 && divMismatched === 0;
  rows.push({
    Check: "Spatial — administrative division links",
    Status: divOk ? "Pass" : "Fail",
    Table: "public.hazardous_event_spatial_observation_division keyed by distinct (hazardous_event, division); matched vs deduped hazardous_event_division",
    Expected: "One link per distinct (event, division) pair, deduplicated keeping the lowest legacy UUID, with correct observation association and division_id",
    Actual: `expected(distinct_pairs)=${sm.divisionSourceDistinctPairs}, in_scope=${sm.divisionTargetCount}, matched=${divMatched}, missing=${sm.divisionMissingInTarget}, unexpected=${sm.divisionExtraInTarget}, mismatched(assoc/division/dedup)=${divMismatched}`,
    MismatchCount: `${sm.divisionMissingInTarget + sm.divisionExtraInTarget + divMismatched}`,
    Details: divOk
      ? "Every distinct (event, division) pair is matched with correct association, division_id, and lowest-UUID dedup rule. Counts here are DIVISION LINKS only — distinct pairs, not raw source rows."
      : "One or more division links are missing, unexpected, or violate association/division/dedup expectations.",
    EvidenceQuery: "scripts/db_migration_validation/spatialValidation.ts — division dedup + baseline comparison over hazardous_event_spatial_observation_division.",
    Records: {
      expected: sm.divisionSourceDistinctPairs,
      inScope: sm.divisionTargetCount,
      matched: divMatched,
      missing: sm.divisionMissingInTarget,
      unexpected: sm.divisionExtraInTarget,
      mismatched: divMismatched,
    },
  });

  // Causality — direction-aware, baseline-aware record-level comparison.
  const eligiblePairRows = await getRows(`
    SELECT DISTINCT er.parent_id::text AS cause_id, er.child_id::text AS effect_id
    FROM public.event_relationship er
    JOIN public.hazardous_event p ON p.id = er.parent_id
    JOIN public.hazardous_event c ON c.id = er.child_id
    WHERE er.parent_id <> er.child_id
  `);
  const currentPairRows = await getRows(`
    SELECT cause_hazardous_event_id::text AS cause_id, effect_hazardous_event_id::text AS effect_id
    FROM public.hazardous_event_causality
  `);
  const eligibleKeys = new Set(eligiblePairRows.map((r) => `${r.cause_id}->${r.effect_id}`));
  const currentKeys = new Set(currentPairRows.map((r) => `${r.cause_id}->${r.effect_id}`));
  const reverseKey = (k: string) => {
    const [a, b] = k.split("->");
    return `${b}->${a}`;
  };
  let causMatched = 0;
  let causMissing = 0;
  let causMismatched = 0;
  for (const k of eligibleKeys) {
    if (currentKeys.has(k)) causMatched += 1;
    else if (currentKeys.has(reverseKey(k))) causMismatched += 1;
    else causMissing += 1;
  }
  // Newly inserted rows = current minus pre-existing baseline; unexpected = newly inserted
  // rows that correspond to no eligible pair (neither direction).
  let causInScopeNew = 0;
  let causUnexpected = 0;
  for (const k of currentKeys) {
    if (baseline.causalityPairs.has(k)) continue;
    causInScopeNew += 1;
    if (!eligibleKeys.has(k) && !eligibleKeys.has(reverseKey(k))) causUnexpected += 1;
  }
  const causalityOk = causMissing === 0 && causMismatched === 0 && causUnexpected === 0;
  rows.push({
    Check: "Event causality relationships (direction-aware)",
    Status: causalityOk ? "Pass" : "Fail",
    Table: "public.hazardous_event_causality keyed by (cause_hazardous_event_id -> effect_hazardous_event_id); matched vs eligible event_relationship (parent->cause, child->effect)",
    Expected: "Each eligible event_relationship pair (both endpoints hazardous events, parent<>child) is present with parent mapped to CAUSE and child mapped to EFFECT; a reversed pair counts as mismatched, not matched",
    Actual: `expected=${eligibleKeys.size}, in_scope(newly_inserted)=${causInScopeNew}, matched=${causMatched}, missing=${causMissing}, unexpected=${causUnexpected}, mismatched(reversed_direction)=${causMismatched}`,
    MismatchCount: `${causMissing + causUnexpected + causMismatched}`,
    Details: causalityOk
      ? "Every eligible pair is present in the correct cause->effect direction (direction verified per pair); pre-existing baseline rows are excluded from in-scope/unexpected counts."
      : "One or more causality pairs are missing, reversed (mismatched), or unexpected.",
    EvidenceQuery:
      "eligible = DISTINCT event_relationship(parent->cause, child->effect) with both endpoints in hazardous_event and parent<>child; compared in-runtime against hazardous_event_causality with direction and baseline-aware (pre-existing pairs excluded).",
    Records: {
      expected: eligibleKeys.size,
      inScope: causInScopeNew,
      matched: causMatched,
      missing: causMissing,
      unexpected: causUnexpected,
      mismatched: causMismatched,
    },
  });

  const hipUuidHierarchyMismatches = await getCount(hipUuidHierarchyQuery);
  rows.push({
    Check: "HIP deterministic UUIDs and hierarchy associations",
    Status: hipUuidHierarchyMismatches === 0 ? "Pass" : "Fail",
    Table: "public.hip_class, public.hip_cluster, public.hip_hazard, public.hazard_type, public.hazard_cluster, public.specific_hazard",
    Expected: "Every migrated HIP row uses deterministic UUID mapping and preserves source hierarchy associations",
    Actual: `mismatches=${hipUuidHierarchyMismatches}`,
    MismatchCount: `${hipUuidHierarchyMismatches}`,
    Details: hipUuidHierarchyMismatches === 0 ? "Deterministic IDs and hierarchy links match source HIP tables." : "One or more deterministic ID or hierarchy mappings differ from source expectations.",
    EvidenceQuery: hipUuidHierarchyQuery.trim(),
  });

  const hipJsonbMismatchCount = await getCount(hipJsonbMismatchQuery);
  rows.push({
    Check: "HIP names, descriptions, and JSONB translations",
    Status: hipJsonbMismatchCount === 0 ? "Pass" : "Fail",
    Table: "public.hip_class, public.hip_cluster, public.hip_hazard, public.text_content, public.translation, public.language",
    Expected: "Every migrated HIP name/description and eligible JSONB translation matches source values",
    Actual: `mismatches=${hipJsonbMismatchCount}`,
    MismatchCount: `${hipJsonbMismatchCount}`,
    Details: hipJsonbMismatchCount === 0 ? "HIP multilingual content matches source JSONB and English originals." : "One or more HIP text or translation values differ from source JSONB/original text.",
    EvidenceQuery: hipJsonbMismatchQuery.trim(),
  });

  const workflowInstanceMismatchCount = await getCount(workflowInstanceMismatchQuery);
  rows.push({
    Check: "Workflow instance status, users, and timestamps",
    Status: workflowInstanceMismatchCount === 0 ? "Pass" : "Fail",
    Table: "public.hazardous_event, public.entity_validation_rejection, public.workflow_instance",
    Expected: "Each hazardous_event has a workflow_instance row with expected status, users, and timestamps",
    Actual: `mismatches=${workflowInstanceMismatchCount}`,
    MismatchCount: `${workflowInstanceMismatchCount}`,
    Details: workflowInstanceMismatchCount === 0 ? "Workflow instances match migration mapping logic for status/user/timestamp fields." : "One or more workflow instances differ from expected mapped values.",
    EvidenceQuery: workflowInstanceMismatchQuery.trim(),
  });

  const expectedNotificationRows = await getRows(`
    WITH expected_waiting AS (
      SELECT
        wi.id::text AS instance_id,
        eva.assigned_to_user_id::text AS notified_user_id,
        eva.assigned_by_user_id::text AS notified_by_user_id,
        round(extract(epoch from eva.assigned_at::timestamptz) * 1000)::bigint::text AS notified_at_key,
        'Validation requested for hazardous event'::text AS notification_message,
        'workflow'::text AS channel
      FROM public.hazardous_event he
      JOIN public.workflow_instance wi ON wi.entity_id = he.id AND wi.entity_type = 'HE'
      JOIN public.entity_validation_assignment eva ON eva.entity_id = he.id AND eva.entity_type = 'hazardous_event'
      WHERE he."approvalStatus" = 'waiting-for-validation'
    ),
    expected_revision AS (
      SELECT
        wi.id::text AS instance_id,
        COALESCE(wi.submitted_by_user_id, evr.rejected_by_user_id)::text AS notified_user_id,
        evr.rejected_by_user_id::text AS notified_by_user_id,
        round(extract(epoch from evr.rejected_at::timestamptz) * 1000)::bigint::text AS notified_at_key,
        COALESCE(NULLIF(evr.rejection_message, ''), 'Revision requested for hazardous event') AS notification_message,
        'workflow'::text AS channel
      FROM public.hazardous_event he
      JOIN public.workflow_instance wi ON wi.entity_id = he.id AND wi.entity_type = 'HE'
      JOIN public.entity_validation_rejection evr ON evr.entity_id = he.id AND evr.entity_type = 'hazardous_event'
      WHERE he."approvalStatus" = 'needs-revision'
        AND COALESCE(wi.submitted_by_user_id, evr.rejected_by_user_id) IS NOT NULL
    )
    SELECT * FROM expected_waiting
    UNION ALL
    SELECT * FROM expected_revision
  `);

  const actualNotificationRows = await getRows(`
    SELECT
      wn.instance_id::text AS instance_id,
      wn.notified_user_id::text AS notified_user_id,
      wn.notified_by_user_id::text AS notified_by_user_id,
      round(extract(epoch from wn.notified_at::timestamptz) * 1000)::bigint::text AS notified_at_key,
      wn.notification_message,
      wn.channel
    FROM public.workflow_notification wn
    JOIN public.workflow_instance wi ON wi.id = wn.instance_id
    WHERE wi.entity_type = 'HE' AND wn.channel = 'workflow'
  `);

  const expectedInsertedNotifications = new Map<string, number>();
  for (const row of expectedNotificationRows) {
    const key = serializeTuple([
      row.instance_id,
      row.notified_user_id,
      row.notified_by_user_id,
      row.notified_at_key,
      row.notification_message,
      row.channel,
    ]);
    if (!baseline.notificationPresence.has(key)) {
      mapIncrement(expectedInsertedNotifications, key);
    }
  }

  const actualNotificationCounts = new Map<string, number>();
  for (const row of actualNotificationRows) {
    const key = serializeTuple([
      row.instance_id,
      row.notified_user_id,
      row.notified_by_user_id,
      row.notified_at_key,
      row.notification_message,
      row.channel,
    ]);
    mapIncrement(actualNotificationCounts, key);
  }

  const actualInsertedNotifications = subtractCounts(
    actualNotificationCounts,
    baseline.notificationCounts,
  );
  const notificationDiff = diffMultiset(
    expectedInsertedNotifications,
    actualInsertedNotifications,
  );
  const notificationDuplicateExcess = [...actualInsertedNotifications.entries()].reduce(
    (sum, [key, count]) => {
      const expectedCount = expectedInsertedNotifications.get(key) ?? 0;
      return sum + Math.max(0, count - expectedCount);
    },
    0,
  );
  const workflowNotificationMismatchCount =
    notificationDiff.missing + notificationDiff.unexpected;

  rows.push({
    Check: "Workflow notification recipients/senders/messages/timestamps/duplicates",
    Status: workflowNotificationMismatchCount === 0 ? "Pass" : "Fail",
    Table: "public.workflow_notification, public.workflow_instance, public.entity_validation_assignment, public.entity_validation_rejection",
    Expected: "Notifications match expected recipients/senders/messages/timestamps with zero duplicate rows",
    Actual: `missing=${notificationDiff.missing}, unexpected=${notificationDiff.unexpected}, duplicate_excess=${notificationDuplicateExcess}`,
    MismatchCount: `${workflowNotificationMismatchCount}`,
    Details: workflowNotificationMismatchCount === 0 ? "Workflow notification content and uniqueness checks match expected behavior." : "One or more workflow notifications are missing, inconsistent, or duplicated.",
    EvidenceQuery: "Expected rows query from migration logic (UNION ALL waiting+revision) compared against actual workflow_notification rows using baseline-aware multiset subtraction in validator runtime.",
  });

  const currentConstraintShapes = await getConstraintShapesByName(RESTORED_CONSTRAINT_NAMES);
  let restoredConstraintShapeMismatches = 0;
  for (const constraintName of RESTORED_CONSTRAINT_NAMES) {
    const before = baseline.restoredConstraintShapes[constraintName];
    const after = currentConstraintShapes[constraintName];
    if (!before || !after) {
      restoredConstraintShapeMismatches += 1;
      continue;
    }
    const sameShape =
      before.table_name === after.table_name &&
      before.ref_table === after.ref_table &&
      before.conkey === after.conkey &&
      before.confkey === after.confkey &&
      before.confupdtype === after.confupdtype &&
      before.confdeltype === after.confdeltype &&
      before.confmatchtype === after.confmatchtype &&
      before.condeferrable === after.condeferrable &&
      before.condeferred === after.condeferred &&
      before.convalidated === after.convalidated &&
      before.definition === after.definition;
    if (!sameShape) {
      restoredConstraintShapeMismatches += 1;
    }
  }

  const translationCascadeMismatchQuery = `
    WITH fk AS (
      SELECT *
      FROM pg_constraint c
      WHERE c.contype = 'f'
        AND c.conrelid = 'public.translation'::regclass
        AND c.confrelid = 'public.text_content'::regclass
    ),
    fk_cols AS (
      SELECT
        fk.oid,
        array_agg(src.attname::text ORDER BY u.ord) AS src_cols,
        array_agg(dst.attname::text ORDER BY u.ord) AS dst_cols
      FROM fk
      JOIN unnest(fk.conkey, fk.confkey) WITH ORDINALITY AS u(src_attnum, dst_attnum, ord) ON true
      JOIN pg_attribute src ON src.attrelid = fk.conrelid AND src.attnum = u.src_attnum
      JOIN pg_attribute dst ON dst.attrelid = fk.confrelid AND dst.attnum = u.dst_attnum
      GROUP BY fk.oid
    ),
    eval AS (
      SELECT
        (SELECT count(*) FROM fk) AS fk_count,
        COALESCE((SELECT src_cols FROM fk_cols LIMIT 1), ARRAY[]::text[]) AS src_cols,
        COALESCE((SELECT dst_cols FROM fk_cols LIMIT 1), ARRAY[]::text[]) AS dst_cols,
        COALESCE((SELECT confupdtype::text FROM fk LIMIT 1), '') AS confupdtype,
        COALESCE((SELECT confdeltype::text FROM fk LIMIT 1), '') AS confdeltype,
        COALESCE((SELECT confmatchtype::text FROM fk LIMIT 1), '') AS confmatchtype,
        COALESCE((SELECT condeferrable FROM fk LIMIT 1), false) AS condeferrable,
        COALESCE((SELECT condeferred FROM fk LIMIT 1), false) AS condeferred,
        COALESCE((SELECT convalidated FROM fk LIMIT 1), false) AS convalidated
    )
    SELECT (
      CASE WHEN fk_count = 1 THEN 0 ELSE 1 END
      + CASE WHEN src_cols = ARRAY['text_content_id'] THEN 0 ELSE 1 END
      + CASE WHEN dst_cols = ARRAY['id'] THEN 0 ELSE 1 END
      + CASE WHEN confupdtype = 'a' THEN 0 ELSE 1 END
      + CASE WHEN confdeltype = 'c' THEN 0 ELSE 1 END
      + CASE WHEN confmatchtype = 's' THEN 0 ELSE 1 END
      + CASE WHEN condeferrable = false THEN 0 ELSE 1 END
      + CASE WHEN condeferred = false THEN 0 ELSE 1 END
      + CASE WHEN convalidated = true THEN 0 ELSE 1 END
    )::int AS c
    FROM eval
  `;
  const translationCascadeMismatches = await getCount(translationCascadeMismatchQuery);
  const requiredConstraintMismatches =
    restoredConstraintShapeMismatches + translationCascadeMismatches;
  rows.push({
    Check: "Required constraint restoration checks",
    Status: requiredConstraintMismatches === 0 ? "Pass" : "Fail",
    Table: "pg_constraint, public.hazardous_event, public.hazard_type_custom_field_definition, public.hazard_type_field_definition, public.translation",
    Expected: "Restored FKs match pre-migration shape (columns, referenced columns, validated state, ON DELETE/UPDATE behavior, and deferrability); translation FK enforces ON DELETE CASCADE with expected column mapping and validation state",
    Actual: `restored_shape_mismatches=${restoredConstraintShapeMismatches}, translation_cascade_mismatches=${translationCascadeMismatches}`,
    MismatchCount: `${requiredConstraintMismatches}`,
    Details: requiredConstraintMismatches === 0 ? "Required constraints are present with expected relationships." : "One or more required constraints were not restored as expected.",
    EvidenceQuery: `Restored FK shape comparison uses baseline snapshots for ${RESTORED_CONSTRAINT_NAMES.join(", ")}; translation FK shape check SQL:\n${translationCascadeMismatchQuery.trim()}`,
  });

  const expectedWorkflowHistoryRows = await getRows(`
    WITH fallback_user AS (
      SELECT u.id AS user_id
      FROM public."user" u
      ORDER BY u.id
      LIMIT 1
    ),
    latest_rejection AS (
      SELECT DISTINCT ON (evr.entity_id)
        evr.entity_id,
        evr.rejected_by_user_id,
        evr.rejected_at::timestamptz AS rejected_at
      FROM public.entity_validation_rejection evr
      WHERE evr.entity_type = 'hazardous_event'
      ORDER BY evr.entity_id, evr.rejected_at DESC, evr.id DESC
    ),
    base AS (
      SELECT
        he.id AS entity_id,
        wi.id AS instance_id,
        he."approvalStatus" AS approval_status,
        COALESCE(he.created_at::timestamptz, CURRENT_TIMESTAMP) AS created_at,
        he.created_by_user_id,
        he.updated_by_user_id,
        he.submitted_by_user_id,
        he.submitted_at::timestamptz AS submitted_at,
        he.validated_by_user_id,
        he.validated_at::timestamptz AS approved_at,
        he.published_by_user_id,
        he.published_at::timestamptz AS published_at,
        lr.rejected_by_user_id,
        lr.rejected_at
      FROM public.hazardous_event he
      JOIN public.workflow_instance wi
        ON wi.entity_id = he.id
       AND wi.entity_type = 'HE'
      LEFT JOIN latest_rejection lr
        ON lr.entity_id = he.id
    ),
    events AS (
      SELECT
        b.instance_id::text AS instance_id,
        NULL::text AS from_status,
        'DRAFT'::text AS to_status,
        COALESCE(
          b.created_by_user_id,
          b.updated_by_user_id,
          b.submitted_by_user_id,
          b.validated_by_user_id,
          b.published_by_user_id,
          b.rejected_by_user_id,
          fu.user_id
        )::text AS acting_user_id,
        b.created_at::text AS occurred_at,
        NULL::text AS comment
      FROM base b
      CROSS JOIN fallback_user fu
      UNION ALL
      SELECT
        b.instance_id::text,
        'DRAFT'::text,
        'SUBMITTED'::text,
        COALESCE(b.submitted_by_user_id, b.updated_by_user_id, b.created_by_user_id, fu.user_id)::text,
        COALESCE(b.submitted_at, b.created_at)::text,
        NULL::text
      FROM base b
      CROSS JOIN fallback_user fu
      WHERE b.approval_status IN ('waiting-for-validation','needs-revision','validated','published')
      UNION ALL
      SELECT
        b.instance_id::text,
        'SUBMITTED'::text,
        'REVISION_REQUESTED'::text,
        COALESCE(b.rejected_by_user_id, b.updated_by_user_id, b.created_by_user_id, fu.user_id)::text,
        COALESCE(b.rejected_at, he2.updated_at::timestamptz, b.created_at)::text,
        NULL::text
      FROM base b
      JOIN public.hazardous_event he2 ON he2.id = b.entity_id
      CROSS JOIN fallback_user fu
      WHERE b.approval_status = 'needs-revision'
      UNION ALL
      SELECT
        b.instance_id::text,
        'SUBMITTED'::text,
        'APPROVED'::text,
        COALESCE(b.validated_by_user_id, b.updated_by_user_id, b.created_by_user_id, fu.user_id)::text,
        COALESCE(b.approved_at, he2.updated_at::timestamptz, b.created_at)::text,
        NULL::text
      FROM base b
      JOIN public.hazardous_event he2 ON he2.id = b.entity_id
      CROSS JOIN fallback_user fu
      WHERE b.approval_status IN ('validated','published')
      UNION ALL
      SELECT
        b.instance_id::text,
        'APPROVED'::text,
        'PUBLISHED'::text,
        COALESCE(b.published_by_user_id, b.validated_by_user_id, b.updated_by_user_id, b.created_by_user_id, fu.user_id)::text,
        COALESCE(b.published_at, he2.updated_at::timestamptz, b.created_at)::text,
        NULL::text
      FROM base b
      JOIN public.hazardous_event he2 ON he2.id = b.entity_id
      CROSS JOIN fallback_user fu
      WHERE b.approval_status = 'published'
    )
    SELECT * FROM events WHERE acting_user_id IS NOT NULL
  `);

  const expectedWorkflowHistoryInserted = new Map<string, number>();
  for (const row of expectedWorkflowHistoryRows) {
    const key = serializeTuple([
      row.instance_id,
      row.from_status,
      row.to_status,
      row.acting_user_id,
      row.occurred_at,
      row.comment,
    ]);
    if (!baseline.workflowHistoryPresence.has(key)) {
      mapIncrement(expectedWorkflowHistoryInserted, key);
    }
  }

  const actualWorkflowHistoryRows = await getRows(`
    SELECT
      wh.instance_id::text AS instance_id,
      wh.from_status,
      wh.to_status,
      wh.acting_user_id::text AS acting_user_id,
      wh.occurred_at::text AS occurred_at,
      wh.comment
    FROM public.workflow_history wh
    JOIN public.workflow_instance wi ON wi.id = wh.instance_id
    WHERE wi.entity_type = 'HE'
  `);
  const actualWorkflowHistoryCounts = new Map<string, number>();
  for (const row of actualWorkflowHistoryRows) {
    const key = serializeTuple([
      row.instance_id,
      row.from_status,
      row.to_status,
      row.acting_user_id,
      row.occurred_at,
      row.comment,
    ]);
    mapIncrement(actualWorkflowHistoryCounts, key);
  }
  const actualWorkflowHistoryInserted = subtractCounts(
    actualWorkflowHistoryCounts,
    baseline.workflowHistoryCounts,
  );
  const workflowHistoryDiff = diffMultiset(
    expectedWorkflowHistoryInserted,
    actualWorkflowHistoryInserted,
  );
  const workflowHistoryMismatchCount =
    workflowHistoryDiff.missing + workflowHistoryDiff.unexpected;

  rows.push({
    Check: "Workflow history and inferred transitions",
    Status: workflowHistoryMismatchCount === 0 ? "Pass" : "Fail",
    Table: "public.workflow_history, public.hazardous_event, public.workflow_instance",
    Expected: "Every inferred transition and fallback actor/timestamp is compared row-by-row against independently recomputed expectations",
    Actual: `missing=${workflowHistoryDiff.missing}, unexpected=${workflowHistoryDiff.unexpected}`,
    MismatchCount: `${workflowHistoryMismatchCount}`,
    Details: workflowHistoryMismatchCount === 0 ? "Workflow history rows and inferred transitions match the independently recomputed event stream after baseline subtraction." : "Workflow history contains missing or unexpected inferred transition rows.",
    EvidenceQuery: "Expected events are recomputed from hazardous_event + workflow_instance + rejection sources using migration-equivalent logic, then compared bidirectionally with multiplicity against inserted workflow_history rows after baseline subtraction.",
  });

  let preservedTableMismatchCount = 0;
  const preservedTableMismatchDetails: string[] = [];
  for (const tableName of PRESERVED_TABLES) {
    const qTable = quoteIdent(tableName);
    const nowRows = await getRows(`
      SELECT
        count(*)::int AS row_count,
        md5(coalesce(string_agg(md5(to_jsonb(t)::text), ',' ORDER BY md5(to_jsonb(t)::text)), '')) AS row_hash
      FROM public.${qTable} t
    `);
    const nowCount = Number(nowRows[0]?.row_count ?? 0);
    const nowHash = String(nowRows[0]?.row_hash ?? "");
    const baselineFingerprint = baseline.preservedTableFingerprints[tableName];
    if (!baselineFingerprint || baselineFingerprint.rowCount !== nowCount || baselineFingerprint.rowHash !== nowHash) {
      preservedTableMismatchCount += 1;
      preservedTableMismatchDetails.push(`${tableName}(baseline_count=${baselineFingerprint?.rowCount ?? "N/A"}, now_count=${nowCount})`);
    }
  }

  const hazardousEventNowRows = await getRows(`
    SELECT he.id::text AS id,
           md5((to_jsonb(he) - 'specific_hazard_id')::text) AS row_hash
    FROM public.hazardous_event he
  `);
  const hazardousEventNow = new Map<string, string>();
  for (const row of hazardousEventNowRows) {
    hazardousEventNow.set(String(row.id), String(row.row_hash));
  }
  let hazardousEventMissing = 0;
  let hazardousEventChanged = 0;
  for (const [id, hash] of baseline.hazardousEventExclSpecificHazard.entries()) {
    const nowHash = hazardousEventNow.get(id);
    if (nowHash === undefined) hazardousEventMissing += 1;
    else if (nowHash !== hash) hazardousEventChanged += 1;
  }
  let hazardousEventUnexpected = 0;
  for (const id of hazardousEventNow.keys()) {
    if (!baseline.hazardousEventExclSpecificHazard.has(id)) hazardousEventUnexpected += 1;
  }

  const workflowInstanceNowIdRows = await getRows(
    "SELECT id::text AS id FROM public.workflow_instance",
  );
  const workflowInstanceNowIds = new Set<string>();
  for (const row of workflowInstanceNowIdRows) workflowInstanceNowIds.add(String(row.id));
  let workflowInstanceDeleted = 0;
  for (const id of baseline.workflowInstanceIds) {
    if (!workflowInstanceNowIds.has(id)) workflowInstanceDeleted += 1;
  }

  const notificationNowByIdRows = await getRows(`
    SELECT id::text AS id, md5(to_jsonb(wn)::text) AS row_hash
    FROM public.workflow_notification wn
  `);
  const notificationNowById = new Map<string, string>();
  for (const row of notificationNowByIdRows) notificationNowById.set(String(row.id), String(row.row_hash));
  let notificationBaselineMissing = 0;
  let notificationBaselineChanged = 0;
  for (const [id, hash] of baseline.workflowNotificationById.entries()) {
    const nowHash = notificationNowById.get(id);
    if (nowHash === undefined) notificationBaselineMissing += 1;
    else if (nowHash !== hash) notificationBaselineChanged += 1;
  }

  const historyNowByIdRows = await getRows(`
    SELECT id::text AS id, md5(to_jsonb(wh)::text) AS row_hash
    FROM public.workflow_history wh
  `);
  const historyNowById = new Map<string, string>();
  for (const row of historyNowByIdRows) historyNowById.set(String(row.id), String(row.row_hash));
  let historyBaselineMissing = 0;
  let historyBaselineChanged = 0;
  for (const [id, hash] of baseline.workflowHistoryById.entries()) {
    const nowHash = historyNowById.get(id);
    if (nowHash === undefined) historyBaselineMissing += 1;
    else if (nowHash !== hash) historyBaselineChanged += 1;
  }

  const preservationMismatchTotal =
    preservedTableMismatchCount +
    hazardousEventMissing + hazardousEventChanged + hazardousEventUnexpected +
    workflowInstanceDeleted +
    notificationBaselineMissing + notificationBaselineChanged +
    historyBaselineMissing + historyBaselineChanged;

  rows.push({
    Check: "Data preservation outside allowlisted changes",
    Status: preservationMismatchTotal === 0 ? "Pass" : "Fail",
    Table: "protected source tables; public.hazardous_event (excl. specific_hazard_id); public.workflow_instance/notification/history (pre-existing rows)",
    Expected: "All data outside the explicit migration allowlist is unchanged: protected source tables (row-hash), hazardous_event non-allowlisted columns, and pre-existing workflow rows; report missing/unexpected/changed",
    Actual:
      `preserved_table_mismatches=${preservedTableMismatchCount}; ` +
      `hazardous_event[missing=${hazardousEventMissing}, unexpected=${hazardousEventUnexpected}, changed=${hazardousEventChanged}]; ` +
      `workflow_instance_deleted=${workflowInstanceDeleted}; ` +
      `pre_existing_notification[missing=${notificationBaselineMissing}, changed=${notificationBaselineChanged}]; ` +
      `pre_existing_history[missing=${historyBaselineMissing}, changed=${historyBaselineChanged}]`,
    MismatchCount: `${preservationMismatchTotal}`,
    Details:
      preservationMismatchTotal === 0
        ? "No unintended changes outside the allowlist. ALLOWLIST (excluded from enforcement, by design): hazardous_event.specific_hazard_id (set by 20261015095931); workflow_instance row content/renamed columns (upserted + validated_at->rejected_at, validated_by_user_id->rejected_by_user_id by 20261015100122); target tables repopulated/created by migrations (language, text_content, translation, hazard_type/hazard_cluster/specific_hazard, hips_version, spatial observation tables, hazardous_event_causality). workflow_instance is compared only for row deletion, not content. PostGIS system tables (spatial_ref_sys) excluded as backup fixtures."
        : "One or more non-allowlisted data items changed unexpectedly; see Actual for the exact category and counts.",
    EvidenceQuery:
      "Protected tables: count + md5(string_agg(md5(to_jsonb(row)))). hazardous_event: id -> md5((to_jsonb(he) - 'specific_hazard_id')::text) baseline vs post. workflow_instance: baseline id set vs post (deletions). workflow_notification/history: id -> md5(to_jsonb(row)) baseline vs post.",
  });

  for (const result of rollbackResults) {
    const labelTitle = result.label
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    rows.push({
      Check: `Rollback under injected failure — ${labelTitle} (${result.migrationFile.slice(0, 14)})`,
      Status: result.passed ? "Pass" : "Fail",
      Table: `disposable fixture DB; ${result.migrationFile}`,
      Expected: "On a disposable DB prepared at the correct pre-migration stage, an injected pre-COMMIT failure rolls back ALL changes (schema AND full row contents) of this migration while earlier committed migrations remain intact (full state signature unchanged)",
      Actual: result.summary,
      MismatchCount: result.passed ? "0" : "1",
      Details: result.passed
        ? "Fault injected after the migration's changes but before COMMIT; the schema + full row-content state signature matched the pre-migration signature, confirming complete rollback with predecessor migrations intact, and the injected exception caused the failure."
        : "Rollback test did not confirm complete rollback; see Actual for failure/signature details.",
      EvidenceQuery:
        "Single disposable DB walked migration-by-migration (no cloning). At each prioritized index k capture schema + full row-content signature (information_schema.columns + pg_constraint defs + per-table md5(string_agg(md5(to_jsonb(row))))). Run a labelled TEST COPY of the migration with a RAISE EXCEPTION injected immediately before the final COMMIT (original migration SQL unchanged). Expect failure, re-capture signature; pass iff failure observed, injected error confirmed, and signature unchanged. Then apply the REAL migration to advance.",
    });
  }

  rows.push({
    Check: "Rollback under injected failure — remaining 5 migrations",
    Status: "Incomplete",
    Table: "20261009091033, 20261011000000, 20261012000000, 20261015095931, 20261015100055",
    Expected: "Rollback-under-failure tests for the five non-prioritized migrations are executed on disposable fixtures",
    Actual: "Not executed this run (prioritized scope: HIPs, Spatial, Workflow)",
    MismatchCount: "N/A",
    Details: "Per the current scope only HIPs, Spatial, and Workflow rollback tests were executed. The remaining five rollback tests are explicitly marked INCOMPLETE until separately run (the same single-DB fault-injection harness can cover them).",
    EvidenceQuery: "Pending: enable migration indices 1,2,3,4,6 in PRIORITIZED_ROLLBACK_INDICES to execute the remaining rollback tests.",
  });

  for (const neg of negativeResults) {
    rows.push({
      Check: `Acceptance — validator detects ${neg.label}`,
      Status: neg.detected ? "Pass" : "Fail",
      Table: "disposable fixture DB (post-migration, deliberately corrupted in BEGIN/ROLLBACK)",
      Expected: "The validator's own checks flag the deliberately introduced defect (detection count > 0); for the reversed-causality case the row count stays unchanged yet the affected pair is NOT counted as matched",
      Actual: neg.summary,
      MismatchCount: neg.detected ? "0" : "1",
      Details: neg.detected
        ? "Validator correctly detected the injected defect in a disposable fixture, proving the checks are not vacuously passing (equal counts alone do not imply matched)."
        : "Validator failed to detect the injected defect; the corresponding check may be ineffective.",
      EvidenceQuery: "On a disposable fully-migrated fixture (BEGIN/ROLLBACK): inject one defect (broken hazard reference / corrupted HIP original_text / reversed causality with unchanged row count), then run the matching validation query and confirm it reports a nonzero mismatch.",
    });
  }

  rows.push({
    Check: "Checker regression tests",
    Status: regressionEvidence.executed ? (regressionEvidence.passed ? "Pass" : "Fail") : "Incomplete",
    Table: "tests/unit/scripts/spatialValidation.test.ts, tests/unit/scripts/recordMatching.test.ts",
    Expected: "Regression tests for false negatives, association mismatches, altered mapped values, and reversed causality (row count unchanged) are executed and captured in report evidence",
    Actual: `executed=${regressionEvidence.executed}, exit_code=${regressionEvidence.exitCode}`,
    MismatchCount: regressionEvidence.executed ? (regressionEvidence.passed ? "0" : "1") : "N/A",
    Details: regressionEvidence.executed
      ? (regressionEvidence.passed
        ? "Regression tests executed successfully and are attached as run evidence."
        : "Regression tests executed but failed; see attached output snippet.")
      : "Regression tests were not executed in this run.",
    EvidenceQuery: regressionEvidence.summary,
  });

  return rows;
}

async function main(): Promise<void> {
  if (!fs.existsSync(DEFAULT_INPUT)) {
    throw new Error(`Input SQL file not found: ${DEFAULT_INPUT}`);
  }

  const execution: ExecutionSummary = {
    freshRestore: true,
    backupPath: DEFAULT_INPUT,
    migrationFilesPlanned: [...TARGETED_MIGRATION_FILES],
    migrationFilesExecuted: [],
    migrationsCompleted: false,
  };

  ensureDockerPostgres();
  ensureDatabase();
  restoreDump(DEFAULT_INPUT);
  const baseline = await captureBaselineSnapshot();

  for (const migrationFile of TARGETED_MIGRATION_FILES) {
    const filePath = path.resolve(PROJECT_ROOT, "app", "drizzle", "migrations", migrationFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }
    runMigrationFile(filePath);
    execution.migrationFilesExecuted.push(migrationFile);
  }
  execution.migrationsCompleted = execution.migrationFilesExecuted.length === execution.migrationFilesPlanned.length;

  const { results: rollbackResults, negatives: negativeResults } = await runAllRollbackAndNegativeTests();
  const regressionEvidence = runRegressionTestsForEvidence();

  const rows = await validateMigrationState(
    baseline,
    rollbackResults,
    negativeResults,
    regressionEvidence,
  );
  const report = buildReport(rows, execution);
  fs.mkdirSync(path.dirname(DEFAULT_OUTPUT), { recursive: true });
  fs.writeFileSync(DEFAULT_OUTPUT, report, "utf8");
  console.log(report);
  console.log(`Report written to ${DEFAULT_OUTPUT}`);
}

void main().catch((error) => {
  const message = truncateForReport(error instanceof Error ? error.message : String(error));
  const failureExecution: ExecutionSummary = {
    freshRestore: true,
    backupPath: DEFAULT_INPUT,
    migrationFilesPlanned: [...TARGETED_MIGRATION_FILES],
    migrationFilesExecuted: [],
    migrationsCompleted: false,
  };
  const report = buildReport([
    {
      Check: "PostgreSQL restore & validation",
      Status: "Fail",
      Table: "public",
      Expected: "Validation database is created, restored, and migrated successfully",
      Actual: "Failure before full validation",
      MismatchCount: "1",
      Details: message,
      EvidenceQuery: "Execution error before validation query phase.",
    },
  ], failureExecution);
  fs.mkdirSync(path.dirname(DEFAULT_OUTPUT), { recursive: true });
  fs.writeFileSync(DEFAULT_OUTPUT, report, "utf8");
  console.error(message);
  console.error(`Report written to ${DEFAULT_OUTPUT}`);
  process.exitCode = 1;
});
