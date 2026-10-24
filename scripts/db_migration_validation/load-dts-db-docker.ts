import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import pg from "pg";

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

function renderRowsTable(rows: Array<{ Check: string; Status: string; Table: string; Expected: string; Actual: string; Details: string }>): string {
  if (rows.length === 0) {
    return "No checks in this category.";
  }

  const header = `| Check | Status | Table(s) | Expected | Actual | Details |\n| --- | --- | --- | --- | --- | --- |`;
  const body = rows
    .map((row) => {
      const check = truncateForReport(String(row.Check), 120);
      const status = truncateForReport(String(row.Status), 40);
      const table = truncateForReport(String(row.Table), 120);
      const expected = truncateForReport(String(row.Expected), 240);
      const actual = truncateForReport(String(row.Actual), 240);
      const details = truncateForReport(String(row.Details), 700);
      return `| ${check} | ${status} | ${table} | ${expected} | ${actual} | ${details} |`;
    })
    .join("\n");

  return `${header}\n${body}`;
}

function buildReport(rows: Array<{ Check: string; Status: string; Table: string; Expected: string; Actual: string; Details: string }>): string {
  const passRows = rows.filter((row) => row.Status === "Pass");
  const failRows = rows.filter((row) => row.Status === "Fail");
  const warnRows = rows.filter((row) => row.Status === "Warn");
  const passed = failRows.length === 0;

  return `# Migration validation report\n\nOverall status: **${passed ? "PASS" : "FAIL"}**\n\n## Summary\n- Pass checks: ${passRows.length}\n- Fail checks: ${failRows.length}\n- Warning checks: ${warnRows.length}\n\n## Pass\n${renderRowsTable(passRows)}\n\n## Fail\n${renderRowsTable(failRows)}\n\n## Warning\n${renderRowsTable(warnRows)}\n`;
}

