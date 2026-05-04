#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {
  getPaths,
  readHookInput,
  skip,
} = require('./lib/hook-utils.cjs');

function parsePersonPage(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');
    const info = {
      name: fileName.replace(/_/g, ' '),
      role: null,
      company: null,
      lastInteraction: null,
      openItems: [],
    };

    if (content.startsWith('---')) {
      const endMatch = content.slice(3).indexOf('---');
      if (endMatch !== -1) {
        const frontmatter = content.slice(3, endMatch + 3);
        const roleMatch = frontmatter.match(/role:\s*(.+)/);
        if (roleMatch) info.role = roleMatch[1].trim();
        const companyMatch = frontmatter.match(/company:\s*(.+)/);
        if (companyMatch) info.company = companyMatch[1].trim();
        const lastIntMatch = frontmatter.match(/last_interaction:\s*(.+)/);
        if (lastIntMatch) info.lastInteraction = lastIntMatch[1].trim();
        const nameMatch = frontmatter.match(/name:\s*(.+)/);
        if (nameMatch) info.name = nameMatch[1].trim();
      }
    }

    const actionItemRegex = /^- \[ \] (.+)$/gm;
    let match;
    while ((match = actionItemRegex.exec(content)) !== null) {
      info.openItems.push(match[1].replace(/\*\*/g, '').trim());
    }

    return info;
  } catch {
    return null;
  }
}

function parseCompanyPage(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');
    const info = {
      name: fileName.replace(/_/g, ' ').replace(/-/g, ' '),
      status: null,
      contacts: [],
      lastMeeting: null,
      openTasks: [],
      context: null,
    };

    if (content.startsWith('---')) {
      const endMatch = content.slice(3).indexOf('---');
      if (endMatch !== -1) {
        const frontmatter = content.slice(3, endMatch + 3);
        const statusMatch = frontmatter.match(/status:\s*(.+)/);
        if (statusMatch) info.status = statusMatch[1].trim();
        const nameMatch = frontmatter.match(/name:\s*(.+)/);
        if (nameMatch) info.name = nameMatch[1].trim();
        const contactsMatch = frontmatter.match(/contacts:\s*\n((?:\s*-\s*.+\n)+)/);
        if (contactsMatch) {
          const contactLines = contactsMatch[1].match(/-\s*(.+)/g);
          if (contactLines) {
            info.contacts = contactLines.map((line) => line.replace(/^-\s*/, '').trim());
          }
        }
      }
    }

    const taskRegex = /^- \[ \] (.+)$/gm;
    let match;
    while ((match = taskRegex.exec(content)) !== null) {
      info.openTasks.push(match[1].replace(/\*\*/g, '').trim());
    }

    const meetingPattern = /(?:last meeting|met on|call on)[:\s]+(\d{4}-\d{2}-\d{2}|\w+ \d{1,2},? \d{4})/i;
    const meetingMatch = content.match(meetingPattern);
    if (meetingMatch) {
      info.lastMeeting = meetingMatch[1];
    }

    const bodyContent = content.replace(/^---[\s\S]*?---/, '').trim();
    const firstParagraph = bodyContent.split('\n\n')[0];
    if (firstParagraph && !firstParagraph.startsWith('#') && !firstParagraph.startsWith('-')) {
      info.context = firstParagraph.trim();
    }

    const contactsSection = content.match(/##\s*(?:Key\s+)?Contacts[\s\S]*?(?=##|$)/i);
    if (contactsSection && info.contacts.length === 0) {
      const contactMatches = contactsSection[0].match(/[-*]\s*\*?\*?([^*\n]+)\*?\*?/g);
      if (contactMatches) {
        info.contacts = contactMatches
          .slice(0, 5)
          .map((contact) => contact.replace(/^[-*]\s*\*?\*?/, '').replace(/\*?\*?$/, '').trim())
          .filter(Boolean);
      }
    }

    return info;
  } catch {
    return null;
  }
}

function buildPersonIndex(peopleDir) {
  const index = {};
  for (const subdir of ['Internal', 'External', 'CPO_Network']) {
    const dirPath = path.join(peopleDir, subdir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith('.md')) continue;
      const fileName = file.replace(/\.md$/, '');
      const absolutePath = path.join(dirPath, file);
      index[fileName.toLowerCase()] = absolutePath;
      index[fileName.replace(/_/g, ' ').toLowerCase()] = absolutePath;
    }
  }
  return index;
}

function scanCompanyDir(dirPath, index) {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanCompanyDir(fullPath, index);
      continue;
    }
    if (!entry.name.endsWith('.md')) continue;
    const fileName = entry.name.replace(/\.md$/, '');
    index[fileName.toLowerCase()] = fullPath;
    index[fileName.replace(/_/g, ' ').toLowerCase()] = fullPath;
    index[fileName.replace(/-/g, ' ').toLowerCase()] = fullPath;
  }
}

function buildCompanyIndex(companiesDir, accountsDir) {
  const index = {};
  scanCompanyDir(companiesDir, index);
  scanCompanyDir(accountsDir, index);
  return index;
}

function collectMatches(content, index) {
  const contentLower = content.toLowerCase();
  const matches = new Set();
  for (const [needle, filePath] of Object.entries(index)) {
    if (needle.length < 4) continue;
    if (contentLower.includes(needle)) {
      matches.add(filePath);
    }
  }
  return [...matches];
}

let input;
try {
  input = readHookInput();
} catch (error) {
  skip(error.message);
}

const command = input?.tool_input?.command || '';
if (input?.tool_name !== 'Bash' || !command) {
  skip('missing-command');
}

if (!/\b(cat|sed|head|tail|less|more|bat|rg|grep|awk|find|fd|ls|stat)\b/.test(command)) {
  skip('non-read-command');
}

const paths = getPaths(input);
const candidatePaths = require('./lib/hook-utils.cjs')
  .extractBashPathCandidates(command, input?.cwd || paths.VAULT_ROOT, paths.VAULT_ROOT)
  .filter((filePath) => {
    if (filePath.includes('/05-Areas/People/') || filePath.includes('/05-Areas/Companies/')) {
      return false;
    }
    try {
      return fs.statSync(filePath).size <= 512_000;
    } catch {
      return false;
    }
  })
  .slice(0, 4);

if (candidatePaths.length === 0) {
  skip('no-readable-files-found');
}

const personIndex = buildPersonIndex(paths.PEOPLE_DIR);
const accountsDir = path.join(paths.AREAS_DIR, 'Accounts');
const companyIndex = buildCompanyIndex(paths.COMPANIES_DIR, accountsDir);
const personFiles = new Set();
const companyFiles = new Set();

for (const filePath of candidatePaths) {
  const content = fs.readFileSync(filePath, 'utf-8');
  collectMatches(content, personIndex).forEach((matchPath) => personFiles.add(matchPath));
  collectMatches(content, companyIndex).forEach((matchPath) => companyFiles.add(matchPath));
}

const contextLines = [];

const parsedPeople = [...personFiles]
  .map((filePath) => parsePersonPage(filePath))
  .filter(Boolean)
  .slice(0, 3);
if (parsedPeople.length > 0) {
  contextLines.push('<person_context>');
  contextLines.push('Referenced people:');
  for (const person of parsedPeople) {
    contextLines.push(`${person.name} - ${person.role || 'No role'} @ ${person.company || 'Unknown'}`);
    if (person.lastInteraction) {
      contextLines.push(`  Last interaction: ${person.lastInteraction}`);
    }
    if (person.openItems.length > 0) {
      contextLines.push(`  Open items: ${person.openItems.length}`);
      for (const item of person.openItems.slice(0, 2)) {
        contextLines.push(`    - ${item.substring(0, 60)}${item.length > 60 ? '...' : ''}`);
      }
    }
  }
  contextLines.push('</person_context>');
}

const parsedCompanies = [...companyFiles]
  .map((filePath) => parseCompanyPage(filePath))
  .filter(Boolean)
  .slice(0, 3);
if (parsedCompanies.length > 0) {
  contextLines.push('<company_context>');
  contextLines.push('Referenced companies:');
  for (const company of parsedCompanies) {
    contextLines.push(`${company.name}${company.status ? ` - ${company.status}` : ''}`);
    if (company.contacts.length > 0) {
      contextLines.push(`  Key contacts: ${company.contacts.slice(0, 3).join(', ')}`);
    }
    if (company.lastMeeting) {
      contextLines.push(`  Last meeting: ${company.lastMeeting}`);
    }
    if (company.openTasks.length > 0) {
      contextLines.push(`  Open tasks: ${company.openTasks.length}`);
      for (const task of company.openTasks.slice(0, 2)) {
        contextLines.push(`    - ${task.substring(0, 60)}${task.length > 60 ? '...' : ''}`);
      }
    }
    if (company.context) {
      contextLines.push(`  Context: ${company.context.substring(0, 100)}${company.context.length > 100 ? '...' : ''}`);
    }
  }
  contextLines.push('</company_context>');
}

if (contextLines.length === 0) {
  skip('no-related-context-found');
}

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `\n${contextLines.join('\n')}`,
    },
  }),
);
