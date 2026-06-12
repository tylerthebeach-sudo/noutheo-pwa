// Noutheo PWA — main application logic.

const INSTRUCTIONS_TEXT = `NOUTHEO IS A BIBLICAL COUNSELING COMPANION

Noutheo is meant to feel like talking with a wise, caring friend who knows Scripture deeply. It is not a substitute for your pastor, your church, or licensed mental health care — but a tool to help you examine your heart in light of God's Word, any time of day.

STARTING A SESSION

Tap "Begin a Session" to start talking. Noutheo will ask what's on your mind. Share honestly — a situation, a struggle, a feeling, a question about Scripture, anything at all. There's no wrong way to start.

GETTING THE MOST FROM A CONVERSATION

Be specific. Instead of "I've been struggling lately," try "I snapped at my wife again last night and I don't know why I keep doing this." Specifics give Noutheo something real to work with.

Expect questions before answers. Noutheo will usually ask a few questions to understand your heart before offering counsel. Stay with it.

One step at a time. Noutheo aims to help you find one real, concrete next step rather than overwhelming you with a list.

It's okay to disagree or push back. Honest conversation is part of how this works.

If you're in crisis. Noutheo will encourage you to reach out to a pastor, trusted person, or emergency services. This app is a supplement, not a replacement, for real-world support.

REACTING TO MESSAGES

Tap thumbs up or thumbs down under any of Noutheo's replies to shape the conversation in the moment.

SAVING TO YOUR JOURNAL

Tap "Save to Journal" in the chat menu to capture the conversation as a journal entry. Use My Journal from the home screen to review past entries.

ACTION STEPS

Use Action Steps from the home screen to track concrete next steps over time, check them off, and break them into smaller sub-steps.

SESSION QUOTES

Each time you open the app, you'll see a rotating quote or verse on the home screen. Session Quotes keeps a running history of these so you can revisit ones that spoke to you.

JOURNAL VAULT

The Journal Vault is a private, PIN-protected place to keep full transcripts of your counsel sessions, encrypted on your device. From a chat, tap "Menu" → "Save to Journal Vault."

EXPORTING SESSIONS

From a chat, "Menu" → "Export Transcript" saves the conversation as a text file you can share or store elsewhere.

SETTINGS

From the home screen, open Settings to set your name, choose a Light/Dark/System theme, configure the relay URL used for chat, or clear your conversation history.

A WORD ON PRIVACY

Your conversations are stored only on this device (in your browser's local storage). Chat messages are sent to your own Cloudflare Worker relay, which forwards them to Anthropic's API. Noutheo does not have its own servers and does not collect or see your data. Sessions saved to the Journal Vault are additionally encrypted and PIN-protected on your device.

Soli Deo Gloria.`;

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to Noutheo',
    body: 'Noutheo is a biblical counseling companion grounded in the Five Solas and the historic Reformed faith.\n\nThe name comes from νουθετέω — to admonish, instruct, counsel — as Paul used in Colossians 1:28.\n\nThis is not a replacement for your pastor or the body of Christ, but a tool to help you examine your heart by the light of Scripture.',
    verseText: '“Him we proclaim, warning everyone and teaching everyone with all wisdom, that we may present everyone mature in Christ.”',
    verseAttribution: '— Colossians 1:28',
    buttonText: 'Continue'
  },
  {
    title: 'A Word Before We Begin',
    body: 'This app offers biblical counsel informed by Scripture and biblical theology.\n\nIt is not a substitute for licensed mental health care. If you are in crisis, please contact a pastor, a trusted person, or emergency services immediately.\n\nAll counsel aims at your sanctification and the glory of God — not your comfort alone.',
    verseText: '“All Scripture is breathed out by God and profitable for doctrine, for reproof, for correction, and for training in righteousness.”',
    verseAttribution: '— 2 Timothy 3:16',
    buttonText: 'I Understand'
  }
];

const VAULT_SECURITY_TEXT = `Everything in your Journal Vault is encrypted and stored in this browser's private storage, protected by your PIN.

If someone else picked up your phone or computer and opened a file manager (or connected it to another device), they would not be able to see, open, or browse these saved sessions — the Vault is not a regular folder and cannot be reached that way.

If you choose to export a session or share it using your device's share menu, that copy leaves the Vault's protection. Please be thoughtful about where you save it and who you share it with.`;

