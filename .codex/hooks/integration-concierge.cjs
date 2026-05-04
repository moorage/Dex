#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { findProjectRoot } = require('./lib/dex-paths.cjs');

const projectRoot = findProjectRoot(process.cwd());
const configPath = path.join(projectRoot, 'System', 'integrations', 'config.yaml');

function loadEnabledIntegrations() {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const parsed = yaml.load(fs.readFileSync(configPath, 'utf-8'));
    return parsed?.enabled || {};
  } catch {
    return {};
  }
}

function walkFiles(rootDir, maxFiles = 250) {
  const files = [];
  const queue = [rootDir];
  while (queue.length > 0 && files.length < maxFiles) {
    const current = queue.shift();
    if (!fs.existsSync(current)) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (/\.(md|markdown|txt|yaml|yml|json)$/i.test(entry.name)) {
        files.push(fullPath);
        if (files.length >= maxFiles) {
          break;
        }
      }
    }
  }
  return files;
}

const catalog = {
  notion: {
    shortName: 'Notion',
    setupTime: '2-3 minutes',
    valueProposition: 'link docs, specs, and team notes into meeting prep and person context',
    patterns: [/notion\b/i, /notion\.so/i],
  },
  google: {
    shortName: 'Google Workspace',
    setupTime: '2-3 minutes',
    valueProposition: 'pull email and calendar context into daily planning and meeting prep',
    patterns: [/\bgmail\b/i, /google calendar/i, /calendar invite/i, /@gmail\.com/i],
  },
  slack: {
    shortName: 'Slack',
    setupTime: '1-2 minutes',
    valueProposition: 'surface recent discussion context for people, meetings, and commitments',
    patterns: [/\bslack\b/i, /slack\.com/i],
  },
  jira: {
    shortName: 'Jira',
    setupTime: '3-5 minutes',
    valueProposition: 'pull active tickets and sprint work into planning and project health',
    patterns: [/\bjira\b/i, /\b[A-Z]{2,10}-\d+\b/],
  },
  todoist: {
    shortName: 'Todoist',
    setupTime: '2-3 minutes',
    valueProposition: 'sync tasks created in Dex into your daily task manager',
    patterns: [/\btodoist\b/i],
  },
  things: {
    shortName: 'Things',
    setupTime: '2-3 minutes',
    valueProposition: 'route captured tasks into Things while keeping Dex as the planning layer',
    patterns: [/\bthings\b/i, /\bcultured code\b/i],
  },
  trello: {
    shortName: 'Trello',
    setupTime: '2-3 minutes',
    valueProposition: 'connect board context to projects and follow-ups',
    patterns: [/\btrello\b/i, /trello\.com/i],
  },
  zoom: {
    shortName: 'Zoom',
    setupTime: '1-2 minutes',
    valueProposition: 'tie meeting URLs and scheduling context back into Dex workflows',
    patterns: [/\bzoom\b/i, /zoom\.us/i],
  },
};

const filesToScan = walkFiles(projectRoot);
const enabled = loadEnabledIntegrations();
const results = Object.fromEntries(
  Object.keys(catalog).map((key) => [key, { mentions: 0, exampleFiles: [] }]),
);

for (const filePath of filesToScan) {
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf-8').slice(0, 65536);
  } catch {
    continue;
  }

  for (const [key, descriptor] of Object.entries(catalog)) {
    const hitCount = descriptor.patterns.reduce((count, pattern) => {
      const matches = content.match(new RegExp(pattern.source, `${pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`}`));
      return count + (matches ? matches.length : 0);
    }, 0);

    if (hitCount === 0) continue;
    results[key].mentions += hitCount;
    if (results[key].exampleFiles.length < 3) {
      results[key].exampleFiles.push(path.relative(projectRoot, filePath).replace(/\\/g, '/'));
    }
  }
}

const recommendations = Object.entries(catalog)
  .map(([key, descriptor]) => {
    const scan = results[key];
    const score = Math.min(scan.mentions, 8);
    return {
      key,
      shortName: descriptor.shortName,
      mentions: scan.mentions,
      score,
      setupTime: descriptor.setupTime,
      valueProposition: descriptor.valueProposition,
      exampleFiles: scan.exampleFiles,
      firstExampleFile: scan.exampleFiles[0] || null,
      enabled: enabled[key] === true,
    };
  })
  .filter((item) => item.mentions > 0 && !item.enabled)
  .sort((a, b) => b.score - a.score || b.mentions - a.mentions);

const payload = {
  generated_at: new Date().toISOString(),
  high_value: recommendations.filter((item) => item.score >= 5),
  moderate_value: recommendations.filter((item) => item.score >= 3 && item.score < 5),
  available: recommendations.filter((item) => item.score < 3),
};

console.log(JSON.stringify(payload, null, 2));
