import {json, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {getBackgroundTelemetry} from '../utils/backgroundPresets.server';

type TelemetryPayload = {
  event: 'load' | 'error' | 'timeout';
  presetId: string;
  versionHash?: string;
  details?: string;
  userAgent?: string;
  timestamp: number;
};

/**
 * API Route: POST /api/background/telemetry
 * Receives and logs client-side telemetry events
 */
export async function action({request}: ActionFunctionArgs) {
  try {
    const payload = (await request.json()) as TelemetryPayload;

    // Validate payload
    if (!payload.event || !payload.presetId) {
      return json(
        {error: 'Invalid telemetry payload'},
        {
          status: 400,
          headers: {'Content-Type': 'application/json'},
        },
      );
    }

    // Log telemetry (in production, send to analytics service)
    console.log('[Background Telemetry]', {
      event: payload.event,
      presetId: payload.presetId,
      versionHash: payload.versionHash,
      details: payload.details,
      timestamp: new Date(payload.timestamp).toISOString(),
      userAgent: payload.userAgent ?? request.headers.get('User-Agent'),
    });

    // Get current server-side telemetry state
    const serverTelemetry = getBackgroundTelemetry();

    return json(
      {
        received: true,
        serverState: serverTelemetry,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('[API /api/background/telemetry] Failed to process telemetry:', error);
    
    return json(
      {
        error: 'Failed to process telemetry',
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
