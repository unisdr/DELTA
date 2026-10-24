import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  ["tsx", "scripts/db_migration_validation/load-dts-db-docker.ts"],
  {
    cwd: process.cwd(),
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
