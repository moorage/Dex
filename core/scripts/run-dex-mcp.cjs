#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const MCP_DIR = path.join(PROJECT_ROOT, 'core', 'mcp');

function resolveServerPath(serverName) {
  if (!serverName) {
    throw new Error('Missing MCP server filename');
  }

  const normalized = path.basename(serverName);
  const fullPath = path.join(MCP_DIR, normalized);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Unknown MCP server: ${normalized}`);
  }

  return fullPath;
}

function pythonCandidates(projectRoot = PROJECT_ROOT) {
  return [
    path.join(projectRoot, '.venv', 'Scripts', 'python.exe'),
    path.join(projectRoot, '.venv', 'bin', 'python'),
    'python3',
    'python',
  ];
}

function buildEnv(projectRoot = PROJECT_ROOT) {
  const pythonPathEntries = [projectRoot];
  if (process.env.PYTHONPATH) {
    pythonPathEntries.push(process.env.PYTHONPATH);
  }

  return {
    ...process.env,
    VAULT_PATH: process.env.VAULT_PATH || projectRoot,
    PYTHONPATH: pythonPathEntries.join(path.delimiter),
  };
}

function spawnServer(serverPath, candidates, attempt = 0) {
  if (attempt >= candidates.length) {
    console.error(
      'Dex MCP launcher could not find a usable Python runtime. ' +
      'Run ./install.sh to create .venv or install Python 3.11+.'
    );
    process.exit(1);
  }

  const command = candidates[attempt];
  const child = spawn(command, [serverPath], {
    cwd: PROJECT_ROOT,
    env: buildEnv(PROJECT_ROOT),
    stdio: 'inherit',
  });

  child.once('error', (error) => {
    if (error && error.code === 'ENOENT') {
      spawnServer(serverPath, candidates, attempt + 1);
      return;
    }

    console.error(`Dex MCP launcher failed: ${error.message}`);
    process.exit(1);
  });

  child.once('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

function main() {
  const serverPath = resolveServerPath(process.argv[2]);
  spawnServer(serverPath, pythonCandidates(PROJECT_ROOT));
}

if (require.main === module) {
  main();
}

module.exports = {
  PROJECT_ROOT,
  MCP_DIR,
  resolveServerPath,
  pythonCandidates,
  buildEnv,
};