const CHAT_TIPS_TEXT = `A few quick tips before you begin:

• Be specific and honest. Share what is actually going on — names, situations, feelings — rather than a vague summary. The more real you are, the more helpful the conversation will be.

• Take your time. This isn't a quiz with one right answer. Good conversations build over several messages, so don't feel you have to say everything at once.

• Answer the question you're asked. Noutheo will often ask one focused question — answering it directly (rather than changing the subject) helps the conversation go deeper.

• Use thumbs up / down. React to a message that resonated or didn't sit right — it helps shape the conversation in the moment.

• Save what matters. Tap "Save to Journal" or "Add Action Step" on any message to hold onto insights or next steps.

Tap "Instructions" on the home screen anytime for a fuller guide.`;

let appState = {
  settings: { name: '', theme: 'system', relay: '' },
  vaultKey: null, // CryptoKey, only held in memory while unlocked
};

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  applyTheme();
  renderHomeQuote();
  await recordSessionQuote();
  bindNav();
  bindHome();
  bindChat();
  bindJournal();
  bindActionItems();
  bindResources();
  bindSettings();
  bindVault();
  bindOnboarding();

  // Show the onboarding screens on every load/refresh.
  showOnboarding(0);
  showScreen('onboarding');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

// ── Onboarding ───────────────────────────────────────────────────────────

let onboardingStep = 0;

function showOnboarding(step) {
  onboardingStep = step;
  const data = ONBOARDING_STEPS[step];
  document.getElementById('onboarding-step-indicator').textContent = `${step + 1} / ${ONBOARDING_STEPS.length}`;
  document.getElementById('onboarding-title').textContent = data.title;
  document.getElementById('onboarding-body').textContent = data.body;
  const verse = document.getElementById('onboarding-verse');
  verse.querySelector('.text').textContent = data.verseText;
  verse.querySelector('.attribution').textContent = data.verseAttribution;
  document.getElementById('onboarding-continue').textContent = data.buttonText;
}

function bindOnboarding() {
  document.getElementById('onboarding-continue').addEventListener('click', async () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      showOnboarding(onboardingStep + 1);
    } else {
      showScreen('home');
    }
  });
}

// ── Settings & theme ─────────────────────────────────────────────────────

async function loadSettings() {
  const name = await DB.getSetting('userName', '');
  const theme = await DB.getSetting('theme', 'system');
  const relay = await DB.getSetting('relayUrl', '');
  appState.settings = { name, theme, relay };
}

function applyTheme() {
  const t = appState.settings.theme;
  let effective = t;
  if (t === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (effective === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// ── Navigation ───────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('screen-' + id).classList.remove('hidden');
}

function bindNav() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-nav');
      onScreenShow(target);
      showScreen(target);
    });
  });
  document.querySelectorAll('[data-back]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-back');
      onScreenShow(target);
      showScreen(target);
    });
  });
  document.querySelectorAll('dialog [data-close]').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('dialog').close());
  });
}

function onScreenShow(target) {
  if (target === 'journal') renderJournalList();
  if (target === 'journal-entry') resetJournalEntryForm();
  if (target === 'action-items') renderActionItems();
  if (target === 'session-quotes') renderSessionQuotes();
  if (target === 'vault') openVault();
}

// ── Toast ────────────────────────────────────────────────────────────────

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

// ── HOME ─────────────────────────────────────────────────────────────────

let homeQuoteData = null;

function renderHomeQuote() {
  const q = sessionQuote();
  homeQuoteData = q;
  const card = document.getElementById('home-quote');
  card.querySelector('.label').textContent = q.label;
  card.querySelector('.text').textContent = `“${q.text}”`;
  card.querySelector('.attribution').textContent = q.attribution;
}

async function recordSessionQuote() {
  if (!homeQuoteData) return;
  const rows = (await DB.getAll('sessionQuotes')).sort((a, b) => b.savedAt - a.savedAt);
  const last = rows[0];
  if (last && last.text === homeQuoteData.text && last.attribution === homeQuoteData.attribution) {
    return; // Don't record the same quote again back-to-back.
  }
  await DB.add('sessionQuotes', {
    label: homeQuoteData.label,
    text: homeQuoteData.text,
    attribution: homeQuoteData.attribution,
    savedAt: Date.now()
  });
}

