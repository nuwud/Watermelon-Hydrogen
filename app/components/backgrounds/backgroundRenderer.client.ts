import type {ActiveBackgroundPreset} from './useBackgroundPreset';

export type MountBackgroundRendererOptions = {
  onLoad?: () => void;
  onError?: (error: Error) => void;
  forceReducedMotion?: boolean;
};

const IFRAME_SANDBOX = 'allow-scripts allow-same-origin';
const IFRAME_CLASSNAME = 'wm-background-stage__iframe';
const LOAD_TIMEOUT_MS = 4_000;

function escapeForScript(value: string) {
  return value.replace(/<\/script/gi, '<\\/script');
}

function escapeForStyle(value: string) {
  return value.replace(/<\/style/gi, '<\\/style');
}

function escapeForAttribute(value: string) {
  return value.replace(/"/g, '&quot;');
}

function escapeForData(value: string) {
  return value.replace(/'/g, "\\'");
}

function buildSrcDoc(preset: ActiveBackgroundPreset, forceReducedMotion: boolean) {
  const baseStyles =
    'html,body{margin:0;padding:0;overflow:hidden;background:transparent;color:inherit;line-height:1.15;font-family:inherit;}#wm-background-root{position:fixed;inset:0;overflow:hidden;will-change:transform,opacity;}';
  const reducedMotionStyles = forceReducedMotion
    ? '*{animation:none!important;transition-duration:0s!important;}'
    : '';
  const safeHash = escapeForData(preset.versionHash);
  const controlledScript = [
    'try{',
    "const root=document.getElementById('wm-background-root');",
    "if(!root)throw new Error('Missing background root element');",
    `var forceReduced=${forceReducedMotion ? 'true' : 'false'};`,
    "var applyReducedMotion=function(){document.documentElement.dataset.motion='reduced';};",
    "var clearReducedMotion=function(){delete document.documentElement.dataset.motion;};",
    preset.supportsReducedMotion && !forceReducedMotion
      ? "var prefersReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');"
      : 'var prefersReducedMotion=null;',
    forceReducedMotion ? 'applyReducedMotion();' : '',
    preset.supportsReducedMotion && !forceReducedMotion
      ? 'if(prefersReducedMotion.matches){applyReducedMotion();}'
      : '',
    preset.supportsReducedMotion && !forceReducedMotion
      ? "var onMotionChange=function(event){if(event.matches){applyReducedMotion();}else{clearReducedMotion();}};"
      : '',
    preset.supportsReducedMotion && !forceReducedMotion
      ? "if(prefersReducedMotion){if(typeof prefersReducedMotion.addEventListener==='function'){prefersReducedMotion.addEventListener('change',onMotionChange);}else if(typeof prefersReducedMotion.addListener==='function'){prefersReducedMotion.addListener(onMotionChange);}}"
      : '',
    'var notifyReady=function(){if(window.parent&&typeof window.parent.postMessage==="function"){window.parent.postMessage({type:"wm-background-ready",hash:"' +
      safeHash +
      '"},"*");}};',
    'var notifyError=function(message){if(window.parent&&typeof window.parent.postMessage==="function"){window.parent.postMessage({type:"wm-background-error",hash:"' +
      safeHash +
      '",message:message},"*");}};',
    'var init=function(){try{',
    'if(forceReduced){notifyReady();return;}',
    escapeForScript(preset.js),
    ';notifyReady();}catch(initialiseError){notifyError(initialiseError&&initialiseError.message?initialiseError.message:String(initialiseError));}};',
    "if(document.readyState==='complete'){init();}else{window.addEventListener('load',init,{once:true});}",
    '}catch(error){notifyError(error&&error.message?error.message:String(error));}',
  ]
    .filter(Boolean)
    .join('');

  return `<!DOCTYPE html><html lang="en" data-motion="${escapeForAttribute(
    preset.motionProfile,
  )}"><head><meta charset="utf-8"/><style>${escapeForStyle(baseStyles)}${escapeForStyle(
    reducedMotionStyles,
  )}${escapeForStyle(
    preset.css,
  )}</style></head><body><div id="wm-background-root">${preset.html}</div><script>${controlledScript}</script></body></html>`;
}

export function mountBackgroundRenderer(
  container: HTMLElement,
  preset: ActiveBackgroundPreset,
  options: MountBackgroundRendererOptions = {},
) {
  const {onLoad, onError, forceReducedMotion = false} = options;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Decorative background');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('sandbox', IFRAME_SANDBOX);
  iframe.setAttribute('loading', 'eager');
  iframe.className = IFRAME_CLASSNAME;
  iframe.tabIndex = -1;

  let disposed = false;
  let loadTimer: number | null = null;

  const cleanupTimer = () => {
    if (loadTimer !== null) {
      window.clearTimeout(loadTimer);
      loadTimer = null;
    }
  };

  const handleLoad = () => {
    cleanupTimer();
    onLoad?.();
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow || typeof event.data !== 'object') {
      return;
    }

    const {type, hash, message} = event.data as {
      type?: string;
      hash?: string;
      message?: string;
    };

    if (hash !== preset.versionHash) return;

    if (type === 'wm-background-ready') {
      handleLoad();
    } else if (type === 'wm-background-error') {
      cleanupTimer();
      const error = new Error(message || 'Unknown background render error');
      onError?.(error);
    }
  };

  const handleError = (event: ErrorEvent) => {
    cleanupTimer();
    const error = event.error instanceof Error ? event.error : new Error(event.message);
    onError?.(error);
  };

  cleanupTimer();
  container.innerHTML = '';
  container.appendChild(iframe);

  window.addEventListener('message', handleMessage);
  iframe.addEventListener('error', handleError);
  iframe.addEventListener('load', handleLoad, {once: true});

  iframe.srcdoc = buildSrcDoc(preset, forceReducedMotion);

  loadTimer = window.setTimeout(() => {
    const error = new Error('Timed out waiting for background to load');
    onError?.(error);
  }, LOAD_TIMEOUT_MS);

  return () => {
    if (disposed) return;
    disposed = true;
    cleanupTimer();
    window.removeEventListener('message', handleMessage);
    iframe.removeEventListener('error', handleError);
    iframe.removeEventListener('load', handleLoad);
    iframe.remove();
  };
}

