import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { projectRoot } from "./sites-env.mjs";

const node = process.execPath;
const wrangler = path.join(projectRoot, "node_modules", "wrangler", "wrangler-dist", "cli.js");
const config = path.join(projectRoot, "dist", "server", "wrangler.json");
const verifyState = path.join(projectRoot, ".sites-runtime", "verify-state");
const verifyEnv = path.join(projectRoot, ".sites-runtime", "verify.env");
const localEnv = path.join(projectRoot, ".env.local");
const base = "http://127.0.0.1:5173";

if (!existsSync(localEnv)) throw new Error("Execute npm run setup:local antes dos testes de fluxo.");
mkdirSync(path.dirname(verifyEnv), { recursive: true });
writeFileSync(verifyEnv, readFileSync(localEnv, "utf8").trimEnd() + "\nEMAIL_WEBHOOK_URL=http://127.0.0.1:5174/email\n", { mode: 0o600 });
rmSync(verifyState, { recursive: true, force: true });
const migration = spawnSync(node, [path.join(projectRoot, "scripts", "migrate-local.mjs")], {
  cwd: projectRoot,
  env: { ...process.env, MIGRATION_PERSIST_TO: verifyState, CI: "1" },
  stdio: "inherit",
});
if (migration.status !== 0) process.exit(migration.status ?? 1);

const worker = spawn(
  node,
  [
    wrangler,
    "dev",
    "--config",
    config,
    "--local",
    "--persist-to",
    verifyState,
    "--ip",
    "127.0.0.1",
    "--port",
    "5173",
    "--inspector-port",
    "0",
    "--env-file",
    verifyEnv,
  ],
  { cwd: projectRoot, env: { ...process.env, CI: "1" }, stdio: ["ignore", "pipe", "pipe"] },
);

worker.stdout.on("data", (chunk) => process.stdout.write(chunk));
worker.stderr.on("data", (chunk) => process.stderr.write(chunk));

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (worker.exitCode !== null) throw new Error("O servidor de teste encerrou antes de ficar pronto.");
    try {
      const response = await fetch(base + "/api/catalog");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("O servidor de teste não ficou pronto no tempo esperado.");
}

let exitCode = 1;
try {
  await waitForServer();
  const verification = spawnSync(node, [path.join(projectRoot, "scripts", "verify-flows.mjs")], {
    cwd: projectRoot,
    env: { ...process.env, CI: "1" },
    stdio: "inherit",
  });
  exitCode = verification.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  worker.kill();
  rmSync(verifyEnv, { force: true });
}
process.exit(exitCode);
