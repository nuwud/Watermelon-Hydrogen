// Server-only environment contract. These values must never be sent to the client.
type ServerEnv = {
  PRIVATE_STOREFRONT_API_TOKEN: string;
  SESSION_SECRET: string;
  SHOP_ID: string;
};

function requireEnv(name: keyof ServerEnv, value: string | undefined): string {
  if (!value || value.trim() === '') {
    // Diagnostic: surface available keys once to aid debugging missing variable in dev
    if (process.env && !('__WM_ENV_DIAG_LOGGED' in process.env)) {
      try {
        (process.env as any).__WM_ENV_DIAG_LOGGED = '1';
        console.error('[env.server] Available process.env keys (subset):', Object.keys(process.env).filter(k => k === 'PRIVATE_STOREFRONT_API_TOKEN' || k === 'SESSION_SECRET' || k === 'SHOP_ID'));
      } catch (_err) {
        // Swallow logging errors safely
      }
    }
    throw new Error(`[env.server] Missing required env: ${String(name)}`);
  }
  return value;
}

let cachedEnv: ServerEnv | null = null;

/**
 * Get server env values. In the MiniOxygen dev runtime / Oxygen worker, server-only
 * variables are provided on the worker `env` object passed to the `fetch` handler.
 * We still fall back to process.env for scripts (env:check, build time) where
 * process.env is populated via dotenv.
 *
 * Accepting an optional `runtimeEnv` lets us resolve the reported 500 error:
 *   [env.server] Missing required env: PRIVATE_STOREFRONT_API_TOKEN
 * when `process.env.PRIVATE_STOREFRONT_API_TOKEN` is not injected but the value exists
 * on the worker environment.
 */
export function getEnvServer(runtimeEnv?: Partial<Record<keyof ServerEnv, string>>): ServerEnv {
  if (cachedEnv) return cachedEnv;
  const source = runtimeEnv || (process as any).env || {};
  cachedEnv = {
    PRIVATE_STOREFRONT_API_TOKEN: requireEnv(
      'PRIVATE_STOREFRONT_API_TOKEN',
      source.PRIVATE_STOREFRONT_API_TOKEN || process.env.PRIVATE_STOREFRONT_API_TOKEN,
    ),
    SESSION_SECRET: requireEnv(
      'SESSION_SECRET',
      source.SESSION_SECRET || process.env.SESSION_SECRET,
    ),
    SHOP_ID: requireEnv('SHOP_ID', source.SHOP_ID || process.env.SHOP_ID),
  };
  return cachedEnv;
}

export type {ServerEnv};
