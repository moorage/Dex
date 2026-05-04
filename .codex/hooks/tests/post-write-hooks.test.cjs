const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

function runHook(scriptName, input, cwd) {
  const scriptPath = path.join(__dirname, '..', scriptName);
  return spawnSync('node', [scriptPath], {
    cwd,
    input: JSON.stringify(input),
    encoding: 'utf-8',
    env: { ...process.env, DEX_HOOK_DEBUG: '1' },
  });
}

function makeTempProject(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  for (const dir of [
    'System',
    '05-Areas/Career',
    '05-Areas/People/Internal',
    '00-Inbox/Meetings',
  ]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  return root;
}

test('post-write-career-evidence captures evidence from touched career file', () => {
  const root = makeTempProject('dex-career-hook');
  const careerFile = path.join(root, '05-Areas/Career/Wins.md');
  fs.writeFileSync(careerFile, '# Wins\n\nImproved retention by 12% and shipped the launch.\n');

  const result = runHook(
    'post-write-career-evidence.cjs',
    {
      cwd: root,
      tool_name: 'apply_patch',
      tool_input: {
        command: ['*** Begin Patch', '*** Update File: 05-Areas/Career/Wins.md', '@@', '-old', '+new', '*** End Patch'].join('\n'),
      },
    },
    root,
  );

  assert.equal(result.status, 0);
  const evidenceLog = fs.readFileSync(path.join(root, '05-Areas/Career/Evidence_Log.md'), 'utf-8');
  assert.match(evidenceLog, /\[\[Wins\]\]/);
});

test('post-write-meeting-person-update appends meeting reference to matching person page', () => {
  const root = makeTempProject('dex-meeting-hook');
  const meetingFile = path.join(root, '00-Inbox/Meetings/TestMeeting.md');
  const personFile = path.join(root, '05-Areas/People/Internal/Jane_Doe.md');

  fs.writeFileSync(meetingFile, '# Test Meeting\n\nMet with [[Jane_Doe]] about next steps.\n');
  fs.writeFileSync(personFile, '# Jane Doe\n\n## Recent Meetings\n');

  const result = runHook(
    'post-write-meeting-person-update.cjs',
    {
      cwd: root,
      tool_name: 'apply_patch',
      tool_input: {
        command: ['*** Begin Patch', '*** Update File: 00-Inbox/Meetings/TestMeeting.md', '@@', '-old', '+new', '*** End Patch'].join('\n'),
      },
    },
    root,
  );

  assert.equal(result.status, 0);
  const updatedPersonPage = fs.readFileSync(personFile, 'utf-8');
  assert.match(updatedPersonPage, /\[\[TestMeeting\]\]/);
});
