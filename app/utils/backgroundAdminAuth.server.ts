import type {ServerEnv} from './env.server';

const TOKEN_NAMESPACE = 'watermelon-background-admin';
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

export type BackgroundAdminTokenPayload = {
  sub: string;
  iat: number;
  exp: number;
  nonce: string;
  namespace: string;
};

export type BackgroundAdminTokenResponse = {
  token: string;
  expiresAt: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSigningSecret(env: ServerEnv): Uint8Array {
  const secret = `${env.BACKGROUND_ADMIN_KEY}:${env.SESSION_SECRET}`;
  return encoder.encode(secret);
}

function toBase64Url(data: ArrayBuffer | Uint8Array): string {
  const buffer = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = globalThis.btoa(binary);
  return base64.replace(/=+$/u, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const binary = globalThis.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function importHmacKey(secret: Uint8Array) {
  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign', 'verify'],
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const length = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    const aByte = i < a.length ? a[i]! : 0;
    const bByte = i < b.length ? b[i]! : 0;
    result |= aByte ^ bByte;
  }
  return result === 0;
}

function createNonce(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function validateSharedAdminKey(env: ServerEnv, provided: string): boolean {
  const expected = env.BACKGROUND_ADMIN_KEY;
  const providedBytes = encoder.encode(provided);
  const expectedBytes = encoder.encode(expected);
  return timingSafeEqual(providedBytes, expectedBytes);
}

export async function issueBackgroundAdminToken(env: ServerEnv, subject = 'background-admin'): Promise<BackgroundAdminTokenResponse> {
  const secret = getSigningSecret(env);
  const key = await importHmacKey(secret);
  const issuedAt = Date.now();
  const expiresAt = issuedAt + TOKEN_TTL_MS;
  const payload: BackgroundAdminTokenPayload = {
    sub: subject,
    iat: issuedAt,
    exp: expiresAt,
    nonce: createNonce(),
    namespace: TOKEN_NAMESPACE,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadBytes = encoder.encode(payloadJson);
  const signature = await crypto.subtle.sign('HMAC', key, toArrayBuffer(payloadBytes));
  const token = `${toBase64Url(payloadBytes)}.${toBase64Url(signature)}`;

  return {
    token,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export async function verifyBackgroundAdminToken(env: ServerEnv, token: string): Promise<BackgroundAdminTokenPayload> {
  const [encodedPayload, encodedSignature] = token.split('.', 2);
  if (!encodedPayload || !encodedSignature) {
    throw new Error('Invalid admin token format');
  }

  const payloadBytes = fromBase64Url(encodedPayload);
  const signatureBytes = fromBase64Url(encodedSignature);

  const secret = getSigningSecret(env);
  const key = await importHmacKey(secret);

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    toArrayBuffer(signatureBytes),
    toArrayBuffer(payloadBytes),
  );
  if (!isValid) {
    throw new Error('Invalid admin token signature');
  }

  const payloadJson = decoder.decode(payloadBytes);
  const payload = JSON.parse(payloadJson) as BackgroundAdminTokenPayload;

  if (payload.namespace !== TOKEN_NAMESPACE) {
    throw new Error('Invalid admin token namespace');
  }

  const now = Date.now();
  if (payload.exp <= now) {
    throw new Error('Admin token expired');
  }

  return payload;
}

export {TOKEN_TTL_MS};

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/iu.exec(header);
  if (!match) return null;
  return match[1]!.trim();
}

export async function requireBackgroundAdminToken(
  env: ServerEnv,
  request: Request,
): Promise<BackgroundAdminTokenPayload> {
  const token = extractBearerToken(request);
  if (!token) {
    throw new Error('Missing bearer token');
  }
  return verifyBackgroundAdminToken(env, token);
}