function bindHome() {
  document.getElementById('btn-instructions').addEventListener('click', () => {
    document.getElementById('instructions-text').textContent = INSTRUCTIONS_TEXT;
    document.getElementById('dialog-instructions').showModal();
  });
}

// ── RESOURCES ────────────────────────────────────────────────────────────

function bindResources() {
  document.getElementById('resources-text').textContent = RESOURCES_TEXT;
  document.getElementById('btn-five-solas').addEventListener('click', () => {
    document.getElementById('five-solas-text').textContent = FIVE_SOLAS_TEXT;
    document.getElementById('dialog-five-solas').showModal();
  });
}

// ── SETTINGS ─────────────────────────────────────────────────────────────

function bindSettings() {
  document.getElementById('settings-name').value = appState.settings.name;
  document.getElementById('settings-theme').value = appState.settings.theme;
  document.getElementById('settings-relay').value = appState.settings.relay;

  document.getElementById('settings-save').addEventListener('click', async () => {
    const name = document.getElementById('settings-name').value.trim();
    const theme = document.getElementById('settings-theme').value;
    const relay = document.getElementById('settings-relay').value.trim();
    await DB.setSetting('userName', name);
    await DB.setSetting('theme', theme);
    await DB.setSetting('relayUrl', relay);
    appState.settings = { name, theme, relay };
    applyTheme();
    toast('Settings saved.');
  });

  document.getElementById('settings-clear-history').addEventListener('click', async () => {
    if (!confirm('Clear all conversation history? This cannot be undone.')) return;
    await DB.clear('conversation');
    chatMessages = [];
    renderChatMessages();
    toast('Conversation history cleared.');
  });

  document.getElementById('settings-clear-all').addEventListener('click', async () => {
    if (!confirm('Clear ALL data? This deletes your journal, action steps, session quotes, conversation history, and journal vault (including vault PIN). Settings like your name, theme, and relay URL are kept. This cannot be undone.')) return;
    await Promise.all([
      DB.clear('journal'),
      DB.clear('actionItems'),
      DB.clear('vault'),
      DB.clear('sessionQuotes'),
      DB.clear('conversation')
    ]);
    await DB.delete('settings', 'vaultPin');
    appState.vaultKey = null;
    chatMessages = [];
    renderChatMessages();
    toast('All data cleared.');
  });
}

// ── CHAT ─────────────────────────────────────────────────────────────────

let chatMessages = []; // {role, content}
let chatBusy = false;

function bindChat() {
  document.querySelector('[data-nav="chat"]').addEventListener('click', async () => {
    await loadChatHistory();
    document.getElementById('chat-tips-text').textContent = CHAT_TIPS_TEXT;
    document.getElementById('dialog-chat-tips').showModal();
  });

  document.getElementById('chat-send').addEventListener('click', sendChatMessage);
  const input = document.getElementById('chat-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  document.getElementById('btn-chat-menu').addEventListener('click', () => {
    document.getElementById('dialog-chat-menu').showModal();
  });

  document.getElementById('menu-save-journal').addEventListener('click', async () => {
    await saveTranscriptToJournal();
    document.getElementById('dialog-chat-menu').close();
  });

  document.getElementById('menu-save-vault').addEventListener('click', () => {
    document.getElementById('dialog-chat-menu').close();
    document.getElementById('vault-title-input').value = '';
    document.getElementById('dialog-vault-title').showModal();
  });

  document.getElementById('vault-title-save').addEventListener('click', async () => {
    const title = document.getElementById('vault-title-input').value.trim() || 'Untitled Session';
    // Close this dialog BEFORE opening the PIN dialog — having two <dialog>
    // elements open as modals at once breaks the PIN dialog on some browsers
    // (notably Android Chrome), so the PIN entry silently does nothing.
    document.getElementById('dialog-vault-title').close();
    await saveTranscriptToVault(title);
  });

  document.getElementById('menu-export').addEventListener('click', () => {
    exportTranscript();
    document.getElementById('dialog-chat-menu').close();
  });

  document.getElementById('menu-clear').addEventListener('click', async () => {
    if (!confirm('Clear this conversation and start fresh?')) return;
    await DB.clear('conversation');
    chatMessages = [];
    renderChatMessages();
    document.getElementById('dialog-chat-menu').close();
  });
}

