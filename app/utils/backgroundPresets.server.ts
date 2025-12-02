// Workers-compatible background presets server module
// Note: sanitize-html library was removed as it causes global scope issues in Cloudflare Workers
import type {ServerEnv} from './env.server';
import {getEnvPublic} from './env.public';

export type MotionProfile = 'full' | 'subtle' | 'static';

type GraphQLFieldReference = {
  __typename: string;
  id?: string;
  url?: string;
  image?: {
    url: string;
    altText?: string | null;
  } | null;
};

type MetaobjectField = {
  key: string;
  value: string | null;
  references?: {
    nodes: GraphQLFieldReference[];
  };
};

type MetaobjectNode = {
  id: string;
  handle: string;
  type: string;
  updatedAt: string;
  fields: MetaobjectField[];
};

type MetaobjectEdgeList = {
  metaobjects: {
    edges: Array<{
      cursor: string;
      node: MetaobjectNode;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
  };
};

type MetaobjectPayload = {
  metaobject: MetaobjectNode | null;
};

type MetaobjectMutationPayload = {
  metaobjectCreate?: {
    metaobject: MetaobjectNode | null;
    userErrors: {message: string}[];
  };
  metaobjectUpdate?: {
    metaobject: MetaobjectNode | null;
    userErrors: {message: string}[];
  };
  metaobjectDelete?: {
    deletedId: string | null;
    userErrors: {message: string}[];
  };
};

export const DEFAULT_CALM_RADIUS = 320;
export const MIN_CALM_RADIUS = 120;
export const MAX_CALM_RADIUS = 960;
export const DEFAULT_CALM_INTENSITY = 0.55;
export const MIN_CALM_INTENSITY = 0;
export const MAX_CALM_INTENSITY = 1;

export type BackgroundPresetInput = {
  title: string;
  slug: string;
  htmlMarkup: string;
  cssStyles: string;
  jsSnippet?: string;
  motionProfile: MotionProfile;
  supportsReducedMotion: boolean;
  thumbnailUrl?: string;
  isActive?: boolean;
  calmRadius?: number;
  calmIntensity?: number;
};

export type BackgroundPresetRecord = {
  id: string;
  handle: string;
  title: string;
  slug: string;
  htmlMarkup: string;
  cssStyles: string;
  jsSnippet: string;
  motionProfile: MotionProfile;
  supportsReducedMotion: boolean;
  thumbnailUrl?: string;
  isActive: boolean;
  updatedAt: string;
  calmRadius: number;
  calmIntensity: number;
};

type BackgroundTelemetryState = 'ok' | 'fallback' | 'error';

type BackgroundTelemetry = {
  state: BackgroundTelemetryState;
  reason?: string;
  presetId?: string;
  timestamp: string;
};

type ActivePresetPayload = {
  id: string;
  handle: string;
  html: string;
  css: string;
  js: string;
  motionProfile: MotionProfile;
  supportsReducedMotion: boolean;
  versionHash: string;
  updatedAt: string;
  status: BackgroundTelemetry;
  calmRadius: number;
  calmIntensity: number;
};

type BackgroundPresetRuntime = {
  cache: Cache;
  fetch?: typeof fetch;
  env: ServerEnv;
  rawEnv?: Record<string, string | undefined>;
};

type ActivePresetCacheEntry = {
  expiresAt: number;
  payload: ActivePresetPayload;
};

type AdminGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{message: string}>;
};

const ACTIVE_CACHE_TTL_MS = 30_000;
const MAX_HTML_LENGTH = 50_000;
const MAX_CSS_LENGTH = 25_000;
const MAX_JS_LENGTH = 25_000;
const ADMIN_METAOBJECT_TYPE = 'background_preset';
const DEFAULT_REASON_INIT = 'not-initialized';
const CACHE_NAMESPACE = 'https://cache.watermelon-hydrogen/background-presets';
const GRAPHQL_API_VERSION = '2024-10';

// Workers-compatible HTML sanitizer configuration
// These are the allowed tags for background preset HTML
const ALLOWED_TAGS = new Set([
  'div', 'span', 'p', 'a', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
  'blockquote', 'pre', 'code',
  'img', 'figure', 'figcaption',
  'svg', 'path', 'g', 'defs', 'linearGradient', 'radialGradient',
  'stop', 'filter', 'feGaussianBlur', 'feOffset', 'feMerge', 'feMergeNode',
  'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'use',
]);

// Allowed attributes for sanitization
const ALLOWED_ATTRS = new Set([
  'style', 'class', 'id', 'href', 'src', 'alt', 'title', 'width', 'height',
  'viewBox', 'fill', 'stroke', 'stroke-width', 'filter', 'transform',
  'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'points', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits',
  'preserveAspectRatio', 'xmlns', 'role', 'aria-label', 'aria-hidden',
]);

// Allowed attribute prefixes (for data-* attributes)
const ALLOWED_ATTR_PREFIXES = ['data-', 'aria-'];

const QUERY_LIST = `
  query BackgroundPresetList($first: Int!, $after: String) {
    metaobjects(first: $first, after: $after, type: "${ADMIN_METAOBJECT_TYPE}") {
      edges {
        cursor
        node {
          id
          handle
          type
          updatedAt
          fields {
            key
            value
            references(first: 5) {
              nodes {
                __typename
                ... on MediaImage {
                  id
                  image {
                    url
                    altText
                  }
                }
                ... on GenericFile {
                  id
                  url
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const QUERY_BY_ID = `
  query BackgroundPresetById($id: ID!) {
    metaobject(id: $id) {
      id
      handle
      type
      updatedAt
      fields {
        key
        value
        references(first: 5) {
          nodes {
            __typename
            ... on MediaImage {
              id
              image {
                url
                altText
              }
            }
            ... on GenericFile {
              id
              url
            }
          }
        }
      }
    }
  }
`;

const MUTATION_CREATE = `
  mutation CreateBackgroundPreset($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        id
        handle
        updatedAt
      }
      userErrors {
        message
      }
    }
  }
`;

const MUTATION_UPDATE = `
  mutation UpdateBackgroundPreset($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        id
        handle
        updatedAt
      }
      userErrors {
        message
      }
    }
  }
`;

const MUTATION_DELETE = `
  mutation DeleteBackgroundPreset($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors {
        message
      }
    }
  }
