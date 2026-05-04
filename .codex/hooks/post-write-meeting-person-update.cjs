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
const meetingFiles = extractTouchedFiles(input).filter((filePath) => {
  return (
    filePath.includes(`${path.sep}Meeting_Intel${path.sep}`) ||
    filePath.includes(`${path.sep}Meetings${path.sep}`) ||
    filePath.includes(`${path.sep}Meeting_Notes${path.sep}`)
  );
});

if (meetingFiles.length === 0) {
  skip('no-meeting-files-touched');
}

const today = new Date().toISOString().split('T')[0];
for (const filePath of meetingFiles) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  const meetingName = path.basename(filePath, '.md');
  const mentions = new Set();

  const wikiLinkPattern = /\[\[([A-Z][a-z]+_[A-Z][a-z]+[A-Za-z_]*)\]\]/g;
  let match;
  while ((match = wikiLinkPattern.exec(content)) !== null) {
    mentions.add(match[1]);
  }

  const plainNamePattern = /(?:with|attendee|participant|spoke to|met with)\s+([A-Z][a-z]+\s[A-Z][a-z]+)/gi;
  while ((match = plainNamePattern.exec(content)) !== null) {
    mentions.add(match[1].replace(/\s/g, '_'));
  }

  if (mentions.size === 0) continue;

  for (const name of mentions) {
    const possiblePaths = [
      path.join(paths.PEOPLE_DIR, 'Internal', `${name}.md`),
      path.join(paths.PEOPLE_DIR, 'External', `${name}.md`),
    ];

    for (const personPath of possiblePaths) {
      if (!fs.existsSync(personPath)) continue;
      const existingContent = fs.readFileSync(personPath, 'utf-8');
      if (existingContent.includes(meetingName)) break;

      const meetingRef = `- [[${meetingName}]] (${today})\n`;
      if (existingContent.includes('## Recent Meetings') || existingContent.includes('## Meetings')) {
        const sectionPattern = /## (?:Recent )?Meetings\n/;
        const updatedContent = existingContent.replace(sectionPattern, (sectionMatch) => sectionMatch + meetingRef);
        fs.writeFileSync(personPath, updatedContent);
      } else {
        fs.appendFileSync(personPath, `\n${meetingRef}`);
      }
      break;
    }
  }
}
