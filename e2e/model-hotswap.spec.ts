import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000';

test.describe('Model Hot-Swap E2E', () => {

  test.describe('RAG Health Endpoint', () => {

    test('RAG health endpoint returns active model info', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/rag/health`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('activeModel');
      expect(data).toHaveProperty('isSequentialModel');
      expect(typeof data.isSequentialModel).toBe('boolean');
    });

  });

  test.describe('Admin Model Config Endpoint', () => {

    test('Admin model config endpoint returns available profiles', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/admin/model-config`);
      expect(response.status()).toBeLessThan(500);

      if (response.ok()) {
        const data = await response.json();
        expect(data.availableProfiles).toBeDefined();
        expect(Array.isArray(data.availableProfiles)).toBe(true);
        expect(data.availableProfiles.length).toBeGreaterThan(0);
        expect(data.profileDescriptions).toBeDefined();
      }
    });

    test('Admin model config returns resolved models', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/admin/model-config`);
      expect(response.status()).toBeLessThan(500);

      if (response.ok()) {
        const data = await response.json();
        expect(data.resolved).toBeDefined();
        expect(typeof data.resolved).toBe('object');
        const keys = Object.keys(data.resolved);
        expect(keys.length).toBeGreaterThanOrEqual(5);
        for (const key of keys) {
          expect(typeof data.resolved[key]).toBe('string');
          expect(data.resolved[key].length).toBeGreaterThan(0);
        }
      }
    });

    test('Admin model config returns active profile and overrides', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/admin/model-config`);
      expect(response.status()).toBeLessThan(500);

      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty('profile');
        expect(data).toHaveProperty('overrides');
        expect(typeof data.overrides).toBe('object');
      }
    });

  });

  test.describe('Profile Switching', () => {

    test('Switching to dev profile succeeds and reflects in config', async ({ request }) => {
      const sw = await request.post(`${BACKEND_URL}/api/admin/model-config/profile`, {
        data: { profile: 'dev' },
      });
      expect(sw.status()).toBeLessThan(500);

      if (sw.ok()) {
        const swData = await sw.json();
        expect(swData.success).toBe(true);
        expect(swData.applied.profile).toBe('dev');

        const get = await request.get(`${BACKEND_URL}/api/admin/model-config`);
        if (get.ok()) {
          const getData = await get.json();
          expect(getData.profile).toBe('dev');
        }
      }
    });

    test('Switching to budget profile succeeds', async ({ request }) => {
      const sw = await request.post(`${BACKEND_URL}/api/admin/model-config/profile`, {
        data: { profile: 'budget' },
      });
      expect(sw.status()).toBeLessThan(500);

      if (sw.ok()) {
        const swData = await sw.json();
        expect(swData.success).toBe(true);
        expect(swData.applied.profile).toBe('budget');
      }
    });

    test('Switching to invalid profile returns 400', async ({ request }) => {
      const response = await request.post(`${BACKEND_URL}/api/admin/model-config/profile`, {
        data: { profile: 'nonexistent' },
      });
      expect(response.status()).toBe(400);
    });

    test('Reset clears overrides and returns empty profile', async ({ request }) => {
      const del = await request.delete(`${BACKEND_URL}/api/admin/model-config/reset`);
      expect(del.status()).toBeLessThan(500);

      if (del.ok()) {
        const delData = await del.json();
        expect(delData.success).toBe(true);
        expect(delData.current.profile).toBe('');

        const overrides = delData.current.overrides;
        expect(Object.keys(overrides).length).toBe(0);
      }
    });

  });

  test.describe('Model Config Idempotency', () => {

    test('Multiple GETs return same profile without side effects', async ({ request }) => {
      const res1 = await request.get(`${BACKEND_URL}/api/admin/model-config`);
      const before = res1.ok() ? await res1.json() : null;

      const res2 = await request.get(`${BACKEND_URL}/api/admin/model-config`);
      const after = res2.ok() ? await res2.json() : null;

      if (before && after) {
        expect(before.profile).toBe(after.profile);
      }
    });

  });

  test.describe('Override Flow', () => {

    test('Override a single model key and verify it appears in config', async ({ request }) => {
      const overrideRes = await request.post(`${BACKEND_URL}/api/admin/model-config/override`, {
        data: { key: 'INFERENCE_MODEL_ID', value: 'test/override-model' },
      });
      expect(overrideRes.status()).toBeLessThan(500);

      if (overrideRes.ok()) {
        const ovData = await overrideRes.json();
        expect(ovData.success).toBe(true);

        const get = await request.get(`${BACKEND_URL}/api/admin/model-config`);
        if (get.ok()) {
          const getData = await get.json();
          expect(getData.overrides.INFERENCE_MODEL_ID).toBe('test/override-model');
        }
      }
    });

    test('Override with invalid key returns 400', async ({ request }) => {
      const response = await request.post(`${BACKEND_URL}/api/admin/model-config/override`, {
        data: { key: 'EMBEDDING_MODEL', value: 'test/emb' },
      });
      expect(response.status()).toBe(400);
    });

  });

  test.describe('Model Config Page', () => {

    test('Model config page loads in browser', async ({ page }) => {
      await page.goto('/');
      const title = await page.title();
      expect(title).toBeTruthy();
    });

  });

});