type ServerEnv = {
  PRIVATE_STOREFRONT_API_TOKEN: string;
  SESSION_SECRET: string;
  SHOP_ID: string;
};

function requireEnv(name: keyof ServerEnv, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`[env.server] Missing required env: ${String(name)}`);
  }
  return value;
}

let cachedEnv: ServerEnv | null = null;

export function getEnvServer(): ServerEnv {
  if (cachedEnv) return cachedEnv;
  cachedEnv = {
    PRIVATE_STOREFRONT_API_TOKEN: requireEnv(
      'PRIVATE_STOREFRONT_API_TOKEN',
      process.env.PRIVATE_STOREFRONT_API_TOKEN,
    ),
    SESSION_SECRET: requireEnv('SESSION_SECRET', process.env.SESSION_SECRET),
    SHOP_ID: requireEnv('SHOP_ID', process.env.SHOP_ID),
  };
  return cachedEnv;
}

export type {ServerEnv};
