import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {getActiveBackgroundPreset} from '../utils/backgroundPresets.server';

/**
 * API Route: GET /api/background/active
 * Returns the currently active background preset with metadata
 */
export async function loader({context}: LoaderFunctionArgs) {
  try {
    const preset = await getActiveBackgroundPreset({
      cache: context.storefront.cache,
      env: context.env,
      rawEnv: context.env as Record<string, string | undefined>,
    });

    return json(preset, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[API /api/background/active] Failed to fetch active preset:', error);
    
    // Return fallback preset on error
    return json(
      {
        id: 'background:fallback',
        handle: 'fallback',
        html: '',
        css: '',
        js: '',
        motionProfile: 'static',
        supportsReducedMotion: true,
        versionHash: 'fallback',
        updatedAt: new Date(0).toISOString(),
        status: {
          state: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
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
