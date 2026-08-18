import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

test.describe('PBG Assist Backend API Direct Integration Tests', () => {

  test('1. Health check endpoint should return 200 and healthy DB status', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected');
  });

  test('2. Status lookup for 108564 from Transaksi2 should return record', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/status/108564`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('Ditemukan');
    expect(body.registration_id).toBe('108564');
    expect(body.total_steps).toBeGreaterThan(0);
    expect(body.latest_step).toBeDefined();
  });

  test('3. Chat endpoint should answer requirements queries via RAG', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/chat`, {
      data: {
        message: 'Apa saja syarat PBG Rumah Tinggal Sederhana?',
        history: []
      }
    });
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.reply).toBeDefined();
    expect(body.reply.length).toBeGreaterThan(20);
  });

});
