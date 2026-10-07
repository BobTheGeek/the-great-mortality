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
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
}

test.describe('core loop', () => {
  test('starts a run and shows the November 1347 map', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/');
    await expect(page.getByTestId('start-screen')).toBeVisible();
    await page.getByTestId('start-run').click();
    await expect(page.getByTestId('map-heading')).toHaveText('November 1347');
    await expect(page.getByTestId('map-subheading')).toContainText('All Saints · month 1 of 18');
    await expect(page.getByTestId('treasury')).toContainText('3,000');
    await expect(page.getByTestId('decree-slots')).toContainText('2 of 2');
    await expect(page.getByTestId('unrest-word')).toContainText('quiet streets');
    await expect(page.getByTestId('unrest-value')).toContainText('10 of 100');
    expect(problems).toEqual([]);
  });

  test('issues a region decree, lifts it, and spends decree slots', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/');
    await page.getByTestId('start-run').click();

    const holdShips = page.getByTestId('decree-hold-ships');
    await holdShips.click();
    await expect(holdShips).toContainText('ACTIVE');
    await expect(holdShips).toContainText('In force · tap to lift');
    await expect(page.getByTestId('decree-slots')).toContainText('1 of 2');

    await holdShips.click();
    await expect(holdShips).not.toContainText('ACTIVE');
    await expect(page.getByTestId('decree-slots')).toContainText('1 of 2');
    expect(problems).toEqual([]);
  });

  test('issues a town decree through selection, the map, and the confirm sheet', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/');
    await page.getByTestId('start-run').click();

    await page.getByTestId('decree-seal-roads').click();
    await expect(page.getByTestId('decree-seal-roads')).toContainText('Now tap a town on the map.');
    await page.locator('#town-portoreale').click();
    await expect(page.getByTestId('sheet-confirm')).toBeVisible();
    await page.getByTestId('confirm-issue').click();
    await expect(page.getByTestId('sheet-confirm')).toBeHidden();
    await expect(page.getByTestId('decree-seal-roads')).toContainText('ACTIVE');
    await expect(page.getByTestId('decree-slots')).toContainText('1 of 2');
    expect(problems).toEqual([]);
  });

  test('ends the month, shows the report, and returns to a new month', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/');
    await page.getByTestId('start-run').click();

    await page.getByTestId('end-month').click();
    await expect(page.getByTestId('sheet-report')).toBeVisible();
    await expect(page.getByTestId('sheet-report')).toContainText('The chronicle of the region');
    await expect(page.getByTestId('sheet-report')).toContainText('MONTH 1 OF 18');
    await expect(page.getByTestId('sheet-report')).toContainText('November, the year of our Lord 1347');
    await page.getByTestId('report-next').click();
    await expect(page.getByTestId('sheet-report')).toBeHidden();
    await expect(page.getByTestId('map-heading')).toHaveText('December 1347');
    expect(problems).toEqual([]);
  });

  test('opens a town detail and returns to the ledger', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/');
    await page.getByTestId('start-run').click();

    await page.locator('#town-santa-lucia').click();
    await expect(page.getByTestId('town-detail')).toBeVisible();
    await expect(page.getByTestId('town-detail')).toContainText('Living');
    await expect(page.getByTestId('town-detail')).toContainText('Sick abed');
    await expect(page.getByTestId('town-detail')).toContainText('Buried');
    await expect(page.getByTestId('town-detail')).toContainText('MARKET TOWN');
    await page.getByTestId('back-to-ledger').click();
    await expect(page.getByTestId('town-detail')).toBeHidden();
    await expect(page.getByTestId('decree-slots')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('pauses the ledger', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/');
    await page.getByTestId('start-run').click();

    await page.getByTestId('pause').click();
    await expect(page.getByTestId('sheet-paused')).toBeVisible();
    await page.getByTestId('paused-close').click();
    await expect(page.getByTestId('sheet-paused')).toBeHidden();
    expect(problems).toEqual([]);
  });
});

test.describe('milestone screenshots', () => {
  for (const size of [
    { name: 'landscape', width: 1180, height: 820 },
    { name: 'portrait', width: 820, height: 1180 },
  ]) {
    test(`captures the core loop at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      mkdirSync('screenshots/milestone-2', { recursive: true });
      await page.goto('/');
      await page.getByTestId('start-run').click();
      await page.getByTestId('decree-hold-ships').click();
      await page.screenshot({ path: `screenshots/milestone-2/${size.name}-map.png` });

      await page.getByTestId('end-month').click();
      await expect(page.getByTestId('sheet-report')).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-2/${size.name}-report.png` });
      await page.getByTestId('report-next').click();
      await settle(page);

      await page.locator('#town-portoreale').click();
      await expect(page.getByTestId('town-detail')).toBeVisible();
      await page.screenshot({ path: `screenshots/milestone-2/${size.name}-town.png` });
    });
  }
});
