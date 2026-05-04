#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getPaths, getProjectRoot, readHookInput, skip } = require('./lib/hook-utils.cjs');

function loadState(statePath) {
  if (!fs.existsSync(statePath)) {
    return { sessions: {} };
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch {
    return { sessions: {} };
  }
}

let input;
try {
  input = readHookInput();
} catch (error) {
  skip(error.message);
}

const sessionId = input?.session_id;
if (!sessionId) {
  skip('missing-session-id');
}

const projectRoot = getProjectRoot(input);
const paths = getPaths(input);
const today = new Date().toISOString().split('T')[0];
const stateDir = path.join(os.tmpdir(), 'dex-codex-hooks');
const stateKey = crypto.createHash('sha1').update(projectRoot).digest('hex');
const statePath = path.join(stateDir, `${stateKey}.json`);
const state = loadState(statePath);

if (state.sessions[sessionId] === today) {
  skip('session-already-logged');
}

const learningsDir = path.join(paths.SYSTEM_DIR, 'Session_Learnings');
const learningFile = path.join(learningsDir, `${today}.md`);
fs.mkdirSync(learningsDir, { recursive: true });

if (!fs.existsSync(learningFile)) {
  fs.writeFileSync(
    learningFile,
    `# Session Learnings - ${today}\n\nAutomatically captured from Codex sessions.\n\n---\n\n`,
  );
}

const transcriptPath = input?.transcript_path || null;
const lines = [
  `## ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - Codex session activity`,
  '',
  `**Session ID:** \`${sessionId}\``,
];
if (transcriptPath) {
  lines.push(`**Transcript:** \`${transcriptPath}\``);
}
lines.push('');
lines.push('_Codex does not expose a SessionEnd hook; this entry was captured on the first completed turn of the session._');
lines.push('');
lines.push('---');
lines.push('');

fs.appendFileSync(learningFile, lines.join('\n'));
fs.mkdirSync(stateDir, { recursive: true });
state.sessions[sessionId] = today;
fs.writeFileSync(statePath, JSON.stringify(state));
