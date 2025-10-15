// AI service for OpenAI and Claude API integration
import { getSecret, hasSecret, SECRET_KEYS } from './secretsService';

// Helper to get LLM settings
function getLLMSettings() {
  try {
    const saved = localStorage.getItem('hashbase_ai_llm_settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading LLM settings:', e);
  }
  return {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  };
}

// AI Provider constants
export const AI_PROVIDERS = {
  OPENAI: 'openai',
  CLAUDE: 'claude',
};

// Model constants
export const AI_MODELS = {
  OPENAI: {
    GPT4_TURBO: 'gpt-4-turbo',
    GPT4: 'gpt-4-turbo-preview',
    GPT35_TURBO: 'gpt-3.5-turbo',
  },
  CLAUDE: {
    SONNET_45: 'claude-sonnet-4.5',
    SONNET_4: 'claude-sonnet-4',
    SONNET: 'claude-3-5-sonnet-20241022',
    OPUS: 'claude-3-opus-20240229',
    HAIKU: 'claude-3-haiku-20240307',
  },
};

/**
 * Check if a provider is configured
 * @param {string} provider - AI_PROVIDERS.OPENAI or AI_PROVIDERS.CLAUDE
 * @returns {boolean}
 */
export function isProviderConfigured(provider) {
  switch (provider) {
    case AI_PROVIDERS.OPENAI:
      return hasSecret(SECRET_KEYS.OPENAI_API_KEY);
    case AI_PROVIDERS.CLAUDE:
      return hasSecret(SECRET_KEYS.CLAUDE_API_KEY);
    default:
      return false;
  }
}

/**
 * Get available providers
 * @returns {Array<{id: string, name: string, models: Array}>}
 */
export function getAvailableProviders() {
  const providers = [];
  
  if (isProviderConfigured(AI_PROVIDERS.OPENAI)) {
    providers.push({
      id: AI_PROVIDERS.OPENAI,
      name: 'OpenAI',
      models: [
        { id: AI_MODELS.OPENAI.GPT4_TURBO, name: 'GPT-4 Turbo' },
        { id: AI_MODELS.OPENAI.GPT4, name: 'GPT-4' },
        { id: AI_MODELS.OPENAI.GPT35_TURBO, name: 'GPT-3.5 Turbo' },
      ],
    });
  }
  
  if (isProviderConfigured(AI_PROVIDERS.CLAUDE)) {
    providers.push({
      id: AI_PROVIDERS.CLAUDE,
      name: 'Claude',
      models: [
        { id: AI_MODELS.CLAUDE.SONNET_45, name: 'Claude Sonnet 4.5' },
        { id: AI_MODELS.CLAUDE.SONNET_4, name: 'Claude Sonnet 4' },
        { id: AI_MODELS.CLAUDE.SONNET, name: 'Claude 3.5 Sonnet' },
        { id: AI_MODELS.CLAUDE.OPUS, name: 'Claude 3 Opus' },
        { id: AI_MODELS.CLAUDE.HAIKU, name: 'Claude 3 Haiku' },
      ],
    });
  }
  
  return providers;
}

/**
 * Send a chat message to OpenAI
 * @param {Array} messages - Array of message objects {role, content}
 * @param {string} model - Model ID
 * @param {Function} onChunk - Callback for streaming chunks
 * @returns {Promise<string>} Complete response
 */
async function sendOpenAIMessage(messages, model, onChunk) {
  const apiKey = getSecret(SECRET_KEYS.OPENAI_API_KEY);
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const settings = getLLMSettings();
  
  // Use backend proxy to avoid CORS issues
  const response = await fetch('/api/openai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-openai-api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      messages,
      settings: {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP,
        frequencyPenalty: settings.frequencyPenalty,
        presencePenalty: settings.presencePenalty,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'OpenAI API request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            if (onChunk) onChunk(content);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return fullResponse;
}

/**
 * Send a chat message to Claude
 * @param {Array} messages - Array of message objects {role, content}
 * @param {string} model - Model ID
 * @param {Function} onChunk - Callback for streaming chunks
 * @returns {Promise<string>} Complete response
 */
async function sendClaudeMessage(messages, model, onChunk) {
  const apiKey = getSecret(SECRET_KEYS.CLAUDE_API_KEY);
  
  if (!apiKey) {
    throw new Error('Claude API key not configured');
  }

  // Convert messages format for Claude (extract system message if present)
  let systemMessage = '';
  const claudeMessages = messages.filter(msg => {
    if (msg.role === 'system') {
      systemMessage = msg.content;
      return false;
    }
    return true;
  });

  const settings = getLLMSettings();
  
  // Use backend proxy to avoid CORS issues
  const response = await fetch('/api/claude/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-claude-api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      messages: claudeMessages,
      system: systemMessage || undefined,
      settings: {
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
        topP: settings.topP,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Claude API request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);

        try {
          const parsed = JSON.parse(data);
          
          if (parsed.type === 'content_block_delta') {
            const content = parsed.delta?.text || '';
            if (content) {
              fullResponse += content;
              if (onChunk) onChunk(content);
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return fullResponse;
}

/**
 * Send a chat message to the selected AI provider
 * @param {string} provider - AI_PROVIDERS.OPENAI or AI_PROVIDERS.CLAUDE
 * @param {string} model - Model ID
 * @param {Array} messages - Array of message objects {role, content}
 * @param {Function} onChunk - Callback for streaming chunks (optional)
 * @returns {Promise<string>} Complete response
 */
export async function sendChatMessage(provider, model, messages, onChunk) {
  if (!isProviderConfigured(provider)) {
    throw new Error(`${provider} is not configured. Please add your API key in Settings.`);
  }

  switch (provider) {
    case AI_PROVIDERS.OPENAI:
      return await sendOpenAIMessage(messages, model, onChunk);
    case AI_PROVIDERS.CLAUDE:
      return await sendClaudeMessage(messages, model, onChunk);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Estimate token count (rough approximation)
 * @param {string} text
 * @returns {number}
 */
export function estimateTokenCount(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}
