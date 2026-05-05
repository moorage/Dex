#!/usr/bin/env node

/**
 * Unified LLM Client
 *
 * Supports direct provider API keys plus local Codex CLI ChatGPT auth.
 *
 * Auto mode resolution:
 *   1. Prefer file-backed Codex ChatGPT auth when available
 *   2. Otherwise fall back to direct provider API keys
 *   3. Otherwise use local ChatGPT-authenticated Codex if available
 */

try {
  require('dotenv').config();
} catch {
  // Optional in test or stripped-down environments.
}

const DEFAULT_OPENAI_MODEL = 'gpt-5.5';
const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash-thinking-exp-1219';
const DEX_LLM_AUTH_MODE_ENV = 'DEX_LLM_AUTH_MODE';
const AUTH_MODE_AUTO = 'auto';
const AUTH_MODE_API_KEY = 'api-key';
const AUTH_MODE_CODEX_CHATGPT = 'codex-chatgpt';

function getCodexClient(options = {}) {
  return options.codexClient || require('./codex-chatgpt-client.cjs');
}

function getConfiguredApiKeys(env = process.env) {
  return {
    openai: env.OPENAI_API_KEY || '',
    anthropic: env.ANTHROPIC_API_KEY || '',
    gemini: env.GEMINI_API_KEY || '',
  };
}

// Determine which direct provider to use
function getAvailableProvider(env = process.env) {
  const keys = getConfiguredApiKeys(env);
  if (keys.openai) return 'openai';
  if (keys.anthropic) return 'anthropic';
  if (keys.gemini) return 'gemini';
  return null;
}

function normalizeAuthMode(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return AUTH_MODE_AUTO;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized !== AUTH_MODE_AUTO &&
    normalized !== AUTH_MODE_API_KEY &&
    normalized !== AUTH_MODE_CODEX_CHATGPT
  ) {
    throw new Error(
      `Unsupported ${DEX_LLM_AUTH_MODE_ENV} value "${value}". Use "auto", "api-key", or "codex-chatgpt".`
    );
  }

  return normalized;
}

function getConfiguredAuthMode(env = process.env) {
  return normalizeAuthMode(env[DEX_LLM_AUTH_MODE_ENV]);
}

function buildMissingAuthError(authMode = AUTH_MODE_AUTO, codexMessage = '') {
  if (authMode === AUTH_MODE_API_KEY) {
    return new Error(
      `Direct API auth is required because ${DEX_LLM_AUTH_MODE_ENV}=api-key, but no provider API key is configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.`
    );
  }

  if (authMode === AUTH_MODE_CODEX_CHATGPT) {
    return new Error(
      codexMessage ||
        `Codex ChatGPT auth is required because ${DEX_LLM_AUTH_MODE_ENV}=codex-chatgpt. Run \`codex login\` and sign in with ChatGPT.`
    );
  }

  return new Error(
    `No Dex LLM auth configured. Either sign in with ChatGPT using \`codex login\`, or set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.`
  );
}

function resolveAuthTarget(options = {}) {
  const env = options.env || process.env;
  const authMode = getConfiguredAuthMode(env);
  const provider = getAvailableProvider(env);
  const codexClient = getCodexClient(options);
  const codexStatus = codexClient.getChatGPTAuthStatus({
    env,
    authStatus: options.codexAuthStatus,
    execFileSyncImpl: options.execFileSyncImpl,
    useCache: options.useCache,
  });

  if (authMode === AUTH_MODE_API_KEY) {
    if (!provider) {
      throw buildMissingAuthError(authMode, codexStatus.message);
    }
    return { type: 'provider', provider, authMode, codexStatus };
  }

  if (authMode === AUTH_MODE_CODEX_CHATGPT) {
    if (!codexStatus.available) {
      throw buildMissingAuthError(authMode, codexStatus.message);
    }
    return { type: AUTH_MODE_CODEX_CHATGPT, provider: AUTH_MODE_CODEX_CHATGPT, authMode, codexStatus };
  }

  if (codexStatus.available && codexStatus.hasFileBackedAuth) {
    return { type: AUTH_MODE_CODEX_CHATGPT, provider: AUTH_MODE_CODEX_CHATGPT, authMode, codexStatus };
  }

  if (provider) {
    return { type: 'provider', provider, authMode, codexStatus };
  }

  if (codexStatus.available) {
    return { type: AUTH_MODE_CODEX_CHATGPT, provider: AUTH_MODE_CODEX_CHATGPT, authMode, codexStatus };
  }

  throw buildMissingAuthError(authMode, codexStatus.message);
}

// ============================================================================
// ANTHROPIC CLIENT
// ============================================================================

async function generateWithAnthropic(prompt, options = {}) {
  const { anthropic: apiKey } = getConfiguredApiKeys(options.env);
  const anthropic =
    options.anthropicClient ||
    new (require('@anthropic-ai/sdk'))({ apiKey });
  
  const message = await anthropic.messages.create({
    model: options.model || DEFAULT_ANTHROPIC_MODEL,
    max_tokens: options.maxOutputTokens || 4096,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });
  
  return message.content[0].text;
}

