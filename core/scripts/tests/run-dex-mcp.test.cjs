const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const launcher = require('../run-dex-mcp.cjs');

test('resolveServerPath returns a real MCP server file', () => {
  const resolved = launcher.resolveServerPath('work_server.py');
  assert.equal(path.basename(resolved), 'work_server.py');
  assert.match(resolved, /core[\\/]+mcp[\\/]+work_server\.py$/);
});

test('resolveServerPath rejects unknown servers', () => {
  assert.throws(() => launcher.resolveServerPath('missing.py'));
});

test('pythonCandidates prefer project virtualenvs before system python', () => {
  const candidates = launcher.pythonCandidates('/tmp/dex');
  assert.deepEqual(candidates.slice(0, 2), [
    path.join('/tmp/dex', '.venv', 'Scripts', 'python.exe'),
    path.join('/tmp/dex', '.venv', 'bin', 'python'),
  ]);
  assert.deepEqual(candidates.slice(2), ['python3', 'python']);
});

test('buildEnv injects VAULT_PATH and PYTHONPATH', () => {
  const env = launcher.buildEnv('/tmp/dex');
  assert.equal(env.VAULT_PATH, process.env.VAULT_PATH || '/tmp/dex');
  assert.ok(env.PYTHONPATH.includes('/tmp/dex'));
});
