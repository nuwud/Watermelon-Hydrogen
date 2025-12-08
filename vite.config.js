import {defineConfig} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {reactRouter} from '@react-router/dev/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    hydrogen(),
    oxygen(),
    reactRouter({
      presets: [hydrogenPreset()],
    }),
    tsconfigPaths(),
  ],
  build: {
    // Allow a strict Content-Security-Policy
    // withtout inlining assets as base64:
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1000, // Increase warning limit for Three.js
  },
  ssr: {
    // Exclude three.js and gsap from SSR bundle - they cause global scope issues in Workers
    // These libraries should only run on the client via dynamic imports
    external: ['three', 'gsap'],
    optimizeDeps: {
      /**
       * Include dependencies here if they throw CJS<>ESM errors.
       * For example, for the following error:
       *
       * > ReferenceError: module is not defined
       * >   at /Users/.../node_modules/example-dep/index.js:1:1
       *
       * Include 'example-dep' in the array below.
       * @see https://vitejs.dev/config/dep-optimization-options
       */
      include: [],
    },
  },
});
