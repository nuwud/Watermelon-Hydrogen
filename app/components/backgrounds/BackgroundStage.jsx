import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import ClientOnly from '../ClientOnly';
import {HoneycombField} from './HoneycombField';
import {InteractivePolygonsField} from './InteractivePolygonsField';
import './backgrounds.css';

/**
 * Unified Background System
 * 
 * Supports multiple background modes:
 * - 'honeycomb': Original hex field (HoneycombField)
 * - 'polygons': Interactive polygons wall (InteractivePolygonsField)  
 * - 'solid': Simple solid color (no 3D rendering)
 * 
 * Mode is persisted in localStorage under 'wm_background_mode'
 */

const STORAGE_KEY = 'wm_background_mode';
const DEFAULT_MODE = 'honeycomb';
const VALID_MODES = ['honeycomb', 'polygons', 'solid'];

const DEFAULT_CALM_RADIUS = 320;
const MIN_CALM_RADIUS = 120;
const MAX_CALM_RADIUS = 960;
const DEFAULT_CALM_INTENSITY = 0.55;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Get stored mode from localStorage
function getStoredMode() {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_MODES.includes(stored)) {
      return stored;
    }
  } catch (e) {
    console.warn('[BackgroundStage] Failed to read stored mode:', e);
  }
  return DEFAULT_MODE;
}

// Persist mode to localStorage
function persistMode(mode) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    // Dispatch event for debug panels
    window.dispatchEvent(new CustomEvent('wm-background-changed', {
      detail: {mode}
    }));
  } catch (e) {
    console.warn('[BackgroundStage] Failed to persist mode:', e);
  }
}

// Hook for background mode management
function useBackgroundMode() {
  const [mode, setModeState] = useState(getStoredMode);
  
  const setMode = useCallback((newMode) => {
    if (!VALID_MODES.includes(newMode)) {
      console.warn(`[BackgroundStage] Invalid mode: ${newMode}. Valid modes: ${VALID_MODES.join(', ')}`);
      return;
    }
    setModeState(newMode);
    persistMode(newMode);
    console.log(`[BackgroundStage] Mode changed to: ${newMode}`);
  }, []);
  
  const cycleMode = useCallback(() => {
    const currentIndex = VALID_MODES.indexOf(mode);
    const nextIndex = (currentIndex + 1) % VALID_MODES.length;
    setMode(VALID_MODES[nextIndex]);
    return VALID_MODES[nextIndex];
  }, [mode, setMode]);
  
  return {mode, setMode, cycleMode, validModes: VALID_MODES};
}

// Hook for reduced motion preference
function useReducedMotion() {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => {
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

  return isReducedMotion;
}

function BackgroundStageInner() {
  const containerRef = useRef(null);
  const {mode, setMode, cycleMode, validModes} = useBackgroundMode();
  const isReducedMotion = useReducedMotion();

  // Expose API globally for debug/admin access
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    window.__wmBackground = {
      getMode: () => mode,
      setMode,
      cycleMode,
      getValidModes: () => validModes,
    };
    
    console.log('[BackgroundStage] API exposed as window.__wmBackground');
    console.log(`[BackgroundStage] Current mode: ${mode}`);
    
    return () => {
      delete window.__wmBackground;
    };
  }, [mode, setMode, cycleMode, validModes]);

  // Calm zone settings (for honeycomb)
  const calmRadius = useMemo(() => {
    return clamp(DEFAULT_CALM_RADIUS, MIN_CALM_RADIUS, MAX_CALM_RADIUS);
  }, []);

  const calmIntensity = useMemo(() => {
    return clamp(DEFAULT_CALM_INTENSITY, 0, 1);
  }, []);

  // Render the active background component
  const renderBackground = () => {
    switch (mode) {
      case 'honeycomb':
        return (
          <HoneycombField
            calmRadius={calmRadius}
            calmIntensity={isReducedMotion ? 0 : calmIntensity}
            isReducedMotion={isReducedMotion}
          />
        );
      case 'polygons':
        return (
          <InteractivePolygonsField
            isReducedMotion={isReducedMotion}
          />
        );
      case 'solid':
        // Solid mode renders nothing - just uses CSS background
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="wm-background-stage" aria-hidden="true" data-mode={mode}>
      <div className="wm-background-stage__gradient" />
      {renderBackground()}
      <div ref={containerRef} className="wm-background-stage__canvas" />
      {/* Debug overlay - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="wm-background-stage__overlay wm-background-stage__overlay--dev">
          <button
            type="button"
            className="wm-background-stage__mode-toggle"
            onClick={cycleMode}
            title={`Current: ${mode}. Click to cycle.`}
          >
            🎨 {mode}
          </button>
        </div>
      )}
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
