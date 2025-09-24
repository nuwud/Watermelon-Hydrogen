#!/usr/bin/env node
/**
 * Export GitHub Copilot Chat history for the current workspace to Markdown files in Downloads.
 *
 * Strategy:
 * - Find VS Code workspaceStorage dir for this workspace by reading .vscode/settings.json's storage hint (if any)
 *   or scanning %APPDATA%/Code/User/workspaceStorage for state.vscdb files that include our workspace path in storage.json.
 * - Open state.vscdb (SQLite) using sql.js (pure WASM/JS), and read ItemTable rows for keys:
 *     - 'interactive.sessions'
 *     - 'memento/interactive-session' (optional)
 * - For interactive.sessions: parse JSON array of sessions; each session contains messages, ids, and customTitle.
 * - Convert each session to a single Markdown file with a header and a transcript.
 * - Write files to C:\Users\<user>\Downloads with sanitized filenames.
 *
 * Notes:
 * - Requires dev dependency: sql.js
 * - Tested on Windows paths. Should be safe on other OSes with minor adjustments.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {fileURLToPath} from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = (...args) => console.warn('[🍉 Watermelon][CopilotExport]', ...args);

function sanitizeFilename(name, fallback = 'untitled') {
  if (!name || typeof name !== 'string') return fallback;
  const cleaned = name.replace(/[^\w\s._-]+/g, '').trim().replace(/\s+/g, '_');
  return cleaned.length ? cleaned : fallback;
}

function getDownloadsDir() {
  const home = os.homedir();
  // On Windows, Downloads is typically under the profile
  const downloads = path.join(home, 'Downloads');
  return downloads;
}

function getWorkspaceRoot() {
  // Assume this script is run from repo root via npm script
  return path.resolve(path.join(__dirname, '..', '..'));
}

// (reserved) readJsonSafe helper not needed currently

function findWorkspaceStorageCandidates() {
  // Windows stable VS Code path
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const codeUser = path.join(appData, 'Code', 'User');
  const storageRoot = path.join(codeUser, 'workspaceStorage');
  const candidates = [];
  try {
    const entries = fs.readdirSync(storageRoot, {withFileTypes: true});
    for (const e of entries) {
      if (e.isDirectory()) {
        const dir = path.join(storageRoot, e.name);
        const stateDb = path.join(dir, 'state.vscdb');
        if (fs.existsSync(stateDb)) candidates.push({dir, stateDb});
      }
    }
  } catch (e) {
    log('No workspaceStorage found at', storageRoot, e.message);
  }
  return candidates;
}

function looksLikeOurWorkspace(dir, workspaceRoot) {
  // Heuristic: many storage folders include storage.json with original workspace path
  const storageJson = path.join(dir, 'storage.json');
  const metaJson = path.join(dir, 'meta.json');
  const candidates = [storageJson, metaJson];
  for (const f of candidates) {
    if (fs.existsSync(f)) {
      const txt = fs.readFileSync(f, 'utf8');
      if (txt.includes(workspaceRoot)) return true;
      // Also check parent names
      const parts = workspaceRoot.split(path.sep).filter(Boolean);
      if (parts.length) {
        const last = parts[parts.length - 1];
        if (last && txt.includes(last)) return true;
      }
    }
  }
  return false;
}

async function loadDbBytes(file) {
  return fs.readFileSync(file);
}

function listInterestingKeys(db) {
  try {
    const res = db.exec("SELECT key FROM ItemTable;");
    const keys = new Set();
    for (const row of res?.[0]?.values || []) {
      const k = row?.[0];
      if (typeof k === 'string') keys.add(k);
    }
    return Array.from(keys).filter(k => /interactive|chat|copilot/i.test(k));
  } catch (e) {
    log('Failed to enumerate keys', e.message);
    return [];
  }
}

async function readInteractiveSessions(db) {
  // SELECT value FROM ItemTable WHERE key = 'interactive.sessions';
  try {
    const res = db.exec("SELECT value FROM ItemTable WHERE key = 'interactive.sessions';");
    if (!res || !res.length) return undefined;
    const value = res[0].values?.[0]?.[0];
    if (!value) return undefined;
    return JSON.parse(value);
  } catch (e) {
    log('Failed to read interactive.sessions', e.message);
    return undefined;
  }
}

async function readMementoInteractive(db) {
  try {
    const res = db.exec("SELECT value FROM ItemTable WHERE key = 'memento/interactive-session';");
    if (!res || !res.length) return undefined;
    const value = res[0].values?.[0]?.[0];
    if (!value) return undefined;
    return JSON.parse(value);
  } catch (e) {
    log('Failed to read memento/interactive-session', e.message);
    return undefined;
  }
}

function coerceSessionsFromUnknown(value) {
  // Try to coerce various shapes into an array of session-like objects
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    // Common shapes: { sessions: [...] } or { byId: {id: {...}} }
    if (Array.isArray(value.sessions)) return value.sessions;
    if (value.byId && typeof value.byId === 'object') return Object.values(value.byId);
    // Sometimes stored under nested keys
    for (const v of Object.values(value)) {
      if (Array.isArray(v) && v.length && (v[0]?.messages || v[0]?.requests)) return v;
      if (v && typeof v === 'object' && Array.isArray(v.sessions)) return v.sessions;
    }
    return [];
  }
  return [];
}

function sessionToMarkdown(session) {
  const title = session.customTitle || session.id || 'Untitled Session';
  const header = `# ${title}\n\n`;
  const meta = {
    id: session.id,
    createdAt: session.createdAt || session.timestamp,
    model: session.model || session.provider || undefined,
  };
  const metaBlock = '```json\n' + JSON.stringify(meta, null, 2) + '\n```\n\n';

  function getRole(msg) {
    const r = (msg.role || msg.kind || msg.author || msg.speaker || msg.sender || '').toString().toLowerCase();
    if (['user', 'human', 'you'].includes(r)) return 'user';
    if (['assistant', 'bot', 'copilot', 'ai', 'system'].includes(r)) return 'assistant';
    // Heuristics
    if (msg.prompt || msg.query || msg.input) return 'user';
    return 'assistant';
  }

  function flattenPart(p) {
    if (!p) return '';
    if (typeof p === 'string') return p;
    if (typeof p.text === 'string') return p.text;
    if (typeof p.value === 'string') return p.value;
    if (typeof p.content === 'string') return p.content;
    if (p.code) return `\n\n\`\`\`${p.language || ''}\n${p.code}\n\`\`\`\n`;
    if (Array.isArray(p.content)) return p.content.map(flattenPart).join('\n');
    // markdown-like
    if (p.kind && typeof p.value === 'string') return p.value;
    return '';
  }

  function extractText(msg) {
    // Common cases
    if (typeof msg === 'string') return msg;
    if (typeof msg.text === 'string') return msg.text;
    if (typeof msg.message === 'string') return msg.message;
    if (typeof msg.content === 'string') return msg.content;
    if (typeof msg.value === 'string') return msg.value;

    // Arrays of parts/segments
    if (Array.isArray(msg.content)) {
      const t = msg.content.map(flattenPart).filter(Boolean).join('\n');
      if (t.trim()) return t;
    }
    if (Array.isArray(msg.parts)) {
      const t = msg.parts.map(flattenPart).filter(Boolean).join('\n');
      if (t.trim()) return t;
    }

    // Nested structures
    const prompt = msg.prompt || msg.query || msg.input || msg.userText;
    if (prompt) {
      if (typeof prompt === 'string') return prompt;
      if (typeof prompt.text === 'string') return prompt.text;
      if (typeof prompt.value === 'string') return prompt.value;
      if (Array.isArray(prompt.parts)) return prompt.parts.map(flattenPart).join('\n');
    }
    const response = msg.response || msg.reply || msg.output || msg.assistantText || msg.message;
    if (response) {
      if (typeof response === 'string') return response;
      if (typeof response.text === 'string') return response.text;
      if (typeof response.value === 'string') return response.value;
      if (Array.isArray(response.parts)) return response.parts.map(flattenPart).join('\n');
      if (Array.isArray(response.content)) return response.content.map(flattenPart).join('\n');
    }

    // code blocks
    if (msg.code) return `\n\n\`\`\`${msg.language || ''}\n${msg.code}\n\`\`\`\n`;

    // fallback: empty
    return '';
  }

  // Gather messages from various shapes
  const lines = [];
  const pushMsg = (role, text, raw) => {
    if (text && text.toString().trim().length) {
      lines.push(`## ${role === 'user' ? 'User' : 'Assistant'}\n\n${text}\n`);
    } else if (raw) {
      // Fallback: include raw JSON when text not found
      lines.push(`## ${role === 'user' ? 'User' : 'Assistant'} (raw)\n\n\`\`\`json\n${JSON.stringify(raw, null, 2)}\n\`\`\`\n`);
    }
  };

  const msgs = [];
  if (Array.isArray(session.messages)) msgs.push(...session.messages);
  if (Array.isArray(session.requests)) {
    for (const req of session.requests) {
      if (req) msgs.push(req);
      // Some schemas nest responses
      if (Array.isArray(req?.responses)) msgs.push(...req.responses);
      if (req?.response) msgs.push(req.response);
    }
  }
  if (Array.isArray(session.turns)) {
    for (const t of session.turns) {
      if (t?.user) msgs.push({role: 'user', ...t.user});
      if (t?.assistant) msgs.push({role: 'assistant', ...t.assistant});
    }
  }

  // If nothing found, try flattening common containers
  if (!msgs.length && session.history && Array.isArray(session.history)) msgs.push(...session.history);
  if (!msgs.length && session.conversation && Array.isArray(session.conversation)) msgs.push(...session.conversation);

  for (const msg of msgs) {
    const role = getRole(msg);
    const text = extractText(msg);
    pushMsg(role, text, msg);
  }

  // As a last resort, dump the session if we still found nothing
  if (!lines.length) {
    lines.push('## Session (raw)\n\n```json\n' + JSON.stringify(session, null, 2) + '\n```\n');
  }

  return header + metaBlock + lines.join('\n');
}

async function main() {
  const workspaceRoot = getWorkspaceRoot();
  log('Workspace root:', workspaceRoot);

  const candidates = findWorkspaceStorageCandidates();
  if (!candidates.length) {
    log('No candidates found. Is VS Code chat used on this machine?');
  }

  // Filter to only those likely to match our workspace, but fall back to all
  const prioritized = candidates.filter(c => looksLikeOurWorkspace(c.dir, workspaceRoot));
  const toScan = prioritized.length ? prioritized : candidates;

  const SQL = await initSqlJs({});
  let allSessions = [];
  let anyMemento = undefined;
  const inspected = [];
  for (const cand of toScan) {
    try {
      const bytes = await loadDbBytes(cand.stateDb);
      const db = new SQL.Database(bytes);
      const keys = listInterestingKeys(db);
      inspected.push({dir: cand.dir, keys});
      const s = (await readInteractiveSessions(db)) || [];
      const m = await readMementoInteractive(db);
      if (m && !anyMemento) anyMemento = m;
      allSessions = allSessions.concat(s);
      // Also try to coerce sessions from other interesting keys
      for (const key of keys) {
        try {
          const res = db.exec(`SELECT value FROM ItemTable WHERE key = ${JSON.stringify(key)};`);
          const val = res?.[0]?.values?.[0]?.[0];
          if (!val || typeof val !== 'string') continue;
          const parsed = JSON.parse(val);
          const extra = coerceSessionsFromUnknown(parsed);
          if (extra?.length) allSessions = allSessions.concat(extra);
        } catch {
          // ignore per-key parse errors
        }
      }
    } catch (e) {
      log('Failed to read DB', cand.dir, e.message);
    }
  }

  // De-duplicate by id
  const seen = new Set();
  const sessions = allSessions.filter(s => {
    const id = s?.id || s?.sessionId || s?.$mid || s?.uri;
    const key = id || JSON.stringify(s).slice(0, 200);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!sessions.length && !anyMemento) {
    log('No interactive sessions found to export. Scanned DBs:', toScan.map(t=>t.dir).length);
    if (inspected.length) {
      log('Example keys:', inspected[0].keys?.slice(0, 10));
    }
  }

  const outDir = getDownloadsDir();
  const projectName = path.basename(workspaceRoot);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Write main JSON exports as backup
  const jsonOut1 = path.join(outDir, `${projectName}-copilot_sessions-${timestamp}.json`);
  const jsonOut2 = path.join(outDir, `${projectName}-copilot_memento-${timestamp}.json`);
  try { fs.writeFileSync(jsonOut1, JSON.stringify(sessions, null, 2), 'utf8'); } catch (e) { log('Warn: failed writing sessions JSON', e.message); }
  if (anyMemento) { try { fs.writeFileSync(jsonOut2, JSON.stringify(anyMemento, null, 2), 'utf8'); } catch (e) { log('Warn: failed writing memento JSON', e.message); } }

  // Create per-session Markdown
  let count = 0;
  for (const session of sessions) {
    const titleSafe = sanitizeFilename(session.customTitle || session.id || `session-${count+1}`);
    const md = sessionToMarkdown(session);
    const mdFile = path.join(outDir, `${projectName}__${titleSafe}__${timestamp}.md`);
    fs.writeFileSync(mdFile, md, 'utf8');
    count += 1;
  }

  log(`Export complete. Wrote ${count} markdown file(s) to`, outDir);
  if (sessions.length) {
    console.log(`OK ${count} sessions -> ${outDir}`);
  } else {
    console.log(`No sessions found to export. JSON backups may exist in ${outDir}.`);
  }
}

main().catch((err) => {
  console.error('Export failed:', err?.message || err);
  process.exitCode = 1;
});
