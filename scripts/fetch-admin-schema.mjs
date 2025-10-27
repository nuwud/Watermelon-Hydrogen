#!/usr/bin/env node
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildClientSchema,
  getIntrospectionQuery,
  lexicographicSortSchema,
  printSchema,
} from 'graphql';

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
};

const adminToken = requireEnv('PRIVATE_SHOPIFY_ADMIN_TOKEN');
const rawDomain = requireEnv('PUBLIC_STORE_DOMAIN');
const apiVersion = (process.env.PRIVATE_SHOPIFY_ADMIN_API_VERSION || process.env.PUBLIC_STOREFRONT_API_VERSION || '2024-10').trim();

const storeDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;

const query = getIntrospectionQuery({descriptions: true, schemaDescription: true});

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': adminToken,
    'User-Agent': 'watermelon-hydrogen-fetch-admin-schema/1.0',
  },
  body: JSON.stringify({query}),
});

if (!response.ok) {
  const text = await response.text();
  throw new Error(`Admin schema request failed (${response.status}): ${text}`);
}

const payload = await response.json();
if (payload.errors) {
  throw new Error(`Admin schema introspection error: ${JSON.stringify(payload.errors)}`);
}

if (!payload.data) {
  throw new Error('Admin schema introspection returned no data');
}

const clientSchema = buildClientSchema(payload.data);
const sortedSchema = lexicographicSortSchema(clientSchema);
const sdl = printSchema(sortedSchema);

const scriptDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const projectRoot = resolve(scriptDir, '..');
const schemaPath = resolve(projectRoot, 'app', 'graphql', 'admin.schema.graphql');

await writeFile(schemaPath, `${sdl}\n`, 'utf8');

console.log(`Admin schema written to ${schemaPath}`);