async function loadChatHistory() {
  const rows = await DB.getAll('conversation');
  chatMessages = rows.sort((a, b) => a.id - b.id).map(r => ({ role: r.role, content: r.content, id: r.id, hidden: r.hidden }));
  renderChatMessages();
  if (chatMessages.length === 0) {
    // Kick off with a greeting prompt from the model.
    await requestAssistantReply();
  }
}

function renderChatMessages() {
  const wrap = document.getElementById('chat-messages');
  wrap.innerHTML = '';
  chatMessages.forEach((m, idx) => {
    if (m.hidden) return;
    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + (m.role === 'user' ? 'user' : 'assistant');
    bubble.textContent = m.content;
    wrap.appendChild(bubble);

    if (m.role === 'assistant') {
      const actions = document.createElement('div');
      actions.className = 'bubble-actions';
      actions.innerHTML = `<span data-act="up">👍</span><span data-act="down">👎</span><span data-act="journal">Save to Journal</span><span data-act="step">Add Action Step</span><span data-act="copy">Copy</span>`;
      actions.querySelector('[data-act="up"]').addEventListener('click', () => sendReaction(true, idx));
      actions.querySelector('[data-act="down"]').addEventListener('click', () => sendReaction(false, idx));
      actions.querySelector('[data-act="journal"]').addEventListener('click', () => saveMessageToJournal(m.content));
      actions.querySelector('[data-act="step"]').addEventListener('click', () => saveMessageAsActionStep(m.content));
      actions.querySelector('[data-act="copy"]').addEventListener('click', () => copyToClipboard(m.content));
      wrap.appendChild(actions);
    }
  });
  wrap.scrollTop = wrap.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || chatBusy) return;
  input.value = '';
  input.style.height = 'auto';

  const row = { role: 'user', content: text };
  const id = await DB.add('conversation', row);
  chatMessages.push({ ...row, id });
  renderChatMessages();
  await requestAssistantReply();
}

async function sendReaction(positive, idx) {
  if (chatBusy) return;
  const note = reactionNote(positive);
  const row = { role: 'user', content: note, hidden: true };
  const id = await DB.add('conversation', row);
  chatMessages.push({ ...row, id });
  await requestAssistantReply();
}

async function requestAssistantReply() {
  if (!appState.settings.relay) {
    toast('Set a Relay URL in Settings first.');
    if (chatMessages.length === 0) {
      const wrap = document.getElementById('chat-messages');
      const bubble = document.createElement('div');
      bubble.className = 'bubble assistant';
      bubble.textContent = 'Noutheo isn’t connected yet. Go to Settings and enter your Relay URL, then come back and reopen a session.';
      wrap.innerHTML = '';
      wrap.appendChild(bubble);
    }
    return;
  }
  chatBusy = true;
  showTypingIndicator(true);

  const systemPrompt = buildSystemPrompt({
    userName: appState.settings.name || null,
    currentDateTime: new Date().toLocaleString()
  });

  const apiMessages = chatMessages.map(m => ({ role: m.role, content: m.content }));
  if (apiMessages.length === 0) {
    apiMessages.push({ role: 'user', content: 'Hi.' });
  }

  try {
    const raw = await sendMessageToRelay(appState.settings.relay, apiMessages, systemPrompt);
    let text = raw;
    let ended = false;
    if (text.includes(END_SESSION_MARKER)) {
      ended = true;
      text = text.replace(END_SESSION_MARKER, '').trim();
    }
    text = stripMarkdown(text);

    const row = { role: 'assistant', content: text };
    const id = await DB.add('conversation', row);
    chatMessages.push({ ...row, id });
    renderChatMessages();

    if (ended) {
      toast('This session has ended.');
    }
  } catch (err) {
    toast('Error: ' + err.message);
  } finally {
    chatBusy = false;
    showTypingIndicator(false);
  }
}

function showTypingIndicator(show) {
  let el = document.getElementById('typing-indicator');
  const wrap = document.getElementById('chat-messages');
  if (show) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'typing-indicator';
      el.className = 'typing-indicator';
      el.textContent = 'Noutheo is typing…';
      wrap.appendChild(el);
    }
    wrap.scrollTop = wrap.scrollHeight;
  } else if (el) {
    el.remove();
  }
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).then(() => toast('Copied.'));
}

