#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getPaths, readHookInput, skip } = require('./lib/hook-utils.cjs');

let input;
try {
  input = readHookInput();
} catch (error) {
  skip(error.message);
}

const paths = getPaths(input);
const today = new Date().toISOString().split('T')[0];
const dailyPrepDir = path.join(paths.INBOX_DIR, 'Daily_Prep');
const planPath = path.join(dailyPrepDir, `${today}.md`);
const quickRefPath = path.join(dailyPrepDir, `${today}-quickref.md`);

if (!fs.existsSync(planPath)) {
  skip('no-daily-plan');
}

const content = fs.readFileSync(planPath, 'utf-8');
const lines = content.split('\n');
let currentSection = '';
const focusItems = [];
const timeBlocks = [];
const keyMeetings = [];

for (const line of lines) {
  if (line.match(/^#{1,3}\s.*focus/i) || line.match(/^#{1,3}\s.*priorities/i) || line.match(/^#{1,3}\s.*top\s/i)) {
    currentSection = 'focus';
    continue;
  }
  if (line.match(/^#{1,3}\s.*schedule/i) || line.match(/^#{1,3}\s.*time.?block/i) || line.match(/^#{1,3}\s.*calendar/i)) {
    currentSection = 'schedule';
    continue;
  }
  if (line.match(/^#{1,3}\s.*meeting/i)) {
    currentSection = 'meetings';
    continue;
  }
  if (line.match(/^#{1,3}\s/)) {
    currentSection = 'other';
    continue;
  }

  const trimmed = line.trim();
  if (!trimmed || trimmed === '---') continue;
  if (currentSection === 'focus' && (/^[-*]/.test(trimmed) || /^\d+\./.test(trimmed))) {
    if (focusItems.length < 5) focusItems.push(trimmed);
  }
  if (currentSection === 'schedule') {
    if (timeBlocks.length < 10) timeBlocks.push(trimmed);
  }
  if (currentSection === 'meetings' && (/^[-*]/.test(trimmed) || /^\d+\./.test(trimmed))) {
    if (keyMeetings.length < 5) keyMeetings.push(trimmed);
  }
}

const quickRef = [
  `# Quick Ref — ${today}`,
  '',
  '## Top Focus',
  ...(focusItems.length > 0 ? focusItems : ['- Check full plan for details']),
  '',
  '## Key Meetings',
  ...(keyMeetings.length > 0 ? keyMeetings : ['- No meetings extracted']),
  '',
  '## Time Blocks',
  ...(timeBlocks.length > 0 ? timeBlocks : ['- See full plan']),
  '',
  '---',
  `*Full plan: [[${today}]]*`,
].join('\n');

fs.mkdirSync(dailyPrepDir, { recursive: true });
fs.writeFileSync(quickRefPath, quickRef);
