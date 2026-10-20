import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

function trackProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('favicon')) {
      problems.push(message.text());
    }
  });
  return problems;
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming()?.iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
}

async function dismissA2hs(page: Page): Promise<void> {
  await expect(page.getByTestId('splash')).toHaveCount(0);
  await page.getByTestId('a2hs-later').click(); // warns once
  await page.getByTestId('a2hs-later').click(); // dismisses
}

async function startSeeded(page: Page, seed = 1000): Promise<void> {
  await page.goto(`/?seed=${seed}`);
  await dismissA2hs(page);
  await page.getByTestId('opening-skip').click();
  await page.getByTestId('name-0').click();
}

async function openDev(page: Page): Promise<void> {
  const compass = page.getByTestId('compass');
  for (let i = 0; i < 7; i++) {
    await compass.click();
  }
  await expect(page.getByTestId('sheet-dev')).toBeVisible();
}

test.describe('install and backup', () => {
  test('shows the add to home screen hint and remembers the dismissal', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/');
    await expect(page.getByTestId('splash')).toHaveCount(0);
    await expect(page.getByTestId('a2hs')).toBeVisible();
    await expect(page.getByTestId('a2hs')).toContainText('Put the ledger on your shelf');
    await expect(page.getByTestId('a2hs')).toContainText('Add to Home Screen');

    await page.getByTestId('a2hs-show').click();
    await expect(page.getByTestId('a2hs')).toContainText('Share button');
    await page.getByTestId('a2hs-done').click();
    await expect(page.getByTestId('a2hs')).toContainText('tap Share');

    await page.getByTestId('a2hs-later').click();
    await expect(page.getByTestId('a2hs-warn')).toContainText('carry over to the home-screen app');
    await page.getByTestId('a2hs-later').click();
    await expect(page.getByTestId('a2hs')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('a2hs')).toHaveCount(0);
    await expect(page.getByTestId('opening-line')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('backs up and restores progress with a code', async ({ page }) => {
    const problems = trackProblems(page);
    await startSeeded(page);
    await expect(page.getByTestId('map-heading')).toHaveText('November 1347');

    await page.getByTestId('pause').click();
    await page.getByTestId('copy-code').click();
    const code = await page.getByTestId('code-output').inputValue();
    expect(code.startsWith('TGM1.')).toBe(true);
    expect(code.length).toBeGreaterThan(80);

    await page.getByTestId('restore-open').click();
    await page.getByTestId('code-input').fill('TGM1.deadbeef.notreally');
    await page.getByTestId('restore-code').click();
    await expect(page.getByTestId('code-status')).toContainText('damaged');

    await page.getByTestId('code-input').fill(code);
    await page.getByTestId('restore-code').click();
    await expect(page.getByTestId('code-status')).toContainText('Progress restored');
    await page.getByTestId('paused-close').click();
    await expect(page.getByTestId('continue-run')).toBeVisible();
    await page.getByTestId('continue-run').click();
    await expect(page.getByTestId('map-heading')).toHaveText('November 1347');
    expect(problems).toEqual([]);
  });
});

test.describe('dev mode', () => {
  test('opens from the compass and drives the ledger', async ({ page }) => {
    const problems = trackProblems(page);
    await startSeeded(page);

    await openDev(page);
    await expect(page.getByTestId('dev-seed-current')).toHaveText('1000');

    await page.getByTestId('dev-skip-input').fill('6');
    await page.getByTestId('dev-skip').click();
    await expect(page.getByTestId('dev-note')).toContainText('month 6 of 18');
    await expect(page.getByTestId('dev-towns')).toBeVisible();

    await page.getByTestId('dev-unlock').click();
    await expect(page.getByTestId('dev-note')).toContainText('Unlocked');
    await page.getByTestId('dev-close').click();
    await page.getByTestId('nav-lens').click();
    await expect(page.getByTestId('lens-legend')).toBeVisible();
    await page.getByTestId('close-lens').click();

    await openDev(page);
    await page.getByTestId('dev-event-fear-and-blame').click();
    await expect(page.getByTestId('sheet-event')).toContainText('A crowd at the well');
    await page.getByTestId('event-read').click();
    await expect(page.getByTestId('chronicle-page')).toContainText('Fear and Blame');
    await page.getByTestId('tab-map').click();
    await expect(page.getByTestId('map-heading')).toBeVisible();

    await openDev(page);
    await page.getByTestId('dev-harness').click();
    await expect(page.getByTestId('dev-harness-table')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('dev-harness-table')).toContainText('Survives');
    await expect(page.getByTestId('dev-harness-table')).toContainText('smart');
    expect(problems).toEqual([]);
  });

  test('runs a seeded game from the dev sheet', async ({ page }) => {
    const problems = trackProblems(page);
    await startSeeded(page, 7);
    await openDev(page);
    await page.getByTestId('dev-seed-input').fill('424242');
    await page.getByTestId('dev-new-seed').click();
    await expect(page.getByTestId('opening-title')).toBeVisible();
    await page.getByTestId('name-0').click();
    await expect(page.getByTestId('map-heading')).toHaveText('November 1347');
    await page.getByTestId('pause').click();
    await page.getByTestId('paused-close').click();
    await openDev(page);
    await expect(page.getByTestId('dev-seed-current')).toHaveText('424242');
    expect(problems).toEqual([]);
  });
});

test.describe('milestone 5 screenshots', () => {
  for (const size of [
    { name: 'landscape', width: 1180, height: 820 },
    { name: 'portrait', width: 820, height: 1180 },
  ]) {
    test(`captures the install and settings screens at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      mkdirSync('screenshots/milestone-5', { recursive: true });

      await page.goto('/');
      await expect(page.getByTestId('splash')).toHaveCount(0);
      await expect(page.getByTestId('a2hs')).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-5/${size.name}-a2hs.png` });

      await dismissA2hs(page);
      await page.getByTestId('opening-skip').click();
      await page.getByTestId('name-0').click();
      await page.getByTestId('pause').click();
      await page.getByTestId('copy-code').click();
      await expect(page.getByTestId('code-output')).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-5/${size.name}-paused.png` });

      await page.getByTestId('paused-close').click();
      await openDev(page);
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-5/${size.name}-dev.png` });
    });
  }
});

test.describe('milestone 5 splash', () => {
  test.use({ javaScriptEnabled: false });

  for (const size of [
    { name: 'landscape', width: 1180, height: 820 },
    { name: 'portrait', width: 820, height: 1180 },
  ]) {
    test(`captures the splash at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      mkdirSync('screenshots/milestone-5', { recursive: true });
      await page.goto('/');
      await expect(page.getByTestId('splash')).toBeVisible();
      await page.screenshot({ path: `screenshots/milestone-5/${size.name}-splash.png` });
    });
  }
});