function transcriptText() {
  return chatMessages
    .filter(m => !m.content.startsWith('(The user just gave'))
    .map(m => (m.role === 'user' ? 'You: ' : 'Noutheo: ') + m.content)
    .join('\n\n');
}

async function saveTranscriptToJournal() {
  if (chatMessages.length === 0) { toast('Nothing to save yet.'); return; }
  await DB.add('journal', {
    title: 'Session — ' + new Date().toLocaleDateString(),
    body: transcriptText(),
    verse: '',
    attribution: '',
    createdAt: Date.now()
  });
  toast('Saved to Journal.');
}

async function saveMessageToJournal(content) {
  await DB.add('journal', {
    title: 'From a session — ' + new Date().toLocaleDateString(),
    body: content,
    verse: '',
    attribution: '',
    createdAt: Date.now()
  });
  toast('Saved to Journal.');
}

async function saveMessageAsActionStep(content) {
  const title = content.length > 60 ? content.slice(0, 57) + '...' : content;
  await DB.add('actionItems', {
    title,
    notes: content,
    done: false,
    substeps: [],
    createdAt: Date.now()
  });
  toast('Added to Action Steps.');
}

function exportTranscript() {
  if (chatMessages.length === 0) { toast('Nothing to export yet.'); return; }
  const blob = new Blob([transcriptText()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `noutheo-session-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── JOURNAL ──────────────────────────────────────────────────────────────

let editingJournalId = null;

function bindJournal() {
  document.getElementById('je-save').addEventListener('click', async () => {
    const title = document.getElementById('je-title').value.trim() || 'Untitled Entry';
    const body = document.getElementById('je-body').value.trim();
    const verse = document.getElementById('je-verse').value.trim();
    const attribution = document.getElementById('je-attribution').value.trim();

    if (editingJournalId) {
      const existing = await DB.get('journal', editingJournalId);
      await DB.put('journal', { ...existing, title, body, verse, attribution });
    } else {
      await DB.add('journal', { title, body, verse, attribution, createdAt: Date.now() });
    }
    showScreen('journal');
    renderJournalList();
  });
}

function resetJournalEntryForm(entry) {
  editingJournalId = entry ? entry.id : null;
  document.getElementById('journal-entry-title').textContent = entry ? 'Edit Entry' : 'New Entry';
  document.getElementById('je-title').value = entry ? entry.title : '';
  document.getElementById('je-body').value = entry ? entry.body : '';
  document.getElementById('je-verse').value = entry ? entry.verse || '' : '';
  document.getElementById('je-attribution').value = entry ? entry.attribution || '' : '';
}

async function renderJournalList() {
  const rows = (await DB.getAll('journal')).sort((a, b) => b.createdAt - a.createdAt);
  const wrap = document.getElementById('journal-list');
  wrap.innerHTML = '';
  if (rows.length === 0) {
    wrap.innerHTML = '<div class="empty-state">No journal entries yet.</div>';
    return;
  }
  rows.forEach(r => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="item-title">${escapeHtml(r.title)}</div>
      <div class="item-meta">${new Date(r.createdAt).toLocaleString()}</div>
      <div class="item-body">${escapeHtml(truncate(r.body, 200))}</div>
      ${r.verse ? `<div class="item-meta" style="margin-top:6px;"><em>${escapeHtml(r.verse)}</em></div>` : ''}
      <div class="item-actions">
        <span data-act="edit">Edit</span>
        <span data-act="copy">Copy</span>
        <span data-act="delete">Delete</span>
      </div>`;
    item.querySelector('[data-act="edit"]').addEventListener('click', () => {
      resetJournalEntryForm(r);
      document.getElementById('journal-entry-title').textContent = 'Edit Entry';
      showScreen('journal-entry');
    });
    item.querySelector('[data-act="copy"]').addEventListener('click', () => copyToClipboard(r.body));
    item.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      if (!confirm('Delete this entry?')) return;
      await DB.delete('journal', r.id);
      renderJournalList();
    });
    wrap.appendChild(item);
  });
}

// ── ACTION ITEMS ─────────────────────────────────────────────────────────

let editingActionId = null;

