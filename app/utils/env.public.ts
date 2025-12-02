type PublicEnv = {
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
  PUBLIC_STORE_DOMAIN: string;
  PUBLIC_STOREFRONT_API_TOKEN: string;
  PUBLIC_STOREFRONT_ID: string;
  PUBLIC_STOREFRONT_API_VERSION: string;
  // Optional: PUBLIC_CHECKOUT_DOMAIN may be used by CSP setup
  PUBLIC_CHECKOUT_DOMAIN?: string;
  // Optional: Canonical host for redirects (e.g., www.nuwudorder.com)
  PUBLIC_CANONICAL_HOST?: string;
  // Convenience flags (not secrets)
  NODE_ENV?: string;
  IS_DEV?: boolean;
};

function requirePublic(name: keyof PublicEnv, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`[env.public] Missing required env: ${String(name)}`);
  }
  return value;
}

let cachedEnv: PublicEnv | null = null;

/**
 * Get public environment variables.
 * In Cloudflare Workers (Oxygen), env vars are passed via the runtime env object.
 * @param runtimeEnv - The runtime environment object from the request context
 */
export function getEnvPublic(
  runtimeEnv?: Record<string, string | undefined>,
): PublicEnv {
  if (cachedEnv) return cachedEnv;

  // Helper to resolve value from runtime env (Workers) or process.env (Node)
  const resolve = (key: string): string | undefined => {
    // First try runtime env (Cloudflare Workers / Oxygen)
    if (runtimeEnv?.[key] && runtimeEnv[key]!.trim() !== '') {
      return runtimeEnv[key];
    }
    // Fallback to process.env (Node.js / local dev)
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
    return undefined;
  };

  cachedEnv = {
    PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: requirePublic(
      'PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID',
      resolve('PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID'),
    ),
    PUBLIC_CUSTOMER_ACCOUNT_API_URL: requirePublic(
      'PUBLIC_CUSTOMER_ACCOUNT_API_URL',
      resolve('PUBLIC_CUSTOMER_ACCOUNT_API_URL'),
    ),
    PUBLIC_STORE_DOMAIN: requirePublic(
      'PUBLIC_STORE_DOMAIN',
      resolve('PUBLIC_STORE_DOMAIN'),
    ),
    PUBLIC_STOREFRONT_API_TOKEN: requirePublic(
      'PUBLIC_STOREFRONT_API_TOKEN',
      resolve('PUBLIC_STOREFRONT_API_TOKEN'),
    ),
    PUBLIC_STOREFRONT_ID: requirePublic(
      'PUBLIC_STOREFRONT_ID',
      resolve('PUBLIC_STOREFRONT_ID'),
    ),
    PUBLIC_STOREFRONT_API_VERSION: requirePublic(
      'PUBLIC_STOREFRONT_API_VERSION',
      resolve('PUBLIC_STOREFRONT_API_VERSION'),
    ),
    PUBLIC_CHECKOUT_DOMAIN: resolve('PUBLIC_CHECKOUT_DOMAIN'),
    PUBLIC_CANONICAL_HOST: resolve('PUBLIC_CANONICAL_HOST'),
    NODE_ENV: resolve('NODE_ENV'),
    IS_DEV: resolve('NODE_ENV') !== 'production',
  };
  return cachedEnv;
}

export type {PublicEnv};
