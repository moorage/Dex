const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { extractApplyPatchTargets, extractBashPathCandidates, extractTouchedFiles } = require('../lib/hook-utils.cjs');

test('extractApplyPatchTargets returns touched files from apply_patch content', () => {
  const command = [
    '*** Begin Patch',
    '*** Update File: alpha.md',
    '@@',
    '-old',
    '+new',
    '*** Add File: nested/bravo.md',
    '+hello',
    '*** End Patch',
  ].join('\n');

  assert.deepEqual(extractApplyPatchTargets(command), ['alpha.md', 'nested/bravo.md']);
});

test('extractBashPathCandidates resolves quoted file paths', () => {
  const cwd = path.resolve(__dirname, '../../..');
  const command = 'sed -n "1,20p" "package.json"';
  const results = extractBashPathCandidates(command, cwd, cwd);
  assert.ok(results.some((filePath) => filePath.endsWith(`${path.sep}package.json`)));
});

test('extractTouchedFiles resolves direct Write and Edit payload paths', () => {
  const cwd = path.resolve(__dirname, '../../..');

  const writeResults = extractTouchedFiles({
    cwd,
    tool_name: 'Write',
    tool_input: { path: 'package.json' },
  });
  assert.ok(writeResults.some((filePath) => filePath.endsWith(`${path.sep}package.json`)));

  const editResults = extractTouchedFiles({
    cwd,
    tool_name: 'Edit',
    tool_input: { filePath: 'README.md' },
  });
  assert.ok(editResults.some((filePath) => filePath.endsWith(`${path.sep}README.md`)));
});
