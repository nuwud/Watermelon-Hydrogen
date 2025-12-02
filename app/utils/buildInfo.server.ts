import {getEnvPublic} from './env.public';

// Runtime environment storage for Workers compatibility
let _runtimeEnv: Record<string, string | undefined> | null = null;

/**
 * Set the runtime environment for Workers compatibility.
 * Must be called early in request handling with context.rawEnv
 */
export function setRuntimeEnv(env: Record<string, string | undefined>): void {
  _runtimeEnv = env;
}

// Lazy getters to avoid global scope violations in Cloudflare Workers
// Date(), process.env, and other I/O cannot be called at module load time

function resolveEnvVar(key: string): string | undefined {
  // Try runtime env first (Workers)
  if (_runtimeEnv?.[key]) return _runtimeEnv[key];
  // Fallback to process.env (Node)
  if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
  return undefined;
}

let _buildSha: string | null = null;
export function getBuildSha(): string {
  if (_buildSha === null) {
    _buildSha = (resolveEnvVar('VERCEL_GIT_COMMIT_SHA') || resolveEnvVar('COMMIT_SHA') || '').trim();
  }
  return _buildSha;
}

let _buildTime: string | null = null;
export function getBuildTime(): string {
  if (_buildTime === null) {
    _buildTime = new Date().toISOString();
  }
  return _buildTime;
}

let _envName: string | null = null;
export function getEnvName(): string {
  if (_envName === null) {
    const nodeEnv = resolveEnvVar('NODE_ENV');
    _envName = nodeEnv === 'production' ? 'production' : (nodeEnv || 'development');
  }
  return _envName;
}

let _storeDomain: string | null = null;
export function getStoreDomain(): string {
  if (_storeDomain === null) {
    _storeDomain = getEnvPublic(_runtimeEnv ?? undefined).PUBLIC_STORE_DOMAIN;
  }
  return _storeDomain;
}

// Deprecated: These constants are kept for backwards compatibility but will cause Oxygen errors
// Use the getter functions instead: getBuildSha(), getBuildTime(), getEnvName(), getStoreDomain()
// @deprecated Use getBuildSha() instead
export const BUILD_SHA: string = '';
// @deprecated Use getBuildTime() instead
export const BUILD_TIME: string = '';
// @deprecated Use getEnvName() instead
export const ENV_NAME: string = '';
// @deprecated Use getStoreDomain() instead
export const STORE_DOMAIN: string = '';
