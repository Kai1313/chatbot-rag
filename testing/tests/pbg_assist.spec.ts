import { test, expect } from '@playwright/test';

test.describe('PBG Assist Frontend & E2E Tests', () => {

  test('1. Should render the homepage, header, voice buttons, and initial welcome message', async ({ page }) => {
    await page.goto('/');
    
    // Check Header title
    await expect(page.locator('h1')).toContainText('PBG Assist');
    
    // Check voice mute/unmute toggle in header
    const voiceToggleBtn = page.getByTitle(/Auto-Voice/i);
    await expect(voiceToggleBtn).toBeVisible();

    // Check reset conversation button
    const resetBtn = page.getByTitle('Reset Percakapan');
    await expect(resetBtn).toBeVisible();

    // Check initial welcome message from assistant
    await expect(page.getByText('Selamat datang di PBG Assist!')).toBeVisible();
    
    // Check initial "Dengarkan" speaker button on welcome message
    await expect(page.getByRole('button', { name: /Dengarkan/i })).toBeVisible();

    // Check Quick Prompt suggestion buttons
    await expect(page.getByRole('button', { name: /Syarat PBG Rumah Tinggal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cek Status No. 108564/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Buka Dokumen No. 6680/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /PBG Usaha Mikro/i })).toBeVisible();

    // Check Microphone voice input button in footer
    const micBtn = page.getByTitle(/Klik untuk bicara/i);
    await expect(micBtn).toBeVisible();
  });

  test('2. Should send a requirements question and receive RAG response with Dengarkan trigger', async ({ page }) => {
    await page.goto('/');
    
    // Click quick prompt for Syarat PBG Rumah Tinggal
    const quickPrompt = page.getByRole('button', { name: /Syarat PBG Rumah Tinggal/i });
    await quickPrompt.click();

    // User message should be visible in chat
    await expect(page.getByText('Apa saja dokumen persyaratan pengurusan PBG Rumah Tinggal Sederhana?')).toBeVisible();

    // Wait for assistant response in main chat
    const chatContainer = page.locator('main');
    await expect(chatContainer).toContainText(/persyaratan|dokumen|tanah|pbg/i, { timeout: 35000 });

    // Verify "Dengarkan" speaker button is present on the assistant responses
    const listenButtons = page.getByRole('button', { name: /Dengarkan/i });
    await expect(listenButtons.last()).toBeVisible({ timeout: 35000 });
  });

  test('3. Should check status for registration number 108564 (Transaksi2)', async ({ page }) => {
    await page.goto('/');

    // Click quick prompt for Cek Status No. 108564
    const statusPrompt = page.getByRole('button', { name: /Cek Status No. 108564/i });
    await statusPrompt.click();

    // Chat should receive and display status details for 108564
    const chatContainer = page.locator('main');
    await expect(chatContainer).toContainText(/108564/i, { timeout: 35000 });
  });

  test('4. Should open document vault for registration number 6680 and render clickable links', async ({ page }) => {
    await page.goto('/');

    // Click quick prompt for Buka Dokumen No. 6680
    const docPrompt = page.getByRole('button', { name: /Buka Dokumen No. 6680/i });
    await docPrompt.click();

    // Chat should receive document links for 6680
    const chatContainer = page.locator('main');
    await expect(chatContainer).toContainText(/6680/i, { timeout: 35000 });

    // Verify presence of clickable document link with proper timeout
    const docLink = page.locator('a[href*="/storage/documents/6680/"]');
    await expect(docLink.first()).toBeVisible({ timeout: 35000 });
  });

  test('5. Should handle reset conversation button cleanly', async ({ page }) => {
    await page.goto('/');

    // Click quick prompt to populate chat
    const quickPrompt = page.getByRole('button', { name: /Syarat PBG Rumah Tinggal/i });
    await quickPrompt.click();

    // User message should appear in chat
    await expect(page.getByText('Apa saja dokumen persyaratan pengurusan PBG Rumah Tinggal Sederhana?')).toBeVisible();

    // Click reset button
    const resetBtn = page.getByTitle('Reset Percakapan');
    await resetBtn.click();

    // Verify only the initial welcome message is shown and previous query is cleared
    await expect(page.getByText('Selamat datang di PBG Assist!')).toBeVisible();
    await expect(page.getByText('Apa saja dokumen persyaratan pengurusan PBG Rumah Tinggal Sederhana?')).not.toBeVisible();
  });

});
