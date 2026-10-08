import type { E2EConfig } from 'e2e';
import { chatgpt } from 'e2e/oauth/chatgpt';
import { web } from '@e2e-dev/web';

export default {
  tests: 'tests/e2e/**/*.e2e.ts',
  targets: [
    {
      engine: web(),
      app: {
        url: 'http://127.0.0.1:5173',
        command: {
          executable: 'node',
          args: ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
          env: { VITE_API_URL: 'http://127.0.0.1:8000' },
          log: '.e2e/logs/app.log',
          // A cold Vite start transforms the whole app on the first request, which can exceed the 60 s default.
          startupTimeout: 180_000,
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
    student2: {
      username: process.env.E2E_USER_STUDENT2_USERNAME ?? '',
      password: () => process.env.E2E_USER_STUDENT2_PASSWORD ?? '',
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
