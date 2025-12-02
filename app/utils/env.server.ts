export type ServerEnv = {
  PRIVATE_STOREFRONT_API_TOKEN: string;
  SESSION_SECRET: string;
  SHOP_ID: string;
  // Optional: Admin API for background presets feature
  PRIVATE_SHOPIFY_ADMIN_TOKEN?: string;
  BACKGROUND_ADMIN_KEY?: string;
};

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`[env.server] Missing required env: ${name}`);
  }
  return value;
}

function optionalEnv(value: string | undefined): string | undefined {
  if (!value || value.trim() === '') return undefined;
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
  const resolveValue = (key: string): string | undefined => {
    const direct = runtimeEnv[key];
    if (direct && direct.trim() !== '') return direct;
    return runtimeEnv.cachedEnv?.[key];
  };

  return {
    PRIVATE_STOREFRONT_API_TOKEN: requireEnv(
      'PRIVATE_STOREFRONT_API_TOKEN',
      resolveValue('PRIVATE_STOREFRONT_API_TOKEN'),
    ),
    SESSION_SECRET: requireEnv('SESSION_SECRET', resolveValue('SESSION_SECRET')),
    SHOP_ID: requireEnv('SHOP_ID', resolveValue('SHOP_ID')),
    // Optional admin keys - background presets feature will be disabled without them
    PRIVATE_SHOPIFY_ADMIN_TOKEN: optionalEnv(resolveValue('PRIVATE_SHOPIFY_ADMIN_TOKEN')),
    BACKGROUND_ADMIN_KEY: optionalEnv(resolveValue('BACKGROUND_ADMIN_KEY')),
  };
}
