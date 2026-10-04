import type { E2EConfig } from 'e2e';
import { chatgpt } from 'e2e/oauth/chatgpt';
import { web } from '@e2e-dev/web';

export default {
  tests: 'tests/e2e/**/*.e2e.ts',
  // Generous budget: the local backend verifies tokens without the Admin SDK
  // (per-request fallback) and AI generation endpoints take minutes.
  timeout: 600_000,
  // Locator assertions poll slowly here: authed backend reads take seconds.
  assertionTimeout: 60_000,
  targets: [
    {
      engine: web(),
      app: {
        url: 'http://127.0.0.1:5173',
        command: {
          executable: 'node',
          args: ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
          env: { VITE_API_URL: 'http://127.0.0.1:8000', VITE_ENABLE_SW_IN_DEV: 'true' },
          log: '.e2e/logs/app.log',
        },
      },
    },
  ],
  agents: {
    default: {
      model: chatgpt('gpt-6-luna'),
      system: 'You are a careful MathPulse QA agent. Use the visible labels and verify each requested screen state without changing unrelated data.',
      context: 'This app serves Filipino Senior High School students. IAR refers to the Initial Assessment and placement workflow. Modules contains AI-generated RAG lessons. Quiz Battle is the student multiplayer quiz feature.',
    },
  },
  credentials: {
    student: {
      username: process.env.E2E_USER_STUDENT_USERNAME ?? '',
      password: () => process.env.E2E_USER_STUDENT_PASSWORD ?? '',
    },
    teacher: {
      username: process.env.E2E_USER_TEACHER_USERNAME ?? '',
      password: () => process.env.E2E_USER_TEACHER_PASSWORD ?? '',
    },
    admin: {
      username: process.env.E2E_USER_ADMIN_USERNAME ?? '',
      password: () => process.env.E2E_USER_ADMIN_PASSWORD ?? '',
    },
  },
} satisfies E2EConfig;
