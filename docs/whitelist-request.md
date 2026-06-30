# Request: Whitelist Vercel Egress IP on the LiteLLM Gateway (Cloudflare 403)

> **Status: ✅ RESOLVED (2026-06-30)**
> Infra provided Cloudflare Access service token credentials (`CF-Access-Client-Id` /
> `CF-Access-Client-Secret`) and a dedicated external endpoint (`litellm-ext.deriv.ai`).
> The app now sends these headers on every LLM request, bypassing the Cloudflare
> Access policy without needing IP whitelisting.
>
> ~~The AI Agent Loop fails because Cloudflare's WAF blocks our Vercel server-side
> egress IP when calling the AI gateway.~~

---

## Message to send to the infra / platform team

**Subject:** Please whitelist our Vercel app's egress IP on the LiteLLM gateway (Cloudflare 403)

Hi team,

Our app **ai-innovation-marketplace.vercel.app** (hosted on Vercel) is being blocked by Cloudflare when its server-side functions call the AI gateway, so the AI Agent Loop can't reach the model.

- **Target:** `https://litellmsa.deriv.ai/v1/chat/completions` (model `deepseek-v4-pro`)
- **Error:** `HTTP 403` — Cloudflare "Sorry, you have been blocked / You are unable to access deriv.ai"
- **Cloudflare Ray ID:** `a139cebc3f43d96f`
- **Blocked source IP (our Vercel egress):** `100.31.244.11`
- **Caller:** Vercel serverless functions (server-side, `User-Agent: Deriv-Agent-Loop/1.0`)

**Ask:** Please allowlist our egress IP `100.31.244.11` on the WAF for `litellmsa.deriv.ai` (and please check the matching Cloudflare event for Ray ID `a139cebc3f43d96f` to see which rule fired).

Note: Vercel's default egress IPs are shared/dynamic, so this IP can change. If you'd prefer a stable target, we can enable a dedicated static egress IP on our side and send you a fixed IP/range to allowlist — just let us know. Alternatively, if there's an allow-by-header or internal hostname we should use, we'll switch to that.

Thanks!

---

## Background / evidence

The live error banner in production showed:

```
Execution Fault — Exact Error
Builder AI failed: 403 <!DOCTYPE html> ... <title>Attention Required! | Cloudflare</title>
... Sorry, you have been blocked
... You are unable to access deriv.ai
... Cloudflare Ray ID: a139cebc3f43d96f
... Your IP: 100.31.244.11
```

This is a genuine Cloudflare WAF block, not a timeout or auth error. The
`User-Agent: Deriv-Agent-Loop/1.0` header that the app already sends (see
`src/lib/ai/client.ts`) is no longer sufficient to pass the WAF.

## Durable fix options (pick one with infra)

1. **Static egress IP (recommended):** Enable Vercel's dedicated/static egress IP
   feature on our side and have infra allowlist that fixed IP/range. This avoids
   re-blocking when Vercel rotates shared IPs.
2. **Allow-by-header:** Infra allows a shared-secret header (or the existing
   `User-Agent`) through the WAF instead of relying on IP.
3. **Internal hostname / VPC route:** If a non-Cloudflare internal endpoint
   exists, repoint `OPENAI_BASE_URL` / `API_BASE_URL` to it.

## Relevant config

- Endpoint env var: `OPENAI_BASE_URL` / `API_BASE_URL` = `https://litellmsa.deriv.ai/v1`
- Model env var: `OPENAI_MODEL_NAME` = `deepseek-v4-pro`
- Client: `src/lib/ai/client.ts`
- Agent loop runner: `src/lib/ai/agent-loop-runner.ts`
