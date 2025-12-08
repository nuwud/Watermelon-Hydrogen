import {data, type ActionFunctionArgs} from 'react-router';
import {getBackgroundTelemetry} from '../utils/backgroundPresets.server';

type TelemetryEvent = {
  event: 'load' | 'error' | 'timeout';
  presetId: string;
  versionHash?: string;
  details?: string;
  userAgent?: string;
  timestamp?: number;
};

export async function action({request}: ActionFunctionArgs) {
  try {
    const payload = (await request.json()) as TelemetryEvent;
    if (!payload || !payload.event || !payload.presetId) {
      return data(
        {error: 'Invalid telemetry payload'},
        {status: 400, headers: {'Content-Type': 'application/json'}},
      );
    }

    console.log('[api.backgrounds.telemetry]', {
      event: payload.event,
      presetId: payload.presetId,
      versionHash: payload.versionHash,
      details: payload.details,
      timestamp: new Date(payload.timestamp ?? Date.now()).toISOString(),
      userAgent: payload.userAgent ?? request.headers.get('User-Agent'),
    });

    const serverTelemetry = getBackgroundTelemetry();

    return data(
      {received: true, serverState: serverTelemetry},
      {headers: {'Cache-Control': 'no-store', 'Content-Type': 'application/json'}},
    );
  } catch (error) {
    console.error('[api.backgrounds.telemetry] Failed to record telemetry', error);
    return data(
      {
        error: 'Failed to record telemetry',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {status: 500, headers: {'Cache-Control': 'no-store', 'Content-Type': 'application/json'}},
    );
  }
}
