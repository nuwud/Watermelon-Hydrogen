#!/usr/bin/env node

// Load .env.* if present in local dev (optional). Avoid dotenv to keep deps minimal.
// Node 20+ supports --env-file, but we keep script light and rely on process env.

function assert(name) {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env: ${name}`);
  }
}
const required = [
  'PRIVATE_STOREFRONT_API_TOKEN',
  'SESSION_SECRET',
  'SHOP_ID',
  'PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID',
  'PUBLIC_CUSTOMER_ACCOUNT_API_URL',
  'PUBLIC_STORE_DOMAIN',
  'PUBLIC_STOREFRONT_API_TOKEN',
  'PUBLIC_STOREFRONT_ID',
];

for (const name of required) assert(name);

console.log('env:check OK');