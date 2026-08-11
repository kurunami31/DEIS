import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { api, authHeaders, createTestStudent, cleanupTestData, loginAsTestStudent } from './helpers.js';

describe('clearance', () => {
  beforeAll(createTestStudent);
  afterAll(cleanupTestData);

  it('creates and returns the student clearance for the active term', async () => {
    const res = await api
      .get('/api/clearances/my')
      .set(authHeaders((await loginAsTestStudent()).body.data.token));
    expect(res.status).toBe(200);
    expect(res.body.data.clearance).toBeTruthy();
    expect(res.body.data.term).toBeTruthy();
    expect(res.body.data.templates.length).toBeGreaterThan(0);
    expect(res.body.data.clearance.signoffs.length).toBe(res.body.data.templates.length);
  });

  it('is idempotent on repeat visits', async () => {
    const token = (await loginAsTestStudent()).body.data.token;
    const first = await api.get('/api/clearances/my').set(authHeaders(token));
    const second = await api.get('/api/clearances/my').set(authHeaders(token));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.clearance.id).toBe(first.body.data.clearance.id);
    expect(second.body.data.clearance.signoffs.length).toBe(first.body.data.clearance.signoffs.length);
  });
});
