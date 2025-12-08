import {data, type ActionFunctionArgs, type LoaderFunctionArgs} from 'react-router';
import {getEnvServer} from '../utils/env.server';
import {requireBackgroundAdminToken} from '../utils/backgroundAdminAuth.server';
import {
  createBackgroundPreset,
  listBackgroundPresets,
} from '../utils/backgroundPresets.server';
import {parsePresetInput, serializePreset} from '../utils/backgroundPresetApi.server';

const METHOD_POST = 'POST';

async function authenticate(request: Request, context: LoaderFunctionArgs['context']) {
  const env = getEnvServer(context.env);
  try {
    await requireBackgroundAdminToken(env, request);
  } catch (error) {
    console.warn('[api.backgrounds._index] Admin token verification failed', error);
    throw json({error: 'Unauthorized'}, {status: 401, headers: {'Cache-Control': 'no-store'}});
  }
  return env;
}

export async function loader({request, context}: LoaderFunctionArgs) {
  const env = await authenticate(request, context);

  const presets = await listBackgroundPresets({
    cache: context.storefront.cache,
    env,
    rawEnv: context.env as Record<string, string | undefined>,
  });

  return data(presets.map(serializePreset), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
  });
}

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== METHOD_POST) {
    return data(
      {error: 'Method Not Allowed'},
      {status: 405, headers: {'Allow': METHOD_POST, 'Cache-Control': 'no-store'}},
    );
  }

  const env = await authenticate(request, context);

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch (error) {
    console.warn('[api.backgrounds._index] Failed to parse JSON body', error);
    return data(
      {error: 'Invalid JSON payload'},
      {status: 400, headers: {'Cache-Control': 'no-store'}},
    );
  }

  let presetInput;
  try {
    presetInput = parsePresetInput(parsedBody);
  } catch (error) {
    console.warn('[api.backgrounds._index] Invalid preset payload', error);
    return data(
      {error: error instanceof Error ? error.message : 'Invalid preset payload'},
      {status: 400, headers: {'Cache-Control': 'no-store'}},
    );
  }

  try {
    const record = await createBackgroundPreset(
      {
        cache: context.storefront.cache,
        env,
        rawEnv: context.env as Record<string, string | undefined>,
      },
      presetInput,
    );

    return data(serializePreset(record), {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[api.backgrounds._index] Failed to create preset', error);
    return data(
      {error: error instanceof Error ? error.message : 'Failed to create preset'},
      {status: 500, headers: {'Cache-Control': 'no-store'}},
    );
  }
}
