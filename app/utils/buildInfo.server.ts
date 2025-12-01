import {getEnvPublic} from './env.public';

// Lazy getters to avoid global scope violations in Cloudflare Workers
// Date(), process.env, and other I/O cannot be called at module load time

let _buildSha: string | null = null;
export function getBuildSha(): string {
  if (_buildSha === null) {
    _buildSha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || '').trim();
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
    _envName = process.env.NODE_ENV === 'production' ? 'production' : (process.env.NODE_ENV || 'development');
  }
  return _envName;
}

let _storeDomain: string | null = null;
export function getStoreDomain(): string {
  if (_storeDomain === null) {
    _storeDomain = getEnvPublic().PUBLIC_STORE_DOMAIN;
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
