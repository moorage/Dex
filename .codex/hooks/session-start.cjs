#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getPaths, readHookInput } = require('./lib/hook-utils.cjs');

let input;
try {
  input = readHookInput();
} catch {
  process.exit(0);
}

const paths = getPaths(input);
const lines = [
  'Dex Codex hook layer is active for this repository.',
  `Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
];

const onboardingMarker = path.join(paths.SYSTEM_DIR, '.onboarding-complete');
if (fs.existsSync(onboardingMarker)) {
  lines.push('Onboarding marker detected.');
} else {
  lines.push('Onboarding marker is missing; be careful about assuming setup is complete.');
}

const demoStatePath = path.join(paths.SYSTEM_DIR, '.demo-mode-state.json');
if (fs.existsSync(demoStatePath)) {
  try {
    const demoState = JSON.parse(fs.readFileSync(demoStatePath, 'utf-8'));
    if (demoState.active === true) {
      lines.push('Demo mode is active. Redact sensitive output and prefer demo-safe paths.');
    }
  } catch {
    // Ignore malformed demo state; this is additive context only.
  }
}

const usefulFiles = [
  ['User profile', paths.USER_PROFILE_FILE],
  ['Quarter goals', paths.QUARTER_GOALS_FILE],
  ['Week priorities', paths.WEEK_PRIORITIES_FILE],
  ['Tasks', paths.TASKS_FILE],
];

for (const [label, filePath] of usefulFiles) {
  if (fs.existsSync(filePath)) {
    lines.push(`${label}: ${path.relative(paths.VAULT_ROOT, filePath)}`);
  }
}

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `\n${lines.join('\n')}`,
    },
  }),
);
