import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';
// Lazily import env and build info inside the handler to ensure MiniOxygen env is loaded

/**
 * @param {Request} request
 * @param {number} responseStatusCode
 * @param {Headers} responseHeaders
 * @param {RouterContext} routerContext
 * @param {AppLoadContext} context
 */
export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  routerContext,
  context,
) {
  // Use context.rawEnv to access runtime environment in Workers
  const {getEnvPublic} = await import('~/utils/env.public');
  const envPublic = getEnvPublic(context.rawEnv);
  const {getBuildSha, getEnvName, getStoreDomain, setRuntimeEnv} = await import('~/utils/buildInfo.server');
  
  // Initialize runtime env for buildInfo helpers
  setRuntimeEnv(context.rawEnv);

  // Canonical host redirect (optional)
  const canonical = envPublic.PUBLIC_CANONICAL_HOST;
  if (canonical) {
    const url = new URL(request.url);
    const reqHost = request.headers.get('host');
    if (reqHost && reqHost.toLowerCase() !== canonical.toLowerCase()) {
      url.host = canonical;
      url.protocol = 'https:';
      return new Response(null, {
        status: 301,
        headers: {Location: url.toString()},
      });
    }
  }

  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: envPublic.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: envPublic.PUBLIC_STORE_DOMAIN,
    },
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);
  // Observability headers (no secrets)
  responseHeaders.set('X-WM-Env', getEnvName());
  responseHeaders.set('X-WM-Store', getStoreDomain());
  responseHeaders.set('X-WM-Build', getBuildSha() || 'local');

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

/** @typedef {import('react-router').LoaderFunctionArgs['context']} RouterContext */
/** @typedef {import('@shopify/hydrogen').HydrogenContext} AppLoadContext */
