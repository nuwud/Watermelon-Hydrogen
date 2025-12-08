import {data, type ActionFunctionArgs, type LoaderFunctionArgs} from 'react-router';
import {getEnvServer} from '../utils/env.server';
import {requireBackgroundAdminToken} from '../utils/backgroundAdminAuth.server';
import {
  deleteBackgroundPreset,
  getBackgroundPreset,
  updateBackgroundPreset,
} from '../utils/backgroundPresets.server';
import {parsePresetInput, serializePreset} from '../utils/backgroundPresetApi.server';

const METHOD_PATCH = 'PATCH';
const METHOD_DELETE = 'DELETE';

function getPresetId(params: LoaderFunctionArgs['params']): string {
  const {id} = params;
  if (!id) {
    throw json({error: 'Missing preset id'}, {status: 400, headers: {'Cache-Control': 'no-store'}});
  }
  return id;
}

async function authenticate(request: Request, context: LoaderFunctionArgs['context']) {
  const env = getEnvServer(context.env);
  try {
    await requireBackgroundAdminToken(env, request);
  } catch (error) {
    console.warn('[api.backgrounds.$id] Admin token verification failed', error);
    throw json({error: 'Unauthorized'}, {status: 401, headers: {'Cache-Control': 'no-store'}});
  }
  return env;
}

export async function loader({request, context, params}: LoaderFunctionArgs) {
  const env = await authenticate(request, context);
  const id = getPresetId(params);

  const record = await getBackgroundPreset(
    {
      cache: context.storefront.cache,
      env,
      rawEnv: context.env as Record<string, string | undefined>,
    },
    id,
  );

  if (!record) {
    return data(
      {error: 'Preset not found'},
      {status: 404, headers: {'Cache-Control': 'no-store'}},
    );
  }

  return data(serializePreset(record), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
  });
}

export async function action({request, context, params}: ActionFunctionArgs) {
  const method = request.method.toUpperCase();
  if (method !== METHOD_PATCH && method !== METHOD_DELETE) {
    return data(
      {error: 'Method Not Allowed'},
      {
        status: 405,
        headers: {
          'Allow': `${METHOD_PATCH}, ${METHOD_DELETE}`,
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  const env = await authenticate(request, context);
  const id = getPresetId(params);

  if (method === METHOD_DELETE) {
    try {
      await deleteBackgroundPreset(
        {
          cache: context.storefront.cache,
          env,
          rawEnv: context.env as Record<string, string | undefined>,
        },
        id,
      );
      return new Response(null, {status: 204, headers: {'Cache-Control': 'no-store'}});
    } catch (error) {
      console.error('[api.backgrounds.$id] Failed to delete preset', error);
      return data(
        {error: error instanceof Error ? error.message : 'Failed to delete preset'},
        {status: 500, headers: {'Cache-Control': 'no-store'}},
      );
    }
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch (error) {
    console.warn('[api.backgrounds.$id] Failed to parse JSON body', error);
    return data(
      {error: 'Invalid JSON payload'},
      {status: 400, headers: {'Cache-Control': 'no-store'}},
    );
  }

  let presetInput;
  try {
    presetInput = parsePresetInput(parsedBody);
  } catch (error) {
    console.warn('[api.backgrounds.$id] Invalid preset payload', error);
    return data(
      {error: error instanceof Error ? error.message : 'Invalid preset payload'},
      {status: 400, headers: {'Cache-Control': 'no-store'}},
    );
  }

  try {
    const record = await updateBackgroundPreset(
      {
        cache: context.storefront.cache,
        env,
        rawEnv: context.env as Record<string, string | undefined>,
      },
      id,
      presetInput,
    );

    return data(serializePreset(record), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[api.backgrounds.$id] Failed to update preset', error);
    return data(
      {error: error instanceof Error ? error.message : 'Failed to update preset'},
      {status: 500, headers: {'Cache-Control': 'no-store'}},
    );
  }
}
