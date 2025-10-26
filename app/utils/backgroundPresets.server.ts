import sanitizeHtml from 'sanitize-html';
import type {ServerEnv} from './env.server';
import {getEnvPublic} from './env.public';

type MotionProfile = 'full' | 'subtle' | 'static';

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

type BackgroundPresetInput = {
  title: string;
  slug: string;
  htmlMarkup: string;
  cssStyles: string;
  jsSnippet?: string;
  motionProfile: MotionProfile;
  supportsReducedMotion: boolean;
  thumbnailUrl?: string;
  isActive?: boolean;
};

type BackgroundPresetRecord = {
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

let lastTelemetry: BackgroundTelemetry = {
  state: 'fallback',
  reason: DEFAULT_REASON_INIT,
  timestamp: new Date().toISOString(),
};

const FALLBACK_PRESET: ActivePresetPayload = {
  id: 'background:fallback',
  handle: 'fallback',
  html: '',
  css: '',
  js: '',
  motionProfile: 'static',
  supportsReducedMotion: true,
  versionHash: 'fallback',
  updatedAt: new Date(0).toISOString(),
  status: lastTelemetry,
};

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
  return lastTelemetry;
}

function resolveStoreDomain(rawEnv?: Record<string, string | undefined>): string {
  return rawEnv?.PUBLIC_STORE_DOMAIN ?? getEnvPublic().PUBLIC_STORE_DOMAIN;
}

function getAdminApiVersion(rawEnv?: Record<string, string | undefined>): string {
  return rawEnv?.PUBLIC_STOREFRONT_API_VERSION ?? getEnvPublic().PUBLIC_STOREFRONT_API_VERSION ?? GRAPHQL_API_VERSION;
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

function limitSize(value: string, limit: number, label: string) {
  if (value.length > limit) {
    throw new Error(`${label} exceeds limit of ${limit} characters`);
  }
}

const baseAllowedAttributes = sanitizeHtml.defaults.allowedAttributes as Record<string, string[]>;

function sanitizeMarkup(html: string): string {
  return sanitizeHtml(html, {
    ...sanitizeHtml.defaults,
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'svg',
      'path',
      'g',
      'defs',
      'linearGradient',
      'stop',
      'filter',
      'feGaussianBlur',
      'feOffset',
      'feMerge',
      'feMergeNode',
    ],
    allowedAttributes: {
      ...baseAllowedAttributes,
      '*': [...(baseAllowedAttributes['*'] ?? []), 'style', 'class', 'data-*', 'id', 'viewBox', 'fill', 'stroke', 'stroke-width', 'filter'],
      svg: ['viewBox', 'width', 'height'],
      path: ['d', 'fill', 'stroke', 'stroke-width', 'filter'],
    },
  });
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
  for (const node of references) {
    if (node.__typename === 'MediaImage' && node.image?.url) {
      return node.image.url;
    }
    if (node.__typename === 'GenericFile' && node.url) {
      return node.url;
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

  return {
    ...record,
    htmlMarkup: sanitizeMarkup(record.htmlMarkup),
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

export async function createBackgroundPreset(runtime: BackgroundPresetRuntime, input: BackgroundPresetInput) {
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

  await bustActivePresetCache(runtime);
}

export async function updateBackgroundPreset(runtime: BackgroundPresetRuntime, id: string, input: BackgroundPresetInput) {
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
        ...FALLBACK_PRESET,
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
      ...FALLBACK_PRESET,
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
  ];

  if (input.thumbnailUrl) {
    fields.push({key: 'thumbnail', value: input.thumbnailUrl});
  }

  return fields;
}

export type {
  BackgroundPresetInput,
  BackgroundPresetRecord,
  BackgroundTelemetry,
  ActivePresetPayload,
  MotionProfile,
  BackgroundPresetRuntime,
};
