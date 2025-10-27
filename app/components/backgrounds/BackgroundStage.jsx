import {useCallback, useEffect, useMemo, useRef} from 'react';
import ClientOnly from '../ClientOnly';
import {useBackgroundPreset} from './useBackgroundPreset';
import {HoneycombField} from './HoneycombField';
import './backgrounds.css';

const DEFAULT_CALM_RADIUS = 320;
const MIN_CALM_RADIUS = 120;
const MAX_CALM_RADIUS = 960;
const DEFAULT_CALM_INTENSITY = 0.55;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function sendTelemetry(event, payload) {
  try {
    await fetch('/api/backgrounds/telemetry', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        event,
        presetId: payload.presetId,
        versionHash: payload.versionHash,
        details: payload.details,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.warn('[BackgroundStage] Telemetry failed', error);
  }
}

function BackgroundStageInner() {
  const containerRef = useRef(null);
  const teardownRef = useRef(null);
  const lastVersionRef = useRef(null);
  const {preset, status, error, isFallback, refresh, isReducedMotion} = useBackgroundPreset();

  const reduceMotion = Boolean(isReducedMotion || (preset ? !preset.supportsReducedMotion : false));

  const calmRadius = useMemo(() => {
    const raw = preset?.calmRadius ?? DEFAULT_CALM_RADIUS;
    return clamp(raw, MIN_CALM_RADIUS, MAX_CALM_RADIUS);
  }, [preset?.calmRadius]);

  const calmIntensity = useMemo(() => {
    const raw = preset?.calmIntensity ?? DEFAULT_CALM_INTENSITY;
    return clamp(raw, 0, 1);
  }, [preset?.calmIntensity]);

  const versionKey = preset ? `${preset.versionHash}:${reduceMotion ? 'reduced' : 'normal'}` : null;

  const mountPreset = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current || !preset || !versionKey) return;

    if (lastVersionRef.current === versionKey) {
      return;
    }

    if (teardownRef.current) {
      teardownRef.current();
      teardownRef.current = null;
    }

    lastVersionRef.current = versionKey;

    try {
      const module = await import('./backgroundRenderer.client');
      const {mountBackgroundRenderer} = module;
      if (typeof mountBackgroundRenderer !== 'function') {
        throw new Error('Background renderer unavailable');
      }

      teardownRef.current = mountBackgroundRenderer(containerRef.current, preset, {
        forceReducedMotion: reduceMotion,
        onLoad: () => {
          void sendTelemetry('load', {
            presetId: preset.id,
            versionHash: versionKey,
            details: reduceMotion ? 'reduced-motion' : undefined,
          });
        },
        onError: (mountError) => {
          console.error('[BackgroundStage] Renderer error', mountError);
          void sendTelemetry('error', {
            presetId: preset.id,
            versionHash: versionKey,
            details: mountError instanceof Error ? mountError.message : String(mountError),
          });
        },
      });
    } catch (mountError) {
      console.error('[BackgroundStage] Failed to mount background', mountError);
      void sendTelemetry('error', {
        presetId: preset.id,
        versionHash: versionKey,
        details: mountError instanceof Error ? mountError.message : String(mountError),
      });
    }
  }, [preset, reduceMotion, versionKey]);

  useEffect(() => {
    if (!preset) {
      if (teardownRef.current) {
        teardownRef.current();
        teardownRef.current = null;
      }
      lastVersionRef.current = null;
      return;
    }

    void mountPreset();

    return () => {
      if (!preset && teardownRef.current) {
        teardownRef.current();
        teardownRef.current = null;
        lastVersionRef.current = null;
      }
    };
  }, [preset, mountPreset]);

  useEffect(() => {
    return () => {
      if (teardownRef.current) {
        teardownRef.current();
        teardownRef.current = null;
      }
      lastVersionRef.current = null;
    };
  }, []);

  return (
    <div className="wm-background-stage" aria-hidden="true">
      <div className="wm-background-stage__gradient" />
      <HoneycombField
        calmRadius={calmRadius}
        calmIntensity={reduceMotion ? 0 : calmIntensity}
        isReducedMotion={reduceMotion}
      />
      <div ref={containerRef} className="wm-background-stage__canvas" />
      <div className="wm-background-stage__overlay">
        {status === 'loading' && <span>Loading background...</span>}
        {status === 'error' && <span>Background error: {error}</span>}
        {isFallback && status === 'ready' && <span>Fallback background active</span>}
        {reduceMotion && status === 'ready' && (
          <span>Reduced motion mode active</span>
        )}
        <button
          type="button"
          className="wm-background-stage__refresh"
          onClick={() => void refresh()}
        >
          Refresh Preset
        </button>
      </div>
    </div>
  );
}

export function BackgroundStage() {
  return (
    <ClientOnly fallback={null}>
      {() => <BackgroundStageInner />}
    </ClientOnly>
  );
}

export default BackgroundStage;
