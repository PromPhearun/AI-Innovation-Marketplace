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
    const newHeaders: Record<string, string> = {};
    if (newInit.headers) {
      if (newInit.headers instanceof Headers) {
        newInit.headers.forEach((value, key) => {
          newHeaders[key] = value;
        });
      } else if (Array.isArray(newInit.headers)) {
        newInit.headers.forEach(([key, value]) => {
          newHeaders[key] = value;
        });
      } else {
        Object.assign(newHeaders, newInit.headers);
      }
    }
    // Force User-Agent to bypass Cloudflare WAF block
    newHeaders['User-Agent'] = 'Deriv-Agent-Loop/1.0';
    newInit.headers = newHeaders;
    return fetch(url, newInit);
  }
});

export const MODEL_NAME = process.env.OPENAI_MODEL_NAME || 'deepseek-v4-pro';
