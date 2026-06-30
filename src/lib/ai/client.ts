import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || 'dummy-key-for-build';
const baseURL = process.env.API_BASE_URL || 'https://litellm-ext.deriv.ai/v1';

// Cloudflare Access service token headers — required for the external LiteLLM
// endpoint (litellm-ext.deriv.ai). These are issued by infra and let Cloudflare
// Access verify that the request is coming from a trusted service rather than
// blocking it by IP.
const cfClientId = process.env.CF_CLIENT_ID || '';
const cfClientSecret = process.env.CF_CLIENT_SECRET || '';

export const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: baseURL,
  // dangerouslyAllowBrowser is kept false-equivalent here; all LLM calls must
  // go through Next.js API routes (server-side) — never directly from the browser.
  fetch: async (url, init) => {
    const newInit = init || {};
    const newHeaders: Record<string, string> = {};

    // Flatten whatever header format Next.js / the OpenAI SDK passed in
    if (newInit.headers) {
      if (newInit.headers instanceof Headers) {
        newInit.headers.forEach((value, key) => {
          newHeaders[key] = value;
        });
      } else if (Array.isArray(newInit.headers)) {
        (newInit.headers as [string, string][]).forEach(([key, value]) => {
          newHeaders[key] = value;
        });
      } else {
        Object.assign(newHeaders, newInit.headers as Record<string, string>);
      }
    }

    // Enforce User-Agent (Next.js fetch polyfill can drop it)
    newHeaders['User-Agent'] = 'Deriv-Agent-Loop/1.0';

    // Attach Cloudflare Access service token headers when configured.
    // These are the credentials that allow requests from Vercel (external IP)
    // to pass through the Cloudflare Access policy protecting litellm-ext.deriv.ai.
    if (cfClientId) newHeaders['CF-Access-Client-Id'] = cfClientId;
    if (cfClientSecret) newHeaders['CF-Access-Client-Secret'] = cfClientSecret;

    newInit.headers = newHeaders;
    return fetch(url, newInit);
  }
});

export const MODEL_NAME = process.env.OPENAI_MODEL_NAME || 'deepseek-v4-pro';
