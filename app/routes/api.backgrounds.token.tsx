import {data, type ActionFunctionArgs} from 'react-router';
import {getEnvServer} from '../utils/env.server';
import {
  issueBackgroundAdminToken,
  validateSharedAdminKey,
  TOKEN_TTL_MS,
} from '../utils/backgroundAdminAuth.server';

const HEADER_ADMIN_KEY = 'x-background-admin-key';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data(
      {error: 'Method Not Allowed'},
      {status: 405, headers: {'Allow': 'POST', 'Cache-Control': 'no-store'}},
    );
  }

  const env = getEnvServer(context.env);
  const headerKey = request.headers.get(HEADER_ADMIN_KEY) ?? undefined;
  let providedKey = headerKey;

  if (!providedKey) {
    try {
      const body = (await request.json()) as Partial<{key: string}> | null;
      const candidate = body?.key;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        providedKey = candidate;
      }
    } catch (error) {
      // Ignore JSON parse errors; will treat as missing key.
      console.warn('[api.backgrounds.token] Failed to parse JSON body', error);
    }
  }

  if (!providedKey || !validateSharedAdminKey(env, providedKey)) {
    return data(
      {error: 'Invalid admin key'},
      {status: 401, headers: {'Cache-Control': 'no-store'}},
    );
  }

  const tokenResponse = await issueBackgroundAdminToken(env);

  return data(
    {
      token: tokenResponse.token,
      expiresAt: tokenResponse.expiresAt,
      expiresIn: TOKEN_TTL_MS / 1000,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    },
  );
}