function bindActionItems() {
  document.getElementById('btn-add-action').addEventListener('click', () => {
    editingActionId = null;
    document.getElementById('ai-dialog-title').textContent = 'New Action Step';
    document.getElementById('ai-title').value = '';
    document.getElementById('ai-notes').value = '';
    document.getElementById('dialog-action-item').showModal();
  });

  document.getElementById('ai-save').addEventListener('click', async () => {
    const title = document.getElementById('ai-title').value.trim();
    if (!title) { toast('Please enter a title.'); return; }
    const notes = document.getElementById('ai-notes').value.trim();

    if (editingActionId) {
      const existing = await DB.get('actionItems', editingActionId);
      await DB.put('actionItems', { ...existing, title, notes });
    } else {
      await DB.add('actionItems', { title, notes, done: false, substeps: [], createdAt: Date.now() });
    }
    document.getElementById('dialog-action-item').close();
    renderActionItems();
  });
}

async function renderActionItems() {
  const rows = (await DB.getAll('actionItems')).sort((a, b) => b.createdAt - a.createdAt);
  const wrap = document.getElementById('action-items-list');
  wrap.innerHTML = '';
  if (rows.length === 0) {
    wrap.innerHTML = '<div class="empty-state">No action steps yet. Tap + to add one.</div>';
    return;
  }
  rows.forEach(r => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const substepsHtml = (r.substeps || []).map((s, i) => `
      <div class="substep ${s.done ? 'done' : ''}" data-sub="${i}">
        <input type="checkbox" ${s.done ? 'checked' : ''}> <span>${escapeHtml(s.text)}</span>
        <span style="margin-left:auto;cursor:pointer;color:var(--error);" data-subdel="${i}">✕</span>
      </div>`).join('');

    item.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:8px;">
        <input type="checkbox" ${r.done ? 'checked' : ''} data-done style="margin-top:4px;">
        <div style="flex:1;">
          <div class="item-title" style="${r.done ? 'text-decoration:line-through;color:var(--text-hint);' : ''}">${escapeHtml(r.title)}</div>
          ${r.notes ? `<div class="item-body">${escapeHtml(r.notes)}</div>` : ''}
        </div>
      </div>
      <div class="substeps">${substepsHtml}</div>
      <div class="item-actions">
        <span data-act="addsub">+ Sub-step</span>
        <span data-act="edit">Edit</span>
        <span data-act="copy">Copy</span>
        <span data-act="delete">Delete</span>
      </div>`;

    item.querySelector('[data-done]').addEventListener('change', async (e) => {
      await DB.put('actionItems', { ...r, done: e.target.checked });
      renderActionItems();
    });

    item.querySelectorAll('[data-sub]').forEach(subEl => {
      const i = Number(subEl.getAttribute('data-sub'));
      subEl.querySelector('input').addEventListener('change', async (e) => {
        const substeps = [...r.substeps];
        substeps[i] = { ...substeps[i], done: e.target.checked };
        await DB.put('actionItems', { ...r, substeps });
        renderActionItems();
      });
    });
    item.querySelectorAll('[data-subdel]').forEach(delEl => {
      const i = Number(delEl.getAttribute('data-subdel'));
      delEl.addEventListener('click', async () => {
        const substeps = r.substeps.filter((_, idx) => idx !== i);
        await DB.put('actionItems', { ...r, substeps });
        renderActionItems();
      });
    });

    item.querySelector('[data-act="addsub"]').addEventListener('click', async () => {
      const text = prompt('Sub-step:');
      if (!text) return;
      const substeps = [...(r.substeps || []), { text, done: false }];
      await DB.put('actionItems', { ...r, substeps });
      renderActionItems();
    });

    item.querySelector('[data-act="edit"]').addEventListener('click', () => {
      editingActionId = r.id;
      document.getElementById('ai-dialog-title').textContent = 'Edit Action Step';
      document.getElementById('ai-title').value = r.title;
      document.getElementById('ai-notes').value = r.notes || '';
      document.getElementById('dialog-action-item').showModal();
    });

    item.querySelector('[data-act="copy"]').addEventListener('click', () => copyToClipboard(r.title + (r.notes ? '\n' + r.notes : '')));

    item.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      if (!confirm('Delete this action step?')) return;
      await DB.delete('actionItems', r.id);
      renderActionItems();
    });

    wrap.appendChild(item);
  });
}

// ── SESSION QUOTES ───────────────────────────────────────────────────────

async function renderSessionQuotes() {
  const rows = (await DB.getAll('sessionQuotes')).sort((a, b) => b.savedAt - a.savedAt);
  const wrap = document.getElementById('session-quotes-list');
  wrap.innerHTML = '';
  if (rows.length === 0) {
    wrap.innerHTML = '<div class="empty-state">No quotes yet.</div>';
    return;
  }
  rows.forEach(r => {
    const card = document.createElement('div');
    card.className = 'quote-card';
    card.innerHTML = `
      <div class="label">${escapeHtml(r.label)} &middot; ${new Date(r.savedAt).toLocaleDateString()}</div>
      <div class="text">“${escapeHtml(r.text)}”</div>
      <div class="attribution">${escapeHtml(r.attribution)}</div>
      <div class="item-actions" style="margin-top:8px;"><span data-act="share">Share / Copy</span></div>`;
    card.querySelector('[data-act="share"]').addEventListener('click', () => {
      const shareText = `"${r.text}" — ${r.attribution}`;
      if (navigator.share) {
        navigator.share({ text: shareText }).catch(() => copyToClipboard(shareText));
      } else {
        copyToClipboard(shareText);
      }
    });
    wrap.appendChild(card);
  });
}

// ── JOURNAL VAULT (PIN + WebCrypto AES-GCM) ─────────────────────────────────

async function openVault(onUnlock) {
  const meta = await DB.getSetting('vaultPin', null);
  if (!meta) {
    showPinDialog({
      title: 'Create a Vault PIN',
      message: 'Set a 4–6 digit PIN to protect your saved sessions. This PIN is not stored anywhere except encrypted on this device.',
      confirm: true,
      onSubmit: async (pin) => {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const verifier = await deriveAndWrapVerifier(pin, salt);
        await DB.setSetting('vaultPin', { saltB64: bufToB64(salt), verifier });
        appState.vaultKey = await deriveKey(pin, salt);
        renderVaultList();
        // Defer until after this dialog closes — two <dialog> modals open at
        // once breaks the second one on some browsers (e.g. Android Chrome).
        setTimeout(showVaultSecurityInfo, 0);
        if (onUnlock) await onUnlock();
      }
    });
  } else if (!appState.vaultKey) {
    showPinDialog({
      title: 'Enter Vault PIN',
      message: 'Your saved sessions are encrypted and stored only on this device.',
      confirm: false,
      onSubmit: async (pin) => {
        const salt = b64ToBuf(meta.saltB64);
        const verifier = await deriveAndWrapVerifier(pin, salt);
        if (verifier !== meta.verifier) {
          toast('Incorrect PIN.');
          return false;
        }
        appState.vaultKey = await deriveKey(pin, salt);
        renderVaultList();
        setTimeout(showVaultSecurityInfo, 0);
        if (onUnlock) await onUnlock();
        return true;
      }
    });
  } else {
    renderVaultList();
    if (onUnlock) await onUnlock();
  }
}

function showVaultSecurityInfo() {
  document.getElementById('vault-security-text').textContent = VAULT_SECURITY_TEXT;
  document.getElementById('dialog-vault-security').showModal();
}

function showPinDialog({ title, message, confirm, onSubmit }) {
  const dialog = document.getElementById('dialog-pin');
  document.getElementById('pin-title').textContent = title;
  document.getElementById('pin-message').textContent = message;
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-confirm-input').value = '';
  document.getElementById('pin-confirm-field').style.display = confirm ? 'block' : 'none';

  const submitBtn = document.getElementById('pin-submit');
  const handler = async () => {
    const pin = document.getElementById('pin-input').value.trim();
    if (!/^\d{4,6}$/.test(pin)) { toast('PIN must be 4–6 digits.'); return; }
    if (confirm) {
      const pin2 = document.getElementById('pin-confirm-input').value.trim();
      if (pin !== pin2) { toast('PINs do not match.'); return; }
    }
    const result = await onSubmit(pin);
    if (result !== false) dialog.close();
  };
  submitBtn.onclick = handler;
  dialog.showModal();
}

async function deriveKey(pin, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function deriveAndWrapVerifier(pin, salt) {
  // A deterministic-ish check value derived from the PIN+salt, stored to verify future PIN entries
  // without ever storing the PIN itself.
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    256
  );
  return bufToB64(new Uint8Array(bits));
}

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64) {
  return new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
}

async function encryptText(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, appState.vaultKey, enc.encode(text));
  return { ivB64: bufToB64(iv), dataB64: bufToB64(cipher) };
}

async function decryptText(payload) {
  const iv = b64ToBuf(payload.ivB64);
  const data = b64ToBuf(payload.dataB64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, appState.vaultKey, data);
  return new TextDecoder().decode(plain);
}

async function saveTranscriptToVault(title) {
  if (chatMessages.length === 0) { toast('Nothing to save yet.'); return; }
  const text = transcriptText();
  const doSave = async () => {
    const encrypted = await encryptText(text);
    await DB.add('vault', { title, encrypted, createdAt: Date.now() });
    toast('Saved to Journal Vault.');
  };
  if (!appState.vaultKey) {
    await openVault(doSave);
  } else {
    await doSave();
  }
}

async function renderVaultList() {
  document.getElementById('vault-entry-body').textContent = '';
  const rows = (await DB.getAll('vault')).sort((a, b) => b.createdAt - a.createdAt);
  const wrap = document.getElementById('vault-content');
  wrap.innerHTML = `
    <div class="card" style="font-size:13px;">Sessions saved here are encrypted with your PIN and stored only on this device — they cannot be opened without unlocking the Vault.</div>
    <div id="vault-list"></div>
    <div class="footer-note">Long Press / Use Delete To Remove an Entry &middot; Soli Deo Gloria</div>
  `;
  const list = document.getElementById('vault-list');
  if (rows.length === 0) {
    list.innerHTML = '<div class="empty-state">No saved sessions yet.</div>';
    return;
  }
  rows.forEach(r => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="item-title">${escapeHtml(r.title)}</div>
      <div class="item-meta">${new Date(r.createdAt).toLocaleString()}</div>
      <div class="item-actions">
        <span data-act="open">Open</span>
        <span data-act="delete">Delete</span>
      </div>`;
    item.querySelector('[data-act="open"]').addEventListener('click', async () => {
      const text = await decryptText(r.encrypted);
      document.getElementById('vault-entry-title').textContent = r.title;
      document.getElementById('vault-entry-body').textContent = text;
      currentVaultEntry = { title: r.title, text };
      showScreen('vault-entry');
    });
    item.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      if (!confirm('Delete this saved session permanently?')) return;
      await DB.delete('vault', r.id);
      renderVaultList();
    });
    wrap.querySelector('#vault-list').appendChild(item);
  });
}

