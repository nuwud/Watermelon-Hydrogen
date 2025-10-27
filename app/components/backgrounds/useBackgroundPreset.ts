import {useCallback, useEffect, useRef, useState} from 'react';

type BackgroundTelemetry = {
  state: 'ok' | 'fallback' | 'error';
  reason?: string;
  presetId?: string;
  timestamp: string;
};

export type ActiveBackgroundPreset = {
  id: string;
  handle: string;
  html: string;
  css: string;
  js: string;
  motionProfile: 'full' | 'subtle' | 'static';
  supportsReducedMotion: boolean;
  versionHash: string;
  updatedAt: string;
  status: BackgroundTelemetry;
  calmRadius: number;
  calmIntensity: number;
};

type BackgroundPresetState = {
  preset: ActiveBackgroundPreset | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  isFallback: boolean;
};

type UseBackgroundPresetOptions = {
  refreshIntervalMs?: number;
};

const DEFAULT_OPTIONS: Required<UseBackgroundPresetOptions> = {
  refreshIntervalMs: 60_000,
};

let cachedPreset: ActiveBackgroundPreset | null = null;

export function useBackgroundPreset(options: UseBackgroundPresetOptions = {}) {
  const {refreshIntervalMs} = {...DEFAULT_OPTIONS, ...options};
  const [state, setState] = useState<BackgroundPresetState>(() => {
    if (cachedPreset) {
      return {
        preset: cachedPreset,
        status: 'ready',
        error: undefined,
        isFallback:
          cachedPreset.id === 'background:fallback' || cachedPreset.status.state !== 'ok',
      };
    }
    return {
      preset: null,
      status: 'idle',
      error: undefined,
      isFallback: false,
    };
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const cleanupTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updateState = useCallback(
    (preset: ActiveBackgroundPreset | null, error?: string) => {
      if (preset) {
        cachedPreset = preset;
      }
      const fallbackPreset = preset ?? cachedPreset;
      setState({
        preset: fallbackPreset,
        status: error ? 'error' : preset ? 'ready' : fallbackPreset ? 'ready' : 'idle',
        error,
        isFallback: Boolean(
          fallbackPreset?.id === 'background:fallback' ||
            fallbackPreset?.status.state !== 'ok',
        ),
      });
    },
    [],
  );

  const fetchPreset = useCallback(async () => {
    if (typeof window === 'undefined') return null;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setState((prev) => ({...prev, status: 'loading', error: undefined}));

    try {
      const response = await fetch('/api/backgrounds/active', {
        method: 'GET',
        headers: {'Accept': 'application/json'},
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch preset (${response.status})`);
      }

      const payload = (await response.json()) as ActiveBackgroundPreset;
      updateState(payload);
      return payload;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null;
      }
      console.error('[useBackgroundPreset] Unable to load preset', error);
      updateState(cachedPreset, (error as Error).message);
      return null;
    }
  }, [updateState]);

  const scheduleRefresh = useCallback(() => {
    cleanupTimer();
    if (refreshIntervalMs > 0) {
      timerRef.current = setTimeout(() => {
        void fetchPreset();
      }, refreshIntervalMs);
    }
  }, [cleanupTimer, fetchPreset, refreshIntervalMs]);

  const refresh = useCallback(async () => {
    cleanupTimer();
    const result = await fetchPreset();
    scheduleRefresh();
    return result;
  }, [cleanupTimer, fetchPreset, scheduleRefresh]);

  useEffect(() => {
    if (!cachedPreset) {
      void refresh();
    } else {
      scheduleRefresh();
    }

    return () => {
      cleanupTimer();
      requestRef.current?.abort();
    };
  }, [cleanupTimer, refresh, scheduleRefresh]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsReducedMotion(event.matches);
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }

    return undefined;
  }, []);

  return {
    preset: state.preset,
    status: state.status,
    error: state.error,
    isFallback: state.isFallback,
    refresh,
    isReducedMotion,
  };
}
