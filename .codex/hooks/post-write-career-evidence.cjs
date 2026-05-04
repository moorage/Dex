#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getPaths, readHookInput, extractTouchedFiles, skip } = require('./lib/hook-utils.cjs');

let input;
try {
  input = readHookInput();
} catch (error) {
  skip(error.message);
}

const WRITE_TOOL_NAMES = new Set(['apply_patch', 'Write', 'Edit']);
if (!WRITE_TOOL_NAMES.has(input?.tool_name)) {
  skip('non-write-tool');
}

const paths = getPaths(input);
const touchedFiles = extractTouchedFiles(input).filter((filePath) => {
  return (
    filePath.includes(`${path.sep}05-Areas${path.sep}Career${path.sep}`) &&
    !filePath.endsWith(`${path.sep}Evidence_Log.md`)
  );
});

if (touchedFiles.length === 0) {
  skip('no-career-files-touched');
}

const evidenceLogPath = path.join(paths.CAREER_DIR, 'Evidence_Log.md');
if (!fs.existsSync(evidenceLogPath)) {
  const header = '# Career Evidence Log\n\nAuto-captured achievements from career coaching sessions.\n\n| Date | Skill Area | Source | Description |\n|------|-----------|--------|-------------|\n';
  fs.mkdirSync(path.dirname(evidenceLogPath), { recursive: true });
  fs.writeFileSync(evidenceLogPath, header);
}

const today = new Date().toISOString().split('T')[0];
const achievementPatterns = [
  /\d+%/,
  /\$[\d,]+/,
  /\d+x/i,
  /delivered|achieved|improved|reduced|increased|launched|completed|shipped/i,
  /revenue|growth|adoption|retention|NPS|CSAT/i,
  /award|recognition|promotion|certification/i,
];

const skillPatterns = {
  Leadership: /leadership|team|managed|mentored|coached/i,
  Strategy: /strategy|strategic|roadmap|vision|planning/i,
  Technical: /technical|architecture|system|engineering|code/i,
  Communication: /presentation|stakeholder|executive|board|communication/i,
  Customer: /customer|client|user|NPS|satisfaction|retention/i,
  Product: /product|feature|launch|release|adoption/i,
  Sales: /deal|revenue|pipeline|close|win/i,
};

const existingLog = fs.readFileSync(evidenceLogPath, 'utf-8');
for (const filePath of touchedFiles) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!achievementPatterns.some((pattern) => pattern.test(content))) continue;

  const fileName = path.basename(filePath, '.md');
  if (existingLog.includes(`| ${today} |`) && existingLog.includes(`[[${fileName}]]`)) {
    continue;
  }

  const skillAreas = Object.entries(skillPatterns)
    .filter(([, pattern]) => pattern.test(content))
    .map(([area]) => area);
  const skillArea = skillAreas.length > 0 ? skillAreas.join(', ') : 'General';

  let briefDesc = `Evidence captured from ${fileName}`;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed === '---') continue;
    if (achievementPatterns.some((pattern) => pattern.test(trimmed))) {
      briefDesc = trimmed.substring(0, 120);
      break;
    }
  }

  const entry = `| ${today} | ${skillArea} | [[${fileName}]] | ${briefDesc.replace(/\|/g, '/')} |\n`;
  fs.appendFileSync(evidenceLogPath, entry);
}