`;

// Telemetry state - lazily initialized to avoid global scope Date() calls
let lastTelemetry: BackgroundTelemetry | null = null;

function getInitialTelemetry(): BackgroundTelemetry {
  return {
    state: 'fallback',
    reason: DEFAULT_REASON_INIT,
    timestamp: new Date().toISOString(),
  };
}

function getFallbackPreset(): ActivePresetPayload {
  const telemetry = lastTelemetry ?? getInitialTelemetry();
  return {
    id: 'background:fallback',
    handle: 'fallback',
    html: '',
    css: '',
    js: '',
    motionProfile: 'static',
    supportsReducedMotion: true,
    versionHash: 'fallback',
    updatedAt: new Date(0).toISOString(),
    status: telemetry,
    calmRadius: DEFAULT_CALM_RADIUS,
    calmIntensity: DEFAULT_CALM_INTENSITY,
  };
}

function updateTelemetry(state: BackgroundTelemetryState, reason?: string, presetId?: string) {
  lastTelemetry = {
    state,
    reason,
    presetId,
    timestamp: new Date().toISOString(),
  };
  return lastTelemetry;
}

export function getBackgroundTelemetry(): BackgroundTelemetry {
  return lastTelemetry ?? getInitialTelemetry();
}

function resolveStoreDomain(rawEnv?: Record<string, string | undefined>): string {
  if (rawEnv?.PUBLIC_STORE_DOMAIN) return rawEnv.PUBLIC_STORE_DOMAIN;
  return getEnvPublic(rawEnv).PUBLIC_STORE_DOMAIN;
}

function getAdminApiVersion(rawEnv?: Record<string, string | undefined>): string {
  if (rawEnv?.PUBLIC_STOREFRONT_API_VERSION) return rawEnv.PUBLIC_STOREFRONT_API_VERSION;
  return getEnvPublic(rawEnv).PUBLIC_STOREFRONT_API_VERSION ?? GRAPHQL_API_VERSION;
}

function buildCacheRequest(storeDomain: string): Request {
  return new Request(`${CACHE_NAMESPACE}/${storeDomain}/active`);
}

async function computeVersionHash(parts: string[]): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(parts.join('|'));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBoolean(value: string | null | undefined): boolean {
  return value === 'true' || value === '1';
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function parseNumericField(
  raw: string | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined || raw === null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return clampNumber(parsed, min, max);
}

function limitSize(value: string, limit: number, label: string) {
  if (value.length > limit) {
    throw new Error(`${label} exceeds limit of ${limit} characters`);
  }
}

// Workers-compatible HTML sanitizer using regex-based approach
// This avoids the global scope issues of sanitize-html library
function sanitizeMarkup(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // Helper to check if an attribute is allowed
  function isAttrAllowed(attr: string): boolean {
    const lowerAttr = attr.toLowerCase();
    if (ALLOWED_ATTRS.has(lowerAttr)) return true;
    for (const prefix of ALLOWED_ATTR_PREFIXES) {
      if (lowerAttr.startsWith(prefix)) return true;
    }
    return false;
  }

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags (we allow inline styles but not style blocks with potential JS)
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // Remove data: URLs except for safe image types
  sanitized = sanitized.replace(/data\s*:\s*(?!image\/(png|jpeg|jpg|gif|svg\+xml|webp))[^"'\s>]*/gi, '');

  // Process tags - keep only allowed tags
  sanitized = sanitized.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    const lowerTag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return ''; // Remove disallowed tags
    }

    // For closing tags, just return them
    if (match.startsWith('</')) {
      return `</${lowerTag}>`;
    }

    // For opening tags, filter attributes
    const attrMatch = match.match(/<[a-z][a-z0-9]*\s+([^>]*?)\/?>/i);
    if (!attrMatch || !attrMatch[1]) {
      const selfClose = match.endsWith('/>') ? ' /' : '';
      return `<${lowerTag}${selfClose}>`;
    }

    const attrString = attrMatch[1];
    const allowedAttrs: string[] = [];

    // Parse attributes (handles both quoted and unquoted)
    const attrRegex = /([a-z][a-z0-9\-:]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi;
    let attrExec;
    while ((attrExec = attrRegex.exec(attrString)) !== null) {
      const attrName = attrExec[1];
      const attrValue = attrExec[2] ?? attrExec[3] ?? attrExec[4] ?? '';

      if (isAttrAllowed(attrName)) {
        // Sanitize the value (remove potential XSS vectors)
        const safeValue = attrValue
          .replace(/javascript\s*:/gi, '')
          .replace(/expression\s*\(/gi, '')
          .replace(/url\s*\(\s*["']?\s*javascript/gi, 'url(');

        if (attrValue) {
          allowedAttrs.push(`${attrName}="${safeValue}"`);
        } else {
          allowedAttrs.push(attrName);
        }
      }
    }

    const selfClose = match.endsWith('/>') ? ' /' : '';
    const attrPart = allowedAttrs.length > 0 ? ' ' + allowedAttrs.join(' ') : '';
    return `<${lowerTag}${attrPart}${selfClose}>`;
  });

  return sanitized;
}

function extractFieldMap(node: MetaobjectNode): Record<string, MetaobjectField> {
  return node.fields.reduce<Record<string, MetaobjectField>>((acc, field) => {
    acc[field.key] = field;
    return acc;
  }, {});
}

function resolveThumbnailUrl(field?: MetaobjectField): string | undefined {
  const references = field?.references?.nodes ?? [];
  if (!references.length) return field?.value ?? undefined;
  for (const ref of references) {
    if (ref.__typename === 'MediaImage' && ref.image?.url) {
      return ref.image.url;
    }
    if (ref.__typename === 'GenericFile' && ref.url) {
      return ref.url;
    }
  }
  return field?.value ?? undefined;
}

function mapMetaobjectToRecord(node: MetaobjectNode): BackgroundPresetRecord {
  const fields = extractFieldMap(node);
  const title = fields.title?.value ?? node.handle;
  const slug = fields.slug?.value ?? node.handle;
  const htmlMarkup = fields.html_markup?.value ?? '';
  const cssStyles = fields.css_styles?.value ?? '';
  const jsSnippet = fields.js_snippet?.value ?? '';
  const motionProfile = (fields.motion_profile?.value as MotionProfile) ?? 'full';
  const supportsReducedMotion = toBoolean(fields.supports_reduced_motion?.value ?? 'true');
  const thumbnailUrl = resolveThumbnailUrl(fields.thumbnail);
  const isActive = toBoolean(fields.is_active?.value ?? 'false');
  const calmRadius = parseNumericField(
    fields.calm_radius?.value,
    DEFAULT_CALM_RADIUS,
    MIN_CALM_RADIUS,
    MAX_CALM_RADIUS,
  );
  const calmIntensity = parseNumericField(
    fields.calm_intensity?.value,
    DEFAULT_CALM_INTENSITY,
    MIN_CALM_INTENSITY,
    MAX_CALM_INTENSITY,
  );

  return {
    id: node.id,
    handle: node.handle,
    title,
    slug,
    htmlMarkup,
    cssStyles,
    jsSnippet,
    motionProfile,
    supportsReducedMotion,
    thumbnailUrl,
    isActive,
    updatedAt: node.updatedAt,
    calmRadius,
    calmIntensity,
  };
}

async function readActivePresetCache(runtime: BackgroundPresetRuntime, storeDomain: string): Promise<ActivePresetPayload | null> {
  const cacheRequest = buildCacheRequest(storeDomain);
  const cachedResponse = await runtime.cache.match(cacheRequest);
  if (!cachedResponse) return null;

  try {
    const text = await cachedResponse.text();
    if (!text) return null;
    const parsed = JSON.parse(text) as ActivePresetCacheEntry;
    if (!parsed || typeof parsed.expiresAt !== 'number') return null;
    if (parsed.expiresAt < Date.now()) {
      await runtime.cache.delete(cacheRequest);
      return null;
    }
    return parsed.payload;
  } catch (error) {
    console.warn('[backgroundPresets] Failed to parse cache entry', error);
    await runtime.cache.delete(cacheRequest);
    return null;
  }
}

async function writeActivePresetCache(runtime: BackgroundPresetRuntime, storeDomain: string, payload: ActivePresetPayload) {
  const cacheRequest = buildCacheRequest(storeDomain);
  const entry: ActivePresetCacheEntry = {
    expiresAt: Date.now() + ACTIVE_CACHE_TTL_MS,
    payload,
  };
  await runtime.cache.put(
    cacheRequest,
    new Response(JSON.stringify(entry), {
      headers: {
        'Cache-Control': `max-age=${ACTIVE_CACHE_TTL_MS / 1000}`,
        'Content-Type': 'application/json',
      },
    }),
  );
}

export async function bustActivePresetCache(runtime: BackgroundPresetRuntime) {
  const storeDomain = resolveStoreDomain(runtime.rawEnv);
  const cacheRequest = buildCacheRequest(storeDomain);
  await runtime.cache.delete(cacheRequest);
}

async function adminFetch<T>(runtime: BackgroundPresetRuntime, query: string, variables?: Record<string, unknown>): Promise<T> {
  const storeDomain = resolveStoreDomain(runtime.rawEnv);
  const apiVersion = getAdminApiVersion(runtime.rawEnv);
  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
  const fetchImpl = runtime.fetch ?? fetch;

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': runtime.env.PRIVATE_SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({query, variables}),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Admin GraphQL request failed (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as AdminGraphQLResponse<T>;
  if (payload.errors?.length) {
    const combined = payload.errors.map((err) => err.message).join('; ');
    throw new Error(`Admin GraphQL error: ${combined}`);
  }
  if (!payload.data) {
    throw new Error('Admin GraphQL returned no data');
  }
  return payload.data;
}

function sanitizeRecord(record: BackgroundPresetRecord): BackgroundPresetRecord {
  limitSize(record.htmlMarkup, MAX_HTML_LENGTH, 'HTML markup');
  limitSize(record.cssStyles, MAX_CSS_LENGTH, 'CSS styles');
  limitSize(record.jsSnippet, MAX_JS_LENGTH, 'JS snippet');
  const calmRadius = clampNumber(record.calmRadius, MIN_CALM_RADIUS, MAX_CALM_RADIUS);
  const calmIntensity = clampNumber(record.calmIntensity, MIN_CALM_INTENSITY, MAX_CALM_INTENSITY);

  return {
    ...record,
    htmlMarkup: sanitizeMarkup(record.htmlMarkup),
    calmRadius,
    calmIntensity,
  };
}

async function toActivePayload(record: BackgroundPresetRecord): Promise<ActivePresetPayload> {
  const sanitized = sanitizeRecord(record);
  const versionHash = await computeVersionHash([
    sanitized.id,
    sanitized.htmlMarkup,
    sanitized.cssStyles,
    sanitized.jsSnippet,
    sanitized.updatedAt,
    String(sanitized.calmRadius),
    String(sanitized.calmIntensity),
  ]);

  const status = updateTelemetry('ok', undefined, sanitized.id);
  return {
    id: sanitized.id,
    handle: sanitized.handle,
    html: sanitized.htmlMarkup,
    css: sanitized.cssStyles,
    js: sanitized.jsSnippet,
    motionProfile: sanitized.motionProfile,
    supportsReducedMotion: sanitized.supportsReducedMotion,
    versionHash,
    updatedAt: sanitized.updatedAt,
    status,
    calmRadius: sanitized.calmRadius,
    calmIntensity: sanitized.calmIntensity,
  };
}

export async function listBackgroundPresets(runtime: BackgroundPresetRuntime): Promise<BackgroundPresetRecord[]> {
  const results: BackgroundPresetRecord[] = [];
  let after: string | undefined;

  do {
    const data = await adminFetch<MetaobjectEdgeList>(runtime, QUERY_LIST, {first: 50, after});
    const edges = data.metaobjects.edges ?? [];
    for (const edge of edges) {
      results.push(mapMetaobjectToRecord(edge.node));
    }
    after = data.metaobjects.pageInfo.hasNextPage ? data.metaobjects.pageInfo.endCursor ?? undefined : undefined;
  } while (after);

  return results;
}

export async function getBackgroundPreset(runtime: BackgroundPresetRuntime, id: string): Promise<BackgroundPresetRecord | null> {
  const data = await adminFetch<MetaobjectPayload>(runtime, QUERY_BY_ID, {id});
  if (!data.metaobject) return null;
  return mapMetaobjectToRecord(data.metaobject);
}

export async function createBackgroundPreset(
  runtime: BackgroundPresetRuntime,
  input: BackgroundPresetInput,
): Promise<BackgroundPresetRecord> {
  const fields = buildMetaobjectFieldsFromInput(input);
  const data = await adminFetch<MetaobjectMutationPayload>(runtime, MUTATION_CREATE, {
    metaobject: {
      type: ADMIN_METAOBJECT_TYPE,
      fields,
    },
  });

  const payload = data.metaobjectCreate;
  if (!payload || payload.userErrors?.length) {
    const message = payload?.userErrors?.map((err) => err.message).join('; ') ?? 'Unknown error';
    throw new Error(`Failed to create background preset: ${message}`);
  }

  const createdId = payload.metaobject?.id;
  await bustActivePresetCache(runtime);

  if (!createdId) {
    throw new Error('Background preset created but missing identifier');
  }

  const record = await getBackgroundPreset(runtime, createdId);
  if (!record) {
    throw new Error('Failed to load created background preset');
  }

  return record;
}

export async function updateBackgroundPreset(
  runtime: BackgroundPresetRuntime,
  id: string,
  input: BackgroundPresetInput,
): Promise<BackgroundPresetRecord> {
  const fields = buildMetaobjectFieldsFromInput(input);
  const data = await adminFetch<MetaobjectMutationPayload>(runtime, MUTATION_UPDATE, {
    id,
    metaobject: {
      fields,
    },
  });

  const payload = data.metaobjectUpdate;
  if (!payload || payload.userErrors?.length) {
    const message = payload?.userErrors?.map((err) => err.message).join('; ') ?? 'Unknown error';
    throw new Error(`Failed to update background preset: ${message}`);
  }

  await bustActivePresetCache(runtime);

  const record = await getBackgroundPreset(runtime, id);
  if (!record) {
    throw new Error('Failed to load updated background preset');
  }

  return record;
}

export async function deleteBackgroundPreset(runtime: BackgroundPresetRuntime, id: string) {
  const data = await adminFetch<MetaobjectMutationPayload>(runtime, MUTATION_DELETE, {id});
  const payload = data.metaobjectDelete;
  if (!payload || payload.userErrors?.length) {
    const message = payload?.userErrors?.map((err) => err.message).join('; ') ?? 'Unknown error';
    throw new Error(`Failed to delete background preset: ${message}`);
  }
  await bustActivePresetCache(runtime);
}

export async function activateBackgroundPreset(runtime: BackgroundPresetRuntime, id: string) {
  const presets = await listBackgroundPresets(runtime);
  const mutations: Array<Promise<unknown>> = [];

  for (const preset of presets) {
    const shouldBeActive = preset.id === id;
    if (preset.isActive === shouldBeActive) continue;

    const fields = [
      {
        key: 'is_active',
        value: shouldBeActive ? 'true' : 'false',
      },
    ];

    mutations.push(
      adminFetch<MetaobjectMutationPayload>(runtime, MUTATION_UPDATE, {
        id: preset.id,
        metaobject: {fields},
      }),
    );
  }

  await Promise.all(mutations);
  await bustActivePresetCache(runtime);
}

export async function getActiveBackgroundPreset(
  runtime: BackgroundPresetRuntime,
  options: {refresh?: boolean} = {},
): Promise<ActivePresetPayload> {
  const storeDomain = resolveStoreDomain(runtime.rawEnv);
  if (!options.refresh) {
    const cached = await readActivePresetCache(runtime, storeDomain);
    if (cached) {
      lastTelemetry = cached.status;
      return cached;
    }
  }

  try {
    const presets = await listBackgroundPresets(runtime);
    const activeCandidates = presets.filter((preset) => preset.isActive);
    const active = activeCandidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    if (!active) {
      const status = updateTelemetry('fallback', 'no-active-preset');
      const payload: ActivePresetPayload = {
        ...getFallbackPreset(),
        status,
      };
      await writeActivePresetCache(runtime, storeDomain, payload);
      return payload;
    }

    const payload = await toActivePayload(active);
    await writeActivePresetCache(runtime, storeDomain, payload);
    return payload;
  } catch (error) {
    console.error('[backgroundPresets] Failed to resolve active preset', error);
    const status = updateTelemetry('error', error instanceof Error ? error.message : 'Unknown error');
    const payload: ActivePresetPayload = {
      ...getFallbackPreset(),
      status,
    };
    await writeActivePresetCache(runtime, storeDomain, payload);
    return payload;
  }
}

function buildMetaobjectFieldsFromInput(input: BackgroundPresetInput) {
  limitSize(input.htmlMarkup, MAX_HTML_LENGTH, 'HTML markup');
  limitSize(input.cssStyles, MAX_CSS_LENGTH, 'CSS styles');
  limitSize(input.jsSnippet ?? '', MAX_JS_LENGTH, 'JS snippet');

  const fields: Array<{key: string; value: string}> = [
    {key: 'title', value: input.title},
    {key: 'slug', value: input.slug},
    {key: 'html_markup', value: sanitizeMarkup(input.htmlMarkup)},
    {key: 'css_styles', value: input.cssStyles},
    {key: 'js_snippet', value: input.jsSnippet ?? ''},
    {key: 'motion_profile', value: input.motionProfile},
    {key: 'supports_reduced_motion', value: input.supportsReducedMotion ? 'true' : 'false'},
    {key: 'is_active', value: input.isActive ? 'true' : 'false'},
    {
      key: 'calm_radius',
      value: String(
        clampNumber(
          input.calmRadius ?? DEFAULT_CALM_RADIUS,
          MIN_CALM_RADIUS,
          MAX_CALM_RADIUS,
        ),
      ),
    },
    {
      key: 'calm_intensity',
      value: String(
        clampNumber(
          input.calmIntensity ?? DEFAULT_CALM_INTENSITY,
          MIN_CALM_INTENSITY,
          MAX_CALM_INTENSITY,
        ),
      ),
    },
  ];

  if (input.thumbnailUrl) {
    fields.push({key: 'thumbnail', value: input.thumbnailUrl});
  }

  return fields;
}

export type {BackgroundTelemetry, ActivePresetPayload, BackgroundPresetRuntime};
