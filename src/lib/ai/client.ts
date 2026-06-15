import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || '';
const baseURL = process.env.API_BASE_URL || 'https://api.openai.com/v1';

export const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: baseURL,
  dangerouslyAllowBrowser: true, // If we ever call from browser, though we should prefer calling via Next.js API routes for security!
});

export const MODEL_NAME = process.env.OPENAI_MODEL_NAME || 'gemini-3.5-flash';
