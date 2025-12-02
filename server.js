// Virtual entry point for the app
// @ts-ignore - virtual module provided by Vite/Remix Hydrogen
import * as remixBuild from 'virtual:remix/server-build';
import {storefrontRedirect} from '@shopify/hydrogen';
import {createRequestHandler} from '@shopify/remix-oxygen';
import {createAppLoadContext} from '~/lib/context';

/**
 * Export a fetch handler in module format.
 */
export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} executionContext
   * @return {Promise<Response>}
   */
  async fetch(request, env, executionContext) {
    try {
      const loadContextPromise = createAppLoadContext(
        request,
        env,
        executionContext,
      );

      /**
       * Create a Remix request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      const handleRequest = createRequestHandler({
        build: remixBuild,
        mode: env.NODE_ENV ?? process.env.NODE_ENV,
        getLoadContext: () => loadContextPromise,
      });

      const response = await handleRequest(request);
      const appLoadContext = await loadContextPromise;

      if (appLoadContext.session.isPending) {
        response.headers.set(
          'Set-Cookie',
          await appLoadContext.session.commit(),
        );
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({
          request,
          response,
          storefront: appLoadContext.storefront,
        });
      }

      return response;
    } catch (error) {
      console.error('Server error:', error);
      // Return more details in development, generic message in production
      const isDev = env?.NODE_ENV !== 'production';
      const errorMessage = isDev 
        ? `Server Error: ${error.message}\n\nStack: ${error.stack}`
        : 'An unexpected error occurred';
      return new Response(errorMessage, {
        status: 500,
        headers: {'Content-Type': 'text/plain'},
      });
    }
  },
};
