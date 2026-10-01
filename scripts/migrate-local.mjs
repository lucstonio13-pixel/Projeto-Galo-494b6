import { spawnSync } from "node:child_process";
import path from "node:path";
import { projectRoot } from "./sites-env.mjs";

const wrangler = path.join(projectRoot, "node_modules", "wrangler", "wrangler-dist", "cli.js");
const config = path.join(projectRoot, "dist", "server", "wrangler.json");
const state = process.env.MIGRATION_PERSIST_TO
  ? path.resolve(projectRoot, process.env.MIGRATION_PERSIST_TO)
  : path.join(projectRoot, ".wrangler", "state");

function run(args) {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    cwd: projectRoot,
    env: { ...process.env, CI: "1" },
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Older local databases were created before Wrangler started tracking D1
// migrations. Adopt the baseline only when its tables already exist.
run([
  "d1", "execute", "DB", "--local", "--config", config, "--persist-to", state,
  "--command",
  "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL); INSERT OR IGNORE INTO d1_migrations(name) SELECT '0000_blue_doorman.sql' WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='user');",
]);
run(["d1", "migrations", "apply", "DB", "--local", "--config", config, "--persist-to", state]);
