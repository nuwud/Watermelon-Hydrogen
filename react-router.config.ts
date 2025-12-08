import type {Config} from '@react-router/dev/config';

export default {
  // Hydrogen handles route configuration via vite plugin preset
  appDirectory: 'app',
  ssr: true,
} satisfies Config;
