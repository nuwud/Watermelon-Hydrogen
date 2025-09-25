import {getEnvPublic} from './env.public';
const envPublic = getEnvPublic();

export const BUILD_SHA: string = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || '').trim();
export const BUILD_TIME: string = new Date().toISOString();
export const ENV_NAME: string = process.env.NODE_ENV === 'production' ? 'production' : (process.env.NODE_ENV || 'development');
export const STORE_DOMAIN: string = envPublic.PUBLIC_STORE_DOMAIN;
