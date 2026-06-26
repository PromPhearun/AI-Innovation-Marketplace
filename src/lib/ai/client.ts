import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || 'dummy-key-for-build';
const baseURL = process.env.API_BASE_URL || 'https://api.openai.com/v1';

export const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: baseURL,
  dangerouslyAllowBrowser: true, // If we ever call from browser, though we should prefer calling via Next.js API routes for security!
  defaultHeaders: {
    'User-Agent': 'Deriv-Agent-Loop/1.0',
  },
  fetch: async (url, init) => {
    // Next.js fetch polyfill might drop User-Agent, so we enforce it
    const newInit = init || {};
    newInit.headers = {
      ...newInit.headers,
      'User-Agent': 'Deriv-Agent-Loop/1.0',
    };
    return fetch(url, newInit);
  }
});

export const MODEL_NAME = process.env.OPENAI_MODEL_NAME || 'deepseek-v4-pro';
