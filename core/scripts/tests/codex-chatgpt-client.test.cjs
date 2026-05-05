const test = require('node:test');
const assert = require('node:assert/strict');

const codexClient = require('../../../.scripts/lib/codex-chatgpt-client.cjs');

test('getChatGPTAuthStatus detects ChatGPT login output', () => {
  codexClient.clearChatGPTAuthStatusCache();

  const status = codexClient.getChatGPTAuthStatus({
    env: {},
    useCache: false,
    execFileSyncImpl: () => 'Logged in using ChatGPT\n',
  });

  assert.equal(status.available, true);
  assert.equal(status.mode, codexClient.AUTH_MODE_CHATGPT);
});

test('getChatGPTAuthStatus surfaces a helpful message when codex is missing', () => {
  codexClient.clearChatGPTAuthStatusCache();

  const status = codexClient.getChatGPTAuthStatus({
    env: {},
    useCache: false,
    execFileSyncImpl: () => {
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    },
  });

  assert.equal(status.available, false);
  assert.match(status.message, /Codex CLI is not installed/u);
});

test('runJsonTask parses the final JSON response from codex exec', () => {
  codexClient.clearChatGPTAuthStatusCache();

  let execArgs = null;
  const result = codexClient.runJsonTask({
    env: {},
    authStatus: { available: true, hasFileBackedAuth: true },
    taskInstruction: 'Summarize the payload.',
    stdinText: 'hello world',
    execFileSyncImpl: (_command, args, options) => {
      execArgs = { args, options };
      const outputPath = args[args.indexOf('--output-last-message') + 1];
      require('node:fs').writeFileSync(outputPath, '{"result":"Done"}', 'utf8');
      return '';
    },
  });

  assert.equal(result.result, 'Done');
  assert.match(execArgs.options.input, /hello world/u);
  assert.ok(execArgs.args.includes('--output-schema'));
});
