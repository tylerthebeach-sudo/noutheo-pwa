# Noutheo PWA

A Progressive Web App version of Noutheo — Biblical Counsel for the Soul. This is a separate, standalone build from the Android app and does not modify or depend on it.

## Features

- Home screen with rotating Scripture/quote of the session
- Counsel Session chat (Reformed biblical-counseling persona, same system prompt as the Android app)
- My Journal (IndexedDB-backed)
- Action Steps with sub-steps
- Session Quotes history
- Resources screen + The Five Solas
- Settings (name, theme, relay URL, clear history)
- Journal Vault: PIN-protected, AES-GCM encrypted session transcripts (stored only on-device)
- Installable on iOS Safari ("Add to Home Screen") and Android/desktop Chrome via manifest + service worker
- Notification/reminder feature intentionally NOT included (Android-only)

## Deployment

### 1. Deploy the Cloudflare Worker relay (required for chat)

The chat screen calls Anthropic's API through a small relay so your API key is never exposed in the browser.

1. Create a free Cloudflare account.
2. Install Wrangler: `npm install -g wrangler`
3. From the `worker/` folder, deploy `worker.js` (via `wrangler deploy` or paste into the Cloudflare dashboard "Workers" → "Create Worker").
4. Set your Anthropic API key as a secret:
   ```
   wrangler secret put ANTHROPIC_API_KEY
   ```
5. (Optional) Set `ALLOWED_ORIGIN` to your deployed PWA's origin to restrict CORS.
6. You'll get a URL like `https://noutheo-relay.<subdomain>.workers.dev` — copy it.

### 2. Host the PWA

Any static host works (GitHub Pages, Netlify, Cloudflare Pages, etc.). Upload the contents of this folder (`index.html`, `manifest.json`, `css/`, `js/`, `icons/`, `sw.js`).

### 3. Configure the app

1. Open the deployed site.
2. Go to Settings → paste the Worker URL into "Relay URL" → Save.
3. Optionally set your name and theme preference.
4. On iOS Safari: Share → "Add to Home Screen" to install. On Android/desktop Chrome: use the install icon in the address bar.

## Data & Privacy

- All journal entries, action steps, session quotes, conversation history, and settings are stored locally in the browser's IndexedDB — nothing is sent to any server except chat messages, which go to your own relay.
- Journal Vault entries are additionally encrypted with AES-GCM using a key derived (PBKDF2, 100,000 iterations) from your PIN. The PIN itself is never stored.
- Service worker cache updates only refresh app shell files (HTML/CSS/JS/icons) — IndexedDB data is untouched by updates, so saved information persists across app updates.

## Folder structure

```
Noutheo-PWA/
├── index.html
├── manifest.json
├── sw.js
├── css/styles.css
├── js/
│   ├── app.js       — main app controller
│   ├── chat.js       — system prompt, markdown stripping, relay client
│   ├── db.js         — IndexedDB helper
│   ├── quotes.js     — quote bank
│   └── resources.js  — Resources & Five Solas text
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── worker/worker.js   — Cloudflare Worker relay (deploy separately)
```

Soli Deo Gloria.
