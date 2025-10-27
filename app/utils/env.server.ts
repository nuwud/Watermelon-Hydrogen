export type ServerEnv = {
  PRIVATE_STOREFRONT_API_TOKEN: string;
  SESSION_SECRET: string;
  SHOP_ID: string;
  PRIVATE_SHOPIFY_ADMIN_TOKEN: string;
  BACKGROUND_ADMIN_KEY: string;
};

function requireEnv(name: keyof ServerEnv, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`[env.server] Missing required env: ${String(name)}`);
  }
  return value;
}

/**
 * Resolve server-only environment variables at request time.
 * Must be invoked from within the active request or loader context.
 */
export function getEnvServer(
  runtimeEnv: Record<string, string | undefined> & {
    cachedEnv?: Record<string, string | undefined>;
  },
): ServerEnv {
  const resolveValue = (key: keyof ServerEnv): string | undefined => {
    const direct = runtimeEnv[key as string];
    if (direct && direct.trim() !== '') return direct;
    return runtimeEnv.cachedEnv?.[key as string];
  };

  return {
    PRIVATE_STOREFRONT_API_TOKEN: requireEnv(
      'PRIVATE_STOREFRONT_API_TOKEN',
      resolveValue('PRIVATE_STOREFRONT_API_TOKEN'),
    ),
    SESSION_SECRET: requireEnv('SESSION_SECRET', resolveValue('SESSION_SECRET')),
    SHOP_ID: requireEnv('SHOP_ID', resolveValue('SHOP_ID')),
    PRIVATE_SHOPIFY_ADMIN_TOKEN: requireEnv(
      'PRIVATE_SHOPIFY_ADMIN_TOKEN',
      resolveValue('PRIVATE_SHOPIFY_ADMIN_TOKEN'),
    ),
    BACKGROUND_ADMIN_KEY: requireEnv(
      'BACKGROUND_ADMIN_KEY',
      resolveValue('BACKGROUND_ADMIN_KEY'),
    ),
  };
}
