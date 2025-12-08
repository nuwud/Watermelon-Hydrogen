import {data, type ActionFunctionArgs} from 'react-router';
import {getEnvServer} from '../utils/env.server';
import {requireBackgroundAdminToken} from '../utils/backgroundAdminAuth.server';
import {
  activateBackgroundPreset,
  getBackgroundPreset,
} from '../utils/backgroundPresets.server';
import {serializePreset} from '../utils/backgroundPresetApi.server';

const METHOD_POST = 'POST';

function getPresetId(params: ActionFunctionArgs['params']): string {
  const {id} = params;
  if (!id) {
    throw json({error: 'Missing preset id'}, {status: 400, headers: {'Cache-Control': 'no-store'}});
  }
  return id;
}

async function authenticate(request: Request, context: ActionFunctionArgs['context']) {
  const env = getEnvServer(context.env);
  try {
    await requireBackgroundAdminToken(env, request);
  } catch (error) {
    console.warn('[api.backgrounds.$id.activate] Admin token verification failed', error);
    throw json({error: 'Unauthorized'}, {status: 401, headers: {'Cache-Control': 'no-store'}});
  }
  return env;
}

export async function action({request, context, params}: ActionFunctionArgs) {
  if (request.method.toUpperCase() !== METHOD_POST) {
    return data(
      {error: 'Method Not Allowed'},
      {status: 405, headers: {'Allow': METHOD_POST, 'Cache-Control': 'no-store'}},
    );
  }

  const env = await authenticate(request, context);
  const id = getPresetId(params);
  const runtime = {
    cache: context.storefront.cache,
    env,
    rawEnv: context.env as Record<string, string | undefined>,
  };

  try {
    await activateBackgroundPreset(runtime, id);
    const record = await getBackgroundPreset(runtime, id);

    if (!record) {
      return data(
        {error: 'Preset not found after activation'},
        {status: 404, headers: {'Cache-Control': 'no-store'}},
      );
    }

    return data(serializePreset(record), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[api.backgrounds.$id.activate] Failed to activate preset', error);
    return data(
      {error: error instanceof Error ? error.message : 'Failed to activate preset'},
      {status: 500, headers: {'Cache-Control': 'no-store'}},
    );
  }
}
