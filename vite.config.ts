import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const CSS_PROBE_ENV = 'VITE_CSS_TIMING_PROBE';
const CSS_PROBE_THRESHOLD_MS = 25;

const isCssResource = (id: string) => /\.(css|pcss|postcss|scss|sass|less|styl|stylus)(?:$|\?)/.test(id);

const normalizeIdForLog = (id: string) => {
  const withoutQuery = id.split('?')[0] ?? id;
  return withoutQuery.replace(/\\/g, '/');
};

const createCssTimingProbePlugins = (): Plugin[] => {
  if (process.env[CSS_PROBE_ENV] !== '1') {
    return [];
  }

  const cssProbePlugin: Plugin = {
    name: 'mathpulse-css-probe',
    apply: 'serve',
    configureServer(server) {
      const originalTransformRequest = server.transformRequest.bind(server);
      server.transformRequest = (async (url, options) => {
        const target = String(url);
        if (!isCssResource(target)) {
          return originalTransformRequest(url, options);
        }

        const transformStart = performance.now();
        try {
          return await originalTransformRequest(url, options);
        } finally {
          const transformDuration = performance.now() - transformStart;
          if (transformDuration >= CSS_PROBE_THRESHOLD_MS) {
            console.log(`[css-probe][transformRequest] ${normalizeIdForLog(target)} ${transformDuration.toFixed(2)}ms`);
          }
        }
      }) as typeof server.transformRequest;

      const pluginContainer = server.pluginContainer as {
        transform: (code: string, id: string, options?: unknown) => Promise<unknown>;
      };
      const originalPluginTransform = pluginContainer.transform.bind(pluginContainer);
      pluginContainer.transform = (async (code, id, options) => {
        if (!isCssResource(id)) {
          return originalPluginTransform(code, id, options);
        }

        const transformStart = performance.now();
        try {
          return await originalPluginTransform(code, id, options);
        } finally {
          const transformDuration = performance.now() - transformStart;
          if (transformDuration >= CSS_PROBE_THRESHOLD_MS) {
            console.log(`[css-probe][plugin-transform] ${normalizeIdForLog(id)} ${transformDuration.toFixed(2)}ms`);
          }
        }
      }) as typeof pluginContainer.transform;

      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (!url.endsWith('.css')) {
          next();
          return;
        }

        const requestStart = performance.now();
        res.on('finish', () => {
          const duration = performance.now() - requestStart;
          if (duration >= CSS_PROBE_THRESHOLD_MS) {
            console.log(`[css-probe][request] ${url} ${duration.toFixed(2)}ms status=${res.statusCode}`);
          }
        });

        next();
      });
    },
  };

  console.log(`[css-probe] enabled via ${CSS_PROBE_ENV}=1`);
  return [cssProbePlugin];
};

const cssTimingProbePlugins = createCssTimingProbePlugins();

export default defineConfig({
  plugins: [...cssTimingProbePlugins, react(), tailwindcss()],
  optimizeDeps: {
    // Keep this list narrow to avoid over-bundling on startup.
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'firebase/analytics',
      'motion/react',
      'lucide-react',
      'sonner',
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('react-markdown') ||
            id.includes('remark-math') ||
            id.includes('rehype-katex') ||
            id.includes('katex')
          ) {
            return 'vendor-markdown';
          }

          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
            return 'vendor-react';
          }

          if (/node_modules\/(?:firebase|@firebase)\/auth/.test(id)) {
            return 'vendor-firebase-auth';
          }

          if (/node_modules\/(?:firebase|@firebase)\/firestore/.test(id)) {
            return 'vendor-firebase-firestore';
          }

          if (/node_modules\/(?:firebase|@firebase)\/storage/.test(id)) {
            return 'vendor-firebase-storage';
          }

          if (/node_modules\/(?:firebase|@firebase)\/analytics/.test(id)) {
            return 'vendor-firebase-analytics';
          }

          if (id.includes('firebase') || id.includes('@firebase')) {
            return 'vendor-firebase-core';
          }

          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
    warmup: {
      // Warm only frequent app-entry files to avoid startup overload.
      clientFiles: ['./src/main.tsx', './src/App.tsx', './src/contexts/AuthContext.tsx'],
    },
  },
});