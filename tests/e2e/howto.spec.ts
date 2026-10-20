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

async function reachTitle(page: Page, seed = 1000): Promise<void> {
  await page.goto(`/?seed=${seed}`);
  await expect(page.getByTestId('splash')).toHaveCount(0);
  await page.getByTestId('a2hs-later').click();
  await page.getByTestId('a2hs-later').click();
  await page.getByTestId('opening-skip').click();
}

test.describe('how to play', () => {
  test('opens on the first game, walks the slides, and stays reachable', async ({ page }) => {
    const problems = trackProblems(page);
    await reachTitle(page);
    await page.getByTestId('name-0').click();

    // First run opens the modal automatically.
    await expect(page.getByTestId('sheet-howto')).toBeVisible();
    await expect(page.getByTestId('sheet-howto')).toContainText('How to play · 1 of 6');
    await expect(page.getByTestId('sheet-howto')).toContainText('Your six towns');
    const image = page.locator('[data-testid="sheet-howto"] .howto-img');
    await expect
      .poll(async () => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(500);

    await page.getByTestId('howto-next').click();
    await expect(page.getByTestId('sheet-howto')).toContainText('Issue decrees');
    await page.getByTestId('howto-back').click();
    await expect(page.getByTestId('sheet-howto')).toContainText('1 of 6');

    for (let i = 0; i < 5; i++) {
      await page.getByTestId('howto-next').click();
    }
    await expect(page.getByTestId('sheet-howto')).toContainText('6 of 6');
    await page.getByTestId('howto-start').click();
    await expect(page.getByTestId('sheet-howto')).toHaveCount(0);
    await expect(page.getByTestId('map-heading')).toHaveText('November 1347');

    // Always reachable on the map.
    await page.getByTestId('howto-open').click();
    await expect(page.getByTestId('sheet-howto')).toBeVisible();
    await page.getByTestId('howto-close').click();
    await expect(page.getByTestId('sheet-howto')).toHaveCount(0);

    // And from the paused sheet.
    await page.getByTestId('pause').click();
    await page.getByTestId('paused-howto').click();
    await expect(page.getByTestId('sheet-howto')).toBeVisible();
    await page.getByTestId('howto-close').click();

    // It does not auto-open again on later visits.
    await page.reload();
    await expect(page.getByTestId('splash')).toHaveCount(0);
    await page.getByTestId('continue-run').click();
    await expect(page.getByTestId('map-heading')).toHaveText('November 1347');
    await expect(page.getByTestId('sheet-howto')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
});

test.describe('howto screenshots', () => {
  for (const size of [
    { name: 'landscape', width: 1180, height: 820 },
    { name: 'portrait', width: 820, height: 1180 },
  ]) {
    test(`captures the how-to modal at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      mkdirSync('screenshots/how-to', { recursive: true });
      await reachTitle(page);
      await page.getByTestId('name-0').click();
      await expect(page.getByTestId('sheet-howto')).toBeVisible();
      await page.waitForTimeout(600);
      await settle(page);
      await page.screenshot({ path: `screenshots/how-to/${size.name}-1.png` });
      for (let i = 0; i < 3; i++) {
        await page.getByTestId('howto-next').click();
      }
      await expect(page.getByTestId('sheet-howto')).toContainText('4 of 6');
      await page.waitForTimeout(600);
      await settle(page);
      await page.screenshot({ path: `screenshots/how-to/${size.name}-4.png` });
    });
  }
});