// ============================================================================
// OPENAI CLIENT
// ============================================================================

function shouldUseReasoningConfig(model) {
  return typeof model === 'string' && model.startsWith('gpt-5');
}

function extractOpenAIResponseText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const output = Array.isArray(response?.output) ? response.output : [];
  const textParts = [];

  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (typeof contentItem?.text === 'string' && contentItem.text.trim()) {
        textParts.push(contentItem.text.trim());
      }
    }
  }

  if (textParts.length === 0) {
    throw new Error('OpenAI returned no output text');
  }

  return textParts.join('\n\n');
}

async function generateWithOpenAI(prompt, options = {}) {
  const { openai: apiKey } = getConfiguredApiKeys(options.env);
  const openai =
    options.openaiClient ||
    new (require('openai'))({ apiKey });
  const model = options.model || DEFAULT_OPENAI_MODEL;
  
  const request = {
    model,
    input: prompt,
    max_output_tokens: options.maxOutputTokens || 4096,
    store: false,
  };

  if (options.temperature !== undefined) {
    request.temperature = options.temperature;
  }

  if (shouldUseReasoningConfig(model)) {
    request.reasoning = {
      effort: options.reasoningEffort || 'medium',
    };
  }

  const response = await openai.responses.create(request);
  
  return extractOpenAIResponseText(response);
}

async function generateWithCodex(prompt, options = {}) {
  const codexClient = getCodexClient(options);

  return codexClient.runStringTask({
    taskInstruction: [
      'You are a local Dex text-generation helper.',
      'Complete the task described in the <stdin> block.',
      'Return only the requested answer text.',
    ].join('\n\n'),
    stdinText: prompt,
    model: options.model || DEFAULT_OPENAI_MODEL,
    env: options.env,
    authStatus: options.codexAuthStatus,
    execFileSyncImpl: options.execFileSyncImpl,
    useCache: options.useCache,
  });
}

// ============================================================================
// GEMINI CLIENT
// ============================================================================

async function generateWithGemini(prompt, options = {}) {
  const { gemini: apiKey } = getConfiguredApiKeys(options.env);
  const genAI =
    options.geminiClient ||
    new (require('@google/generative-ai').GoogleGenerativeAI)(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: options.model || DEFAULT_GEMINI_MODEL,
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens || 4096,
      temperature: options.temperature || 1.0,
    }
  });
  
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ============================================================================
// UNIFIED INTERFACE
// ============================================================================

/**
 * Generate content using the first available LLM provider
 * 
 * @param {string} prompt - The prompt to send to the LLM
 * @param {object} options - Generation options
 * @param {string} options.model - Model to use (provider-specific)
 * @param {number} options.maxOutputTokens - Max tokens to generate
 * @param {number} options.temperature - Temperature (0-1)
 * @param {string} options.provider - Force a specific provider ('anthropic', 'openai', 'gemini')
 * @returns {Promise<string>} Generated text
 */
async function generateContent(prompt, options = {}) {
  const requestedProvider = options.provider;
  let target;

  if (requestedProvider) {
    if (requestedProvider === AUTH_MODE_CODEX_CHATGPT) {
      target = { type: AUTH_MODE_CODEX_CHATGPT, provider: AUTH_MODE_CODEX_CHATGPT };
    } else {
      target = { type: 'provider', provider: requestedProvider };
    }
  } else {
    target = resolveAuthTarget(options);
  }

  switch (target.provider) {
    case 'anthropic':
      return await generateWithAnthropic(prompt, options);
    case 'openai':
      return await generateWithOpenAI(prompt, options);
    case 'gemini':
      return await generateWithGemini(prompt, options);
    case AUTH_MODE_CODEX_CHATGPT:
      return await generateWithCodex(prompt, options);
    default:
      throw new Error(`Unknown provider: ${target.provider}`);
  }
}

/**
 * Get the currently active provider
 */
function getActiveProvider(options = {}) {
  try {
    return resolveAuthTarget(options).provider;
  } catch {
    return null;
  }
}

/**
 * Check if any API key is configured
 */
function isConfigured(options = {}) {
  return getActiveProvider(options) !== null;
}

module.exports = {
  AUTH_MODE_AUTO,
  AUTH_MODE_API_KEY,
  AUTH_MODE_CODEX_CHATGPT,
  DEFAULT_CODEX_MODEL: DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEX_LLM_AUTH_MODE_ENV,
  getConfiguredAuthMode,
  getConfiguredApiKeys,
  getAvailableProvider,
  normalizeAuthMode,
  resolveAuthTarget,
  extractOpenAIResponseText,
  generateContent,
  generateWithCodex,
  generateWithOpenAI,
  getActiveProvider,
  isConfigured,
};
