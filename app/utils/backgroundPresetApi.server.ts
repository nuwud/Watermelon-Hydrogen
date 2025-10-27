import {
  DEFAULT_CALM_INTENSITY,
  DEFAULT_CALM_RADIUS,
  MAX_CALM_INTENSITY,
  MAX_CALM_RADIUS,
  MIN_CALM_INTENSITY,
  MIN_CALM_RADIUS,
  type BackgroundPresetInput,
  type BackgroundPresetRecord,
  type MotionProfile,
} from './backgroundPresets.server';

const VALID_MOTION_PROFILES: MotionProfile[] = ['full', 'subtle', 'static'];

function ensureString(value: unknown, field: string): string {
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(`Invalid value for ${field}`);
}

function ensureOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  throw new Error(`Invalid value for ${field}`);
}

function coerceBoolean(value: unknown, field: string): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  if (typeof value === 'number') {
    if (value === 0) return false;
    if (value === 1) return true;
  }
  throw new Error(`Invalid value for ${field}`);
}

function ensureMotionProfile(value: unknown): MotionProfile {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (VALID_MOTION_PROFILES.includes(normalized as MotionProfile)) {
      return normalized as MotionProfile;
    }
  }
  throw new Error('Invalid motion profile');
}

function ensureNumberInRange(
  value: unknown,
  field: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  let parsed: number;

  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return fallback;
    parsed = Number(trimmed);
  } else {
    throw new Error(`Invalid value for ${field}`);
  }

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid value for ${field}`);
  }

  if (parsed < min || parsed > max) {
    throw new Error(`${field} must be between ${min} and ${max}`);
  }

  return parsed;
}

export function parsePresetInput(payload: unknown): BackgroundPresetInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid preset payload');
  }

  const body = payload as Record<string, unknown>;

  const title = ensureString(body.title, 'title');
  const slug = ensureOptionalString(body.slug, 'slug') ?? title;
  const htmlMarkup = ensureString(body.htmlMarkup, 'htmlMarkup');
  const cssStyles = ensureString(body.cssStyles, 'cssStyles');
  const jsSnippet = ensureOptionalString(body.jsSnippet, 'jsSnippet') ?? '';
  const motionProfile = ensureMotionProfile(body.motionProfile);
  const supportsReducedMotion = coerceBoolean(body.supportsReducedMotion, 'supportsReducedMotion');
  const thumbnailUrl = ensureOptionalString(body.thumbnailUrl, 'thumbnailUrl');
  const isActive = body.isActive === undefined ? false : coerceBoolean(body.isActive, 'isActive');
  const calmRadius = ensureNumberInRange(
    body.calmRadius ?? body.calm_radius,
    'calmRadius',
    DEFAULT_CALM_RADIUS,
    MIN_CALM_RADIUS,
    MAX_CALM_RADIUS,
  );
  const calmIntensity = ensureNumberInRange(
    body.calmIntensity ?? body.calm_intensity,
    'calmIntensity',
    DEFAULT_CALM_INTENSITY,
    MIN_CALM_INTENSITY,
    MAX_CALM_INTENSITY,
  );

  return {
    title,
    slug,
    htmlMarkup,
    cssStyles,
    jsSnippet,
    motionProfile,
    supportsReducedMotion,
    thumbnailUrl,
    isActive,
    calmRadius,
    calmIntensity,
  };
}

export function serializePreset(record: BackgroundPresetRecord) {
  return {
    id: record.id,
    handle: record.handle,
    title: record.title,
    slug: record.slug,
    htmlMarkup: record.htmlMarkup,
    cssStyles: record.cssStyles,
    jsSnippet: record.jsSnippet,
    motionProfile: record.motionProfile,
    supportsReducedMotion: record.supportsReducedMotion,
    thumbnailUrl: record.thumbnailUrl,
    isActive: record.isActive,
    updatedAt: record.updatedAt,
    calmRadius: record.calmRadius,
    calmIntensity: record.calmIntensity,
  };
}
