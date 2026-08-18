import { test, expect } from '@playwright/test';

test.describe('PBG Assist Frontend & API Tests', () => {

  test('1. Should render the homepage and initial welcome message', async ({ page }) => {
    await page.goto('/');
    
    // Check Header title
    await expect(page.locator('h1')).toContainText('PBG Assist');
    
    // Check initial welcome message from assistant
    await expect(page.getByText('Selamat datang di PBG Assist!')).toBeVisible();
    
    // Check Quick Prompt suggestion buttons
    await expect(page.getByRole('button', { name: /Syarat PBG Rumah Tinggal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cek Status No. 6680/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /PBG Usaha Mikro/i })).toBeVisible();
  });

  test('2. Should send a requirements question and receive RAG response', async ({ page }) => {
    await page.goto('/');
    
    // Click quick prompt for Syarat PBG Rumah Tinggal
    const quickPrompt = page.getByRole('button', { name: /Syarat PBG Rumah Tinggal/i });
    await quickPrompt.click();

    // User message should be visible in chat
    await expect(page.getByText('Apa saja dokumen persyaratan pengurusan PBG Rumah Tinggal Sederhana?')).toBeVisible();

    // Wait for assistant response
    const assistantResponses = page.locator('main >> div.items-start');
    await expect(assistantResponses.last()).toContainText(/persyaratan|dokumen|tanah|pbg/i, { timeout: 30000 });
  });

  test('3. Should check status for registration number 108564 (Transaksi2)', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Tanyakan syarat atau masukkan no. berkas...');
    await input.fill('Cek status berkas nomor 108564');
    await input.press('Enter');

    // Assistant should respond with status details for 108564
    const assistantResponses = page.locator('main >> div.items-start');
    await expect(assistantResponses.last()).toContainText(/108564/i, { timeout: 30000 });
  });

  test('4. Should check status for registration number 6680', async ({ page }) => {
    await page.goto('/');

    // Click quick prompt for Cek Status No. 6680
    const statusPrompt = page.getByRole('button', { name: /Cek Status No. 6680/i });
    await statusPrompt.click();

    const assistantResponses = page.locator('main >> div.items-start');
    await expect(assistantResponses.last()).toContainText(/6680/i, { timeout: 30000 });
  });

  test('5. Should handle reset conversation button', async ({ page }) => {
    await page.goto('/');

    // Send a message
    const input = page.getByPlaceholder('Tanyakan syarat atau masukkan no. berkas...');
    await input.fill('Halo');
    await input.press('Enter');

    // Click reset button
    const resetBtn = page.getByTitle('Reset Percakapan');
    await resetBtn.click();

    // Only welcome message should remain
    const messages = page.locator('main >> div.flex.flex-col');
    await expect(messages).toHaveCount(1);
    await expect(page.getByText('Selamat datang di PBG Assist!')).toBeVisible();
  });

});
