import {json, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {getActiveBackgroundPreset, bustActivePresetCache} from '../utils/backgroundPresets.server';

/**
 * API Route: POST /api/background/refresh
 * Busts cache and returns fresh active background preset
 */
export async function action({context}: ActionFunctionArgs) {
  try {
    // Bust the cache first
    await bustActivePresetCache({
      cache: context.storefront.cache,
      env: context.env,
      rawEnv: context.env as Record<string, string | undefined>,
    });

    // Fetch fresh preset
    const preset = await getActiveBackgroundPreset(
      {
        cache: context.storefront.cache,
        env: context.env,
        rawEnv: context.env as Record<string, string | undefined>,
      },
      {refresh: true},
    );

    return json(preset, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[API /api/background/refresh] Failed to refresh preset:', error);
    
    return json(
      {
        error: 'Failed to refresh background preset',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
