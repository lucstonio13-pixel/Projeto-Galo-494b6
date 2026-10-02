import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { projectRoot } from './sites-env.mjs';

// Never accepts a production path: only the isolated flow-test database.
const state = path.join(projectRoot, '.sites-runtime', 'verify-state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
const files = readdirSync(state).filter(name => name.endsWith('.sqlite') && name !== 'metadata.sqlite');
assert.equal(files.length, 1, 'Execute test:flows antes da recuperação; deve existir um banco isolado.');
const sourcePath = path.join(state, files[0]);
const backupRoot = path.join(projectRoot, 'backups');
mkdirSync(backupRoot, { recursive: true });
const directory = mkdtempSync(path.join(backupRoot, 'aceite-local-'));
const backupPath = path.join(directory, 'backup.sqlite');
const restoredPath = path.join(directory, 'restaurado.sqlite');
const quote = name => '"' + name.replaceAll('"', '""') + '"';

function snapshot(database) {
  const tables = database.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  return Object.fromEntries(tables.map(({ name }) => {
    const rows = database.prepare('SELECT * FROM ' + quote(name)).all().map(row => JSON.stringify(row)).sort();
    return [name, { count: rows.length, hash: createHash('sha256').update(JSON.stringify(rows)).digest('hex') }];
  }));
}

let source;
let saved;
let restored;
try {
  source = new DatabaseSync(sourcePath, { readOnly: true });
  const before = snapshot(source);
  for (const name of ['orders', 'history', 'receipts', 'ledger']) {
    assert.ok(before[name]?.count > 0, name + ' deve conter dados do teste de fluxo.');
  }
  await backup(source, backupPath);
  source.close();
  source = new DatabaseSync(sourcePath, { readOnly: true });
  assert.deepEqual(snapshot(source), before, 'Dados persistem após fechar e reabrir o banco.');
  saved = new DatabaseSync(backupPath, { readOnly: true });
  await backup(saved, restoredPath);
  restored = new DatabaseSync(restoredPath, { readOnly: true });
  assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(restored.prepare('PRAGMA foreign_key_check').all(), []);
  assert.deepEqual(snapshot(restored), before, 'Restauração preserva todas as linhas e valores.');
  const report = { checkedAt: new Date().toISOString(), scope: 'isolated-local-flow-database', integrity: 'ok', foreignKeys: 'ok', reopened: true, restored: true, tables: Object.fromEntries(Object.entries(before).map(([name, value]) => [name, value.count])) };
  writeFileSync(path.join(directory, 'resultado.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('OK · Banco local reaberto, backup restaurado e todas as tabelas conferidas.');
  console.log('Evidência local protegida em: ' + directory);
} finally {
  source?.close();
  saved?.close();
  restored?.close();
}