let currentVaultEntry = null;

const VAULT_EXPORT_WARNING = "This will create a copy of this session outside the Journal Vault. That copy will no longer be encrypted or protected by your PIN — anyone with access to the saved or shared file will be able to read it. Continue?";

function bindVault() {
  // Lock the vault key when leaving the vault screens, for basic safety.
  document.querySelectorAll('[data-back="home"]').forEach(el => {
    el.addEventListener('click', () => { appState.vaultKey = null; });
  });

  document.getElementById('vault-entry-export').addEventListener('click', () => {
    if (!currentVaultEntry) return;
    if (!confirm(VAULT_EXPORT_WARNING)) return;
    exportVaultEntryAsDoc(currentVaultEntry.title, currentVaultEntry.text);
  });

  document.getElementById('vault-entry-share').addEventListener('click', async () => {
    if (!currentVaultEntry) return;
    if (!confirm(VAULT_EXPORT_WARNING)) return;
    await shareVaultEntry(currentVaultEntry.title, currentVaultEntry.text);
  });
}

function safeFileName(title) {
  return (title || 'Noutheo Session').replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 40) || 'Noutheo Session';
}

function buildVaultDocHtml(title, text) {
  const body = escapeHtml(text).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body><h1>${escapeHtml(title)}</h1><p>${body}</p></body></html>`;
}

function exportVaultEntryAsDoc(title, text) {
  const html = buildVaultDocHtml(title, text);
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName(title)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exported.');
}

async function shareVaultEntry(title, text) {
  const html = buildVaultDocHtml(title, text);
  const fileName = `${safeFileName(title)}.doc`;

  if (navigator.canShare && typeof File !== 'undefined') {
    try {
      const file = new File([html], fileName, { type: 'application/msword' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  toast('Sharing is not supported on this browser — try Export instead.');
}

// ── Helpers ──────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}
