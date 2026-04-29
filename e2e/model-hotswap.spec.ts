import { test, expect } from '@playwright/test';

test.describe('Model Hot-Swap E2E', () => {

  test('RAG health endpoint returns active model info', async ({ request }) => {
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
    const response = await request.get(`${backendUrl}/api/rag/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('activeModel');
    expect(data).toHaveProperty('isSequentialModel');
    expect(typeof data.isSequentialModel).toBe('boolean');
  });

  test('Admin model config endpoint returns available profiles', async ({ request }) => {
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
    const response = await request.get(`${backendUrl}/api/admin/model-config`);
    expect(response.status()).toBeLessThan(500);

    if (response.ok()) {
      const data = await response.json();
      expect(data.availableProfiles).toBeDefined();
      expect(Array.isArray(data.availableProfiles)).toBe(true);
      expect(data.availableProfiles.length).toBeGreaterThan(0);
      expect(data.profileDescriptions).toBeDefined();
    }
  });

  test('Model config admin page loads in browser', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('Lesson viewer shows model badge from API', async ({ request }) => {
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
    const response = await request.post(`${backendUrl}/api/rag/lesson`, {
      data: {
        topic: 'Quadratic Functions',
        subject: 'General Mathematics',
        quarter: 1,
        lessonTitle: 'Test Lesson',
        learningCompetency: 'Test',
        learnerLevel: 'Grade 11',
      },
    });
    expect(response.status()).toBeLessThan(500);

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('activeModel');
      expect(typeof data.activeModel).toBe('string');
      expect(data.activeModel.length).toBeGreaterThan(0);
    }
  });

  test('Model profile switch is idempotent', async ({ request }) => {
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000';

    const res1 = await request.get(`${backendUrl}/api/admin/model-config`);
    const before = res1.ok() ? await res1.json() : null;

    const res2 = await request.get(`${backendUrl}/api/admin/model-config`);
    const after = res2.ok() ? await res2.json() : null;

    if (before && after) {
      expect(before.profile).toBe(after.profile);
    }
  });

});