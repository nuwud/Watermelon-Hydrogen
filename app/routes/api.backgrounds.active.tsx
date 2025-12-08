import {data, type LoaderFunctionArgs} from 'react-router';
import {getEnvServer} from '../utils/env.server';
import {
  DEFAULT_CALM_INTENSITY,
  DEFAULT_CALM_RADIUS,
  getActiveBackgroundPreset,
} from '../utils/backgroundPresets.server';

const ACTIVE_CACHE_SECONDS = 30;

export async function loader({context}: LoaderFunctionArgs) {
  try {
    const preset = await getActiveBackgroundPreset(
      {
        cache: context.storefront.cache,
        env: getEnvServer(context.env),
        rawEnv: context.env as Record<string, string | undefined>,
      },
      {refresh: false},
    );

    return data(preset, {
      headers: {
        'Cache-Control': `public, max-age=${ACTIVE_CACHE_SECONDS}, stale-while-revalidate=${ACTIVE_CACHE_SECONDS * 2}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[api.backgrounds.active] Failed to resolve active preset', error);
    return data(
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
        calmRadius: DEFAULT_CALM_RADIUS,
        calmIntensity: DEFAULT_CALM_INTENSITY,
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
