// Oxygen-safe server env accessor: no I/O, timers, or randomness at module scope.
type ServerEnv = {
  PRIVATE_STOREFRONT_API_TOKEN: string;
  SESSION_SECRET: string;
  SHOP_ID: string;
};

function requireEnv(name: keyof ServerEnv, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(`[env.server] Missing required env: ${String(name)}`);
  }
  return value;
}

let _cached: ServerEnv | null = null;

/**
 * Pure accessor. In Oxygen, pass the worker runtime env if needed.
 * Locally (scripts / dev), defaults to process.env. No logging; no side effects.
 */
export function getEnvServer(
  runtimeEnv: Record<string, string | undefined> = process.env,
): ServerEnv {
  if (_cached) return _cached;
  _cached = {
    PRIVATE_STOREFRONT_API_TOKEN: requireEnv(
      'PRIVATE_STOREFRONT_API_TOKEN',
      runtimeEnv.PRIVATE_STOREFRONT_API_TOKEN,
    ),
    SESSION_SECRET: requireEnv('SESSION_SECRET', runtimeEnv.SESSION_SECRET),
    SHOP_ID: requireEnv('SHOP_ID', runtimeEnv.SHOP_ID),
  };
  return _cached;
}

// Convenience singleton (safe: still pure evaluation)
export const envServer = getEnvServer();

export type {ServerEnv};