function ensureDockerPostgres(): void {
  try {
    runDocker(["inspect", CONTAINER_NAME]);
  } catch {
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

async function getCount(sqlText: string): Promise<number> {
  const client = await getClient();
  try {
    const result = await client.query(sqlText);
    return Number(result.rows[0]?.c ?? 0);
  } catch {
    return 0;
  } finally {
    await client.end();
  }
}

async function validateMigrationState(): Promise<Array<{ Check: string; Status: string; Table: string; Expected: string; Actual: string; Details: string }>> {
  const rows: Array<{ Check: string; Status: string; Table: string; Expected: string; Actual: string; Details: string }> = [];

  const hazardousEventsWithHipHazardId = await getCount("SELECT count(*)::int as c FROM public.hazardous_event WHERE hip_hazard_id IS NOT NULL");
  const hazardousEventsMappedToSpecificHazard = await getCount("SELECT count(*)::int as c FROM public.hazardous_event WHERE hip_hazard_id IS NOT NULL AND specific_hazard_id IS NOT NULL");
  const hazardousEventSpecificHazardOk = hazardousEventsWithHipHazardId === hazardousEventsMappedToSpecificHazard;

  rows.push({
    Check: "Hazardous event -> specific hazard migration",
    Status: hazardousEventSpecificHazardOk ? "Pass" : "Fail",
    Table: "public.hazardous_event, public.specific_hazard",
    Expected: "Only hazardous events that have hip_hazard_id should be mapped to a specific hazard after migration",
    Actual: `hip_hazard_id_rows=${hazardousEventsWithHipHazardId}, mapped_to_specific_hazard=${hazardousEventsMappedToSpecificHazard}`,
    Details: hazardousEventSpecificHazardOk
      ? "Every hazardous_event row with a non-null hip_hazard_id was mapped to the matching specific_hazard_id, matching the 20261015095931 migration expectation."
      : "One or more hazardous_event rows with a non-null hip_hazard_id are still missing their specific_hazard_id mapping.",
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
    Details: hipMatch
      ? "Legacy HIP tables and rebuilt target tables have matching counts."
      : "One or more HIP source/target tables have mismatched counts, indicating a partial or failed migration.",
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
    Details: languageOk
      ? "All stored language rows are in the expected two-character format and have names."
      : "The language table contains rows that are not normalized or are missing required metadata.",
  });

  rows.push({
    Check: "BCP47 language code compatibility",
    Status: bcp47Ok ? "Pass" : "Fail",
    Table: "public.language",
    Expected: "Every language code should conform to BCP47-style values after the language widening migration",
    Actual: `total=${totalLanguageCount}, bcp47_valid=${bcp47LanguageCount}`,
    Details: bcp47Ok
      ? "Language codes match the expected BCP47-compatible form after the widening migration."
      : "One or more language codes do not match the expected BCP47 format and need review.",
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
    Details: translationMigrationOk
      ? "HIP multilingual text-content rows were created and every same-language translation row matches the source text."
      : "HIP migration is missing one or more translation rows or the original-language mapping is invalid.",
  });

  const workflowInstanceCount = await getCount("SELECT count(*)::int as c FROM public.workflow_instance");
  rows.push({
    Check: "Workflow instance migration",
    Status: workflowInstanceCount > 0 ? "Pass" : "Fail",
    Table: "public.workflow_instance",
    Expected: "Workflow instances should exist after migration",
    Actual: `total=${workflowInstanceCount}`,
    Details: workflowInstanceCount > 0 ? "Workflow-instance rows exist, matching the expected migrated state." : "No workflow_instance rows were found.",
  });

  const workflowNotificationCount = await getCount("SELECT count(*)::int as c FROM public.workflow_notification");
  rows.push({
    Check: "Workflow notification bootstrap",
    Status: workflowNotificationCount > 0 ? "Pass" : "Fail",
    Table: "public.workflow_notification",
    Expected: "Workflow notifications should be created as part of validation workflow migration",
    Actual: `total=${workflowNotificationCount}`,
    Details: workflowNotificationCount > 0 ? "Notification rows are present." : "No workflow notification rows were found.",
  });

  const spatialObservationCount = await getCount("SELECT count(*)::int as c FROM public.hazardous_event_spatial_observation");
  const spatialWithGeometry = await getCount("SELECT count(*)::int as c FROM public.hazardous_event_spatial_observation WHERE geometry IS NOT NULL OR area IS NOT NULL OR geom IS NOT NULL");
  const spatialObservationCompleteness = spatialObservationCount > 0 && spatialWithGeometry === spatialObservationCount;

  rows.push({
    Check: "Spatial observation migration",
    Status: spatialObservationCompleteness ? "Pass" : "Fail",
    Table: "public.hazardous_event_spatial_observation",
    Expected: "Distinct hazardous-event spatial observations should exist after migration with migrated geometry or area data",
    Actual: `total=${spatialObservationCount}, with_geometry_or_area=${spatialWithGeometry}`,
    Details: spatialObservationCompleteness ? "Spatial observation rows exist and contain geometry data." : "One or more spatial-observation rows are missing migrated geometry or area fields.",
  });

  const causalityCount = await getCount("SELECT count(*)::int as c FROM public.hazardous_event_causality");
  const eligibleCausalityPairs = await getCount(`SELECT count(*)::int as c FROM (SELECT DISTINCT er.parent_id AS cause_hazardous_event_id, er.child_id AS effect_hazardous_event_id FROM public.event_relationship er INNER JOIN public.hazardous_event parent_he ON parent_he.id = er.parent_id INNER JOIN public.hazardous_event child_he ON child_he.id = er.child_id WHERE er.parent_id <> er.child_id) src`);
  const missingCausalityPairs = await getCount(`SELECT count(*)::int as c FROM (SELECT DISTINCT er.parent_id AS cause_hazardous_event_id, er.child_id AS effect_hazardous_event_id FROM public.event_relationship er INNER JOIN public.hazardous_event parent_he ON parent_he.id = er.parent_id INNER JOIN public.hazardous_event child_he ON child_he.id = er.child_id WHERE er.parent_id <> er.child_id) src LEFT JOIN public.hazardous_event_causality hec ON hec.cause_hazardous_event_id = src.cause_hazardous_event_id AND hec.effect_hazardous_event_id = src.effect_hazardous_event_id WHERE hec.id IS NULL`);
  const causalityCompleteness = eligibleCausalityPairs === causalityCount && missingCausalityPairs === 0;

  rows.push({
    Check: "Event causality mapping completeness",
    Status: causalityCompleteness ? "Pass" : "Fail",
    Table: "public.event_relationship, public.hazardous_event_causality",
    Expected: "Every eligible event_relationship pair where both endpoints are hazardous events should be copied to hazardous_event_causality with the same cause/effect direction",
    Actual: `eligible_pairs=${eligibleCausalityPairs}, migrated_pairs=${causalityCount}, missing_pairs=${missingCausalityPairs}`,
    Details: causalityCompleteness
      ? "All eligible event_relationship pairs were migrated into hazardous_event_causality with the correct cause/effect direction."
      : "One or more eligible event_relationship pairs are missing from hazardous_event_causality or were copied with the wrong cause/effect direction.",
  });

  return rows;
}

async function main(): Promise<void> {
  if (!fs.existsSync(DEFAULT_INPUT)) {
    throw new Error(`Input SQL file not found: ${DEFAULT_INPUT}`);
  }

  ensureDockerPostgres();
  ensureDatabase();
  restoreDump(DEFAULT_INPUT);

  for (const migrationFile of TARGETED_MIGRATION_FILES) {
    const filePath = path.resolve(PROJECT_ROOT, "app", "drizzle", "migrations", migrationFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }
    runMigrationFile(filePath);
  }

  const rows = await validateMigrationState();
  const report = buildReport(rows);
  fs.mkdirSync(path.dirname(DEFAULT_OUTPUT), { recursive: true });
  fs.writeFileSync(DEFAULT_OUTPUT, report, "utf8");
  console.log(report);
  console.log(`Report written to ${DEFAULT_OUTPUT}`);
}

void main().catch((error) => {
  const message = truncateForReport(error instanceof Error ? error.message : String(error));
  const report = buildReport([{ Check: "PostgreSQL restore & validation", Status: "Fail", Table: "public", Expected: "Validation database is created, restored, and migrated successfully", Actual: "0", Details: message }]);
  fs.mkdirSync(path.dirname(DEFAULT_OUTPUT), { recursive: true });
  fs.writeFileSync(DEFAULT_OUTPUT, report, "utf8");
  console.error(message);
  console.error(`Report written to ${DEFAULT_OUTPUT}`);
  process.exitCode = 1;
});
