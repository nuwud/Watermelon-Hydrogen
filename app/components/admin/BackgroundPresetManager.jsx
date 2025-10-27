import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useBackgroundPreset} from '../backgrounds/useBackgroundPreset';
import './backgroundPresetManager.css';

const TOKEN_STORAGE_KEY = 'wm-backgrounds-token';
const DEFAULT_FORM = {
  id: null,
  title: '',
  slug: '',
  htmlMarkup: '',
  cssStyles: '',
  jsSnippet: '',
  motionProfile: 'subtle',
  supportsReducedMotion: true,
  thumbnailUrl: '',
  isActive: false,
  calmRadius: 320,
  calmIntensity: 0.55,
};

const MOTION_OPTIONS = [
  {value: 'full', label: 'Full Motion'},
  {value: 'subtle', label: 'Subtle Motion'},
  {value: 'static', label: 'Static'},
];

function normalizeNumberInput(value, fallback, min, max) {
  if (value === '' || value === null || value === undefined) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function BackgroundPresetManager() {
  const [tokenState, setTokenState] = useState({token: null, expiresAt: null});
  const [tokenInput, setTokenInput] = useState('');
  const [tokenStatus, setTokenStatus] = useState(null);
  const [presets, setPresets] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const previewRef = useRef(null);
  const previewTeardownRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const {
    preset: activePreset,
    status: activeStatus,
    error: activeError,
    isFallback,
    refresh: refreshActivePreset,
    isReducedMotion,
  } = useBackgroundPreset({refreshIntervalMs: 45_000});

  const hasToken = Boolean(tokenState.token);

  const activeSummary = useMemo(() => {
    if (!activePreset) {
      return {
        text: 'No active preset available',
        tone: 'warn',
      };
    }

    if (isFallback) {
      return {
        text: 'Fallback background is currently displayed',
        tone: 'warn',
      };
    }

    if (activeStatus === 'error') {
      return {
        text: `Background error: ${activeError}`,
        tone: 'error',
      };
    }

    return {
      text: `Active preset: ${activePreset.title || activePreset.handle} (${activePreset.motionProfile})`,
      tone: 'ok',
    };
  }, [activePreset, activeStatus, activeError, isFallback]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!parsed?.token) return;
      if (parsed.expiresAt) {
        const expiry = new Date(parsed.expiresAt).getTime();
        if (Number.isFinite(expiry) && expiry <= Date.now()) {
          return;
        }
      }
      setTokenState(parsed);
    } catch (error) {
      console.warn('[BackgroundPresetManager] Failed to restore token', error);
    }
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    void fetchPresets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  useEffect(() => {
    return () => {
      if (previewTeardownRef.current) {
        previewTeardownRef.current();
        previewTeardownRef.current = null;
      }
    };
  }, []);

  const persistToken = useCallback((token, expiresAt) => {
    setTokenState({token, expiresAt});
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          TOKEN_STORAGE_KEY,
          JSON.stringify({token, expiresAt}),
        );
      } catch (error) {
        console.warn('[BackgroundPresetManager] Failed to persist token', error);
      }
    }
  }, []);

  const clearStoredToken = useCallback(() => {
    setTokenState({token: null, expiresAt: null});
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, []);

  const fetchPresets = useCallback(async () => {
    if (!tokenState.token) return;
    setLoadingPresets(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/backgrounds', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${tokenState.token}`,
          'Cache-Control': 'no-store',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredToken();
          throw new Error('Token expired or invalid. Please request a new token.');
        }
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load presets (${response.status})`);
      }

      const data = await response.json();
      setPresets(Array.isArray(data) ? data : []);
      setStatusMessage(`Loaded ${Array.isArray(data) ? data.length : 0} presets`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load presets');
    } finally {
      setLoadingPresets(false);
    }
  }, [tokenState.token, clearStoredToken]);

  const handleRequestToken = async (event) => {
    event.preventDefault();
    if (!tokenInput.trim()) {
      setTokenStatus('Admin key required');
      return;
    }

    setTokenStatus('Requesting token…');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/backgrounds/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify({key: tokenInput.trim()}),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Token request failed (${response.status})`);
      }

      const payload = await response.json();
      persistToken(payload.token, payload.expiresAt ?? null);
      setTokenStatus('Token issued');
      setTokenInput('');
      void fetchPresets();
    } catch (error) {
      setTokenStatus(error instanceof Error ? error.message : 'Failed to request token');
    }
  };

  const handleFieldChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({...prev, [field]: value}));
  };

  const handleNumberField = (field, min, max) => (event) => {
    const value = normalizeNumberInput(event.target.value, form[field], min, max);
    setForm((prev) => ({...prev, [field]: value}));
  };

  const handleSelectPreset = (presetId) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    setSelectedId(presetId);
    setForm({
      id: preset.id,
      title: preset.title ?? '',
      slug: preset.slug ?? '',
      htmlMarkup: preset.htmlMarkup ?? '',
      cssStyles: preset.cssStyles ?? '',
      jsSnippet: preset.jsSnippet ?? '',
      motionProfile: preset.motionProfile ?? 'subtle',
      supportsReducedMotion: Boolean(preset.supportsReducedMotion),
      thumbnailUrl: preset.thumbnailUrl ?? '',
      isActive: Boolean(preset.isActive),
      calmRadius: preset.calmRadius ?? 320,
      calmIntensity: preset.calmIntensity ?? 0.55,
    });
  };

  const resetForm = () => {
    setSelectedId(null);
    setForm(DEFAULT_FORM);
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    slug: form.slug.trim() || form.title.trim().toLowerCase().replace(/[^a-z0-9]+/giu, '-'),
    htmlMarkup: form.htmlMarkup,
    cssStyles: form.cssStyles,
    jsSnippet: form.jsSnippet,
    motionProfile: form.motionProfile,
    supportsReducedMotion: Boolean(form.supportsReducedMotion),
    thumbnailUrl: form.thumbnailUrl || undefined,
    isActive: Boolean(form.isActive),
    calmRadius: normalizeNumberInput(form.calmRadius, 320, 120, 960),
    calmIntensity: normalizeNumberInput(form.calmIntensity, 0.55, 0, 1),
  });

  const handleSave = async () => {
    if (!tokenState.token) {
      setErrorMessage('Token required. Request a token first.');
      return;
    }
    if (!form.title.trim()) {
      setErrorMessage('Title is required');
      return;
    }

    const payload = buildPayload();
    setIsSaving(true);
    setErrorMessage(null);

    const isUpdate = Boolean(form.id);
    const endpoint = isUpdate ? `/api/backgrounds/${form.id}` : '/api/backgrounds';
    const method = isUpdate ? 'PATCH' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenState.token}`,
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredToken();
        }
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to ${isUpdate ? 'update' : 'create'} preset`);
      }

      const updated = await response.json();
      setStatusMessage(`Preset ${isUpdate ? 'updated' : 'created'} successfully`);
      setForm((prev) => ({...prev, id: updated.id, isActive: updated.isActive}));
      setSelectedId(updated.id);
      await fetchPresets();
      await refreshActivePreset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save preset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tokenState.token || !form.id) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/backgrounds/${form.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokenState.token}`,
          'Cache-Control': 'no-store',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredToken();
        }
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete preset');
      }

      setStatusMessage('Preset deleted');
      resetForm();
      await fetchPresets();
      await refreshActivePreset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete preset');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleActivate = async () => {
    if (!tokenState.token || !form.id) {
      setErrorMessage('Select a preset before activating');
      return;
    }
    setIsActivating(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/backgrounds/${form.id}/activate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenState.token}`,
          'Cache-Control': 'no-store',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredToken();
        }
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to activate preset');
      }

      setStatusMessage('Preset activated');
      await fetchPresets();
      await refreshActivePreset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to activate preset');
    } finally {
      setIsActivating(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!previewRef.current) return;
    const container = previewRef.current;

    if (previewTeardownRef.current) {
      previewTeardownRef.current();
      previewTeardownRef.current = null;
    }

    if (!form.htmlMarkup && !form.cssStyles && !form.jsSnippet) {
      container.innerHTML = '<div class="wm-background-preview-empty">Provide HTML/CSS/JS to preview</div>';
      return;
    }

    let isCancelled = false;

    const mountPreview = async () => {
      try {
        const module = await import('../../components/backgrounds/backgroundRenderer.client');
        if (!module?.mountBackgroundRenderer || isCancelled) return;
        const {mountBackgroundRenderer} = module;
        const versionHash = typeof window.crypto?.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : `preview-${Date.now()}`;
        const previewPreset = {
          id: form.id ?? 'preview',
          handle: form.slug || 'preview',
          html: form.htmlMarkup,
          css: form.cssStyles,
          js: form.jsSnippet,
          motionProfile: form.motionProfile,
          supportsReducedMotion: form.supportsReducedMotion,
          versionHash,
          updatedAt: new Date().toISOString(),
          status: {
            state: 'ok',
            timestamp: new Date().toISOString(),
          },
          calmRadius: form.calmRadius,
          calmIntensity: form.calmIntensity,
        };

        previewTeardownRef.current = mountBackgroundRenderer(container, previewPreset, {
          forceReducedMotion: false,
          onError: (error) => {
            console.error('[BackgroundPresetManager] Preview failed', error);
          },
        });
      } catch (error) {
        console.error('[BackgroundPresetManager] Unable to mount preview', error);
        container.innerHTML = '<div class="wm-background-preview-error">Preview unavailable</div>';
      }
    };

    mountPreview();

    return () => {
      isCancelled = true;
      if (previewTeardownRef.current) {
        previewTeardownRef.current();
        previewTeardownRef.current = null;
      }
    };
  }, [form.id, form.slug, form.htmlMarkup, form.cssStyles, form.jsSnippet, form.motionProfile, form.supportsReducedMotion, form.calmRadius, form.calmIntensity]);

  const tokenExpiryLabel = tokenState.expiresAt
    ? new Date(tokenState.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
    : null;

  return (
    <div className="wm-admin-background-manager">
      <div className="wm-admin-background-manager__section">
        <h4>Authentication</h4>
        <form onSubmit={handleRequestToken} className="wm-admin-background-manager__token-form">
          <label>
            Admin Key
            <input
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Enter BACKGROUND_ADMIN_KEY"
            />
          </label>
          <div className="wm-admin-background-manager__token-actions">
            <button type="submit" disabled={!tokenInput.trim()}>
              Request Token
            </button>
            {hasToken && (
              <button type="button" onClick={clearStoredToken}>
                Clear Token
              </button>
            )}
          </div>
        </form>
        {tokenStatus && <p className="wm-admin-background-manager__status">{tokenStatus}</p>}
        {hasToken && (
          <p className="wm-admin-background-manager__status">
            Token active {tokenExpiryLabel ? `until ${tokenExpiryLabel}` : '(expires soon)'}
          </p>
        )}
      </div>

      <div className="wm-admin-background-manager__section">
        <div className="wm-admin-background-manager__section-header">
          <h4>Presets</h4>
          <div className="wm-admin-background-manager__section-actions">
            <button type="button" onClick={fetchPresets} disabled={!hasToken || loadingPresets}>
              Refresh
            </button>
            <button type="button" onClick={resetForm}>
              New Preset
            </button>
          </div>
        </div>
        <div className="wm-admin-background-manager__preset-list">
          {loadingPresets && <div className="wm-admin-background-manager__message">Loading presets…</div>}
          {!loadingPresets && presets.length === 0 && (
            <div className="wm-admin-background-manager__message">No presets found</div>
          )}
          {presets.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={`wm-admin-background-manager__preset ${
                preset.id === selectedId ? 'is-selected' : ''
              } ${preset.isActive ? 'is-active' : ''}`}
              onClick={() => handleSelectPreset(preset.id)}
            >
              <span className="wm-admin-background-manager__preset-title">{preset.title || preset.handle}</span>
              <span className="wm-admin-background-manager__preset-meta">
                {preset.motionProfile} · Updated {new Date(preset.updatedAt).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="wm-admin-background-manager__section">
        <h4>Preset Editor</h4>
        <div className="wm-admin-background-manager__form-grid">
          <label>
            Title
            <input type="text" value={form.title} onChange={handleFieldChange('title')} />
          </label>
          <label>
            Slug
            <input type="text" value={form.slug} onChange={handleFieldChange('slug')} />
          </label>
          <label>
            Thumbnail URL
            <input type="url" value={form.thumbnailUrl} onChange={handleFieldChange('thumbnailUrl')} />
          </label>
          <label>
            Motion Profile
            <select value={form.motionProfile} onChange={handleFieldChange('motionProfile')}>
              {MOTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="wm-admin-background-manager__checkbox">
            <input
              type="checkbox"
              checked={form.supportsReducedMotion}
              onChange={handleFieldChange('supportsReducedMotion')}
            />
            Supports Reduced Motion
          </label>
          <label className="wm-admin-background-manager__checkbox">
            <input type="checkbox" checked={form.isActive} onChange={handleFieldChange('isActive')} />
            Mark Active on Save
          </label>
          <label>
            Calm Radius (px)
            <input
              type="number"
              min={120}
              max={960}
              step={10}
              value={form.calmRadius}
              onChange={handleNumberField('calmRadius', 120, 960)}
            />
          </label>
          <label>
            Calm Intensity (0-1)
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={form.calmIntensity}
              onChange={handleNumberField('calmIntensity', 0, 1)}
            />
          </label>
        </div>

        <label className="wm-admin-background-manager__textarea">
          HTML Markup
          <textarea value={form.htmlMarkup} onChange={handleFieldChange('htmlMarkup')} rows={6} />
        </label>
        <label className="wm-admin-background-manager__textarea">
          CSS Styles
          <textarea value={form.cssStyles} onChange={handleFieldChange('cssStyles')} rows={6} />
        </label>
        <label className="wm-admin-background-manager__textarea">
          JS Snippet
          <textarea value={form.jsSnippet} onChange={handleFieldChange('jsSnippet')} rows={6} />
        </label>

        <div className="wm-admin-background-manager__actions">
          <button type="button" onClick={handleSave} disabled={!hasToken || isSaving}>
            {form.id ? 'Update Preset' : 'Create Preset'}
          </button>
          <button type="button" onClick={handleActivate} disabled={!hasToken || !form.id || isActivating}>
            Activate Preset
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!hasToken || !form.id || isDeleting}
            className="wm-admin-background-manager__danger"
          >
            Delete Preset
          </button>
        </div>
        {statusMessage && <p className="wm-admin-background-manager__status">{statusMessage}</p>}
        {errorMessage && <p className="wm-admin-background-manager__error">{errorMessage}</p>}
      </div>

      <div className="wm-admin-background-manager__section">
        <h4>Preview</h4>
        <div ref={previewRef} className="wm-admin-background-manager__preview" />
      </div>

      <div className="wm-admin-background-manager__section">
        <h4>Live Background Status</h4>
        <div className={`wm-admin-background-manager__status-card wm-status--${activeSummary.tone}`}>
          <p>{activeSummary.text}</p>
          {activePreset && (
            <ul>
              <li>Handle: {activePreset.handle}</li>
              <li>Version: {activePreset.versionHash.slice(0, 10)}…</li>
              <li>Updated: {new Date(activePreset.updatedAt).toLocaleString()}</li>
              <li>Reduced Motion: {isReducedMotion ? 'Active' : 'Normal'}</li>
            </ul>
          )}
          <div className="wm-admin-background-manager__status-actions">
            <button type="button" onClick={() => refreshActivePreset()}>
              Refresh Active Preset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BackgroundPresetManager;
