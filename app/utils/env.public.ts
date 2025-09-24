type PublicEnv = {
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
  PUBLIC_STORE_DOMAIN: string;
  PUBLIC_STOREFRONT_API_TOKEN: string;
  PUBLIC_STOREFRONT_ID: string;
  // Optional: PUBLIC_CHECKOUT_DOMAIN may be used by CSP setup
  PUBLIC_CHECKOUT_DOMAIN?: string;
};

function requirePublic(name: keyof PublicEnv, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`[env.public] Missing required env: ${String(name)}`);
  }
  return value;
}

export const envPublic: PublicEnv = {
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: requirePublic(
    'PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID',
    process.env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
  ),
  PUBLIC_CUSTOMER_ACCOUNT_API_URL: requirePublic(
    'PUBLIC_CUSTOMER_ACCOUNT_API_URL',
    process.env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
  ),
  PUBLIC_STORE_DOMAIN: requirePublic(
    'PUBLIC_STORE_DOMAIN',
    process.env.PUBLIC_STORE_DOMAIN,
  ),
  PUBLIC_STOREFRONT_API_TOKEN: requirePublic(
    'PUBLIC_STOREFRONT_API_TOKEN',
    process.env.PUBLIC_STOREFRONT_API_TOKEN,
  ),
  PUBLIC_STOREFRONT_ID: requirePublic(
    'PUBLIC_STOREFRONT_ID',
    process.env.PUBLIC_STOREFRONT_ID,
  ),
  PUBLIC_CHECKOUT_DOMAIN: process.env.PUBLIC_CHECKOUT_DOMAIN,
};

export type {PublicEnv};
