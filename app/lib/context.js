import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import {getLocaleFromRequest} from '~/lib/i18n';
import {getEnvServer} from '~/utils/env.server';

/**
 * The context implementation is separate from server.ts
 * so that type can be extracted for AppLoadContext
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} executionContext
 */
export async function createAppLoadContext(request, env, executionContext) {
  /**
   * Open a cache instance in the worker and a custom session instance.
   */
  const serverEnv = getEnvServer(env);

  const waitUntil = executionContext?.waitUntil?.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [serverEnv.SESSION_SECRET]),
  ]);

  // Defer reading public env until runtime to avoid MiniOxygen pre-injection errors
  const {getEnvPublic} = await import('~/utils/env.public');
  const envPublic = getEnvPublic();

  const hydrogenContext = createHydrogenContext({
    env,
    request,
    cache,
    waitUntil,
    session,
    i18n: getLocaleFromRequest(request),
    storefrontApiVersion: envPublic.PUBLIC_STOREFRONT_API_VERSION,
    cart: {
      queryFragment: CART_QUERY_FRAGMENT,
    },
  });

  return {
    ...hydrogenContext,
    env: serverEnv,
    rawEnv: env,
  };
}
