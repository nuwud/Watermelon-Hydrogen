#!/usr/bin/env node

// Environment validation script
// Modes:
// - PR CI (WM_CI_CONTEXT=pr): validate PUBLIC_* only (no secrets required)
// - Default / main: validate full server + public set
// Local dev: allows .env.development fallback for convenience

const CI_CONTEXT = process.env.WM_CI_CONTEXT; // 'pr' | undefined

const publicRequired = [
  'PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID',
  'PUBLIC_CUSTOMER_ACCOUNT_API_URL',
  'PUBLIC_STORE_DOMAIN',
  'PUBLIC_STOREFRONT_API_TOKEN',
  'PUBLIC_STOREFRONT_ID',
  'PUBLIC_STOREFRONT_API_VERSION',
];

const serverRequired = [
  'PRIVATE_STOREFRONT_API_TOKEN',
  'SESSION_SECRET',
  'SHOP_ID',
];

function assert(name) {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env: ${name}`);
  }
}
const required = CI_CONTEXT === 'pr' ? publicRequired : [...serverRequired, ...publicRequired];

try {
  for (const name of required) assert(name);
} catch (e) {
  // Fallback: try loading .env.development if available and SESSION_SECRET is missing
  if (process.env.NODE_ENV !== 'production') {
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const devEnvPath = path.resolve(process.cwd(), '.env.development');
      if (fs.existsSync(devEnvPath)) {
        // Naive parser: KEY=VALUE per line, ignores quotes/escapes; good enough for dev
        const raw = fs.readFileSync(devEnvPath, 'utf8');
        for (const line of raw.split(/\r?\n/)) {
          if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
          const idx = line.indexOf('=');
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim();
          if (!(key in process.env)) process.env[key] = val;
        }
        // Re-assert after fallback load
        for (const name of required) assert(name);
      } else {
        throw e;
      }
    } catch {
      throw e; // Surface original error if fallback failed
    }
  } else {
    throw e;
  }
}

console.log(`env:check OK (mode=${CI_CONTEXT === 'pr' ? 'public-only' : 'full'})`);