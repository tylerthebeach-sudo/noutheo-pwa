/**
 * Noutheo Cloudflare Worker relay.
 *
 * This is the only piece of the PWA that needs a server. It holds your Anthropic
 * API key as a secret (never shipped to the browser) and forwards chat requests
 * to https://api.anthropic.com/v1/messages.
 *
 * SETUP:
 *  1. Create a free Cloudflare account, install Wrangler (`npm install -g wrangler`).
 *  2. From this `worker/` folder, run: `wrangler init` (or just deploy this file directly
 *     via the Cloudflare dashboard "Workers" -> "Create Worker" -> paste this code).
 *  3. Set your Anthropic API key as a secret:
 *       wrangler secret put ANTHROPIC_API_KEY
 *     (or in the dashboard: Worker -> Settings -> Variables -> add an encrypted variable)
 *  4. Deploy. You'll get a URL like https://noutheo-relay.<your-subdomain>.workers.dev
 *  5. Paste that URL into the PWA's Settings screen as the "Relay URL".
 *
 * Optionally set ALLOWED_ORIGIN to your PWA's deployed origin to restrict CORS,
 * e.g. https://yourusername.github.io
 */

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 700;
const ANTHROPIC_VERSION = '2023-06-01';

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'content-type': 'application/json', ...corsHeaders }
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'content-type': 'application/json', ...corsHeaders }
      });
    }

    const { system, messages } = body;
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { 'content-type': 'application/json', ...corsHeaders }
      });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: system || '',
        messages
      })
    });

    const text = await anthropicRes.text();

    return new Response(text, {
      status: anthropicRes.status,
      headers: { 'content-type': 'application/json', ...corsHeaders }
    });
  }
};
