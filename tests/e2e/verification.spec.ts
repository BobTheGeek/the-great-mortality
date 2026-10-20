import { expect, test, type Page } from '@playwright/test';
import { execSync, spawn } from 'node:child_process';
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
  if (await page.getByTestId('a2hs').count()) {
    await page.getByTestId('a2hs-later').click();
    await page.getByTestId('a2hs-later').click();
  }
}

const IPADS = [
  { name: 'mini', width: 1133, height: 744 },
  { name: 'eleven', width: 1180, height: 820 },
  { name: 'pro', width: 1366, height: 1024 },
];

const ORIENTATIONS: ('landscape' | 'portrait')[] = ['landscape', 'portrait'];

test.describe('ipad pass', () => {
  for (const ipad of IPADS) {
    for (const orientation of ORIENTATIONS) {
      const width = orientation === 'landscape' ? ipad.width : ipad.height;
      const height = orientation === 'landscape' ? ipad.height : ipad.width;

      test(`full journey on the ${ipad.name} ipad, ${orientation}`, async ({ page }) => {
        const problems = trackProblems(page);
        await page.setViewportSize({ width, height });

        // Opening → title → name.
        await page.goto('/?seed=1000');
        await expect(page.getByTestId('splash')).toHaveCount(0);
        await expect(page.getByTestId('opening-line')).toHaveText('Twelve galleys from the Black Sea.');
        await dismissA2hs(page);
        await page.getByTestId('opening-skip').click();
        await page.getByTestId('name-0').click();
        if (await page.getByTestId('sheet-howto').count()) {
          await page.getByTestId('howto-close').click();
        }

        // First month.
        await expect(page.getByTestId('map-heading')).toHaveText('November 1347');
        await expect(page.getByTestId('decree-slots')).toContainText('2 of 2');

        // Fontenera stays fully visible inside the map leaf.
        const mapBox = (await page.getByTestId('map-host').boundingBox())!;
        const fontenera = (await page.locator('#town-fontenera').boundingBox())!;
        expect(fontenera.x, 'fontenera left').toBeGreaterThanOrEqual(mapBox.x - 1);
        expect(fontenera.y, 'fontenera top').toBeGreaterThanOrEqual(mapBox.y - 1);
        expect(fontenera.x + fontenera.width, 'fontenera right').toBeLessThanOrEqual(
          mapBox.x + mapBox.width + 1,
        );
        expect(fontenera.y + fontenera.height, 'fontenera bottom').toBeLessThanOrEqual(
          mapBox.y + mapBox.height + 1,
        );

        // The page body never scrolls.
        const scroll = await page.evaluate(() => ({
          overflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
          body: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        expect(scroll.overflow, 'vertical overflow').toBeLessThanOrEqual(1);
        expect(scroll.body, 'horizontal overflow').toBeLessThanOrEqual(1);

        // Touch targets at least 44 pt.
        for (const testid of ['pause', 'end-month', 'nav-evidence', 'decree-hold-ships']) {
          const box = (await page.getByTestId(testid).boundingBox())!;
          expect(box.height, testid).toBeGreaterThanOrEqual(43.5);
        }

        // Evidence Board verdict states.
        await page.getByTestId('nav-evidence').click();
        await page.getByTestId('theory-q1-east').click();
        await expect(page.getByTestId('sheet-verdict')).toContainText('Not yet');
        await page.getByTestId('verdict-close').click();
        await page.getByTestId('theory-q1-air').click();
        await expect(page.getByTestId('sheet-verdict')).toContainText('The clues');
        await expect(page.getByTestId('verdict-noclue')).toBeVisible();
        await page.getByTestId('verdict-close').click();

        // End screen.
        await page.getByTestId('tab-map').click();
        await page.getByTestId('decree-flee').click();
        await page.getByTestId('confirm-issue').click();
        await page.getByTestId('confirm-issue').click();
        for (let guard = 0; guard < 6; guard++) {
          if (await page.getByTestId('earned-moment').count()) {
            await page.getByTestId('earned-keep').click();
            continue;
          }
          break;
        }
        await expect(page.getByTestId('end-screen')).toContainText('the Fled');
        await page.getByTestId('ending-reckoning').click();
        await expect(page.getByTestId('reckoning')).toBeVisible();
        expect(problems).toEqual([]);
      });
    }
  }
});

test.describe('milestone 6 screenshots', () => {
  for (const ipad of IPADS) {
    for (const orientation of ORIENTATIONS) {
      const width = orientation === 'landscape' ? ipad.width : ipad.height;
      const height = orientation === 'landscape' ? ipad.height : ipad.width;

      test(`captures the map on the ${ipad.name} ipad, ${orientation}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        mkdirSync('screenshots/milestone-6', { recursive: true });
        await page.goto('/?seed=1007');
        await expect(page.getByTestId('splash')).toHaveCount(0);
        await dismissA2hs(page);
        await page.getByTestId('opening-skip').click();
        await page.getByTestId('name-0').click();
        if (await page.getByTestId('sheet-howto').count()) {
          await page.getByTestId('howto-close').click();
        }
        await page.getByTestId('decree-hold-ships').click();
        await expect(page.getByTestId('decree-hold-ships')).toContainText('ACTIVE');
        await settle(page);
        await page.screenshot({
          path: `screenshots/milestone-6/${ipad.name}-${orientation}.png`,
        });
      });
    }
  }
});

test.describe('service worker editions', () => {
  test('offers the new edition and reloads on request', async ({ page }) => {
    test.setTimeout(150_000);
    execSync('npm run build', { stdio: 'ignore' });
    const server = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], {
      stdio: 'ignore',
    });
    try {
      let up = false;
      for (let i = 0; i < 40 && !up; i++) {
        try {
          await page.goto('http://localhost:4174/');
          up = true;
        } catch {
          await page.waitForTimeout(300);
        }
      }
      expect(up).toBe(true);
      await expect(page.getByTestId('start-screen')).toBeVisible({ timeout: 15_000 });
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {
        timeout: 20_000,
      });

      // Ship a new edition while the old one is cached.
      await page.waitForTimeout(1100);
      execSync('npm run build', { stdio: 'ignore' });

      await page.reload();
      await expect(page.getByTestId('edition-toast')).toBeVisible({ timeout: 20_000 });
      await page.getByTestId('edition-reload').click();
      await expect(page.getByTestId('start-screen')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('edition-toast')).toHaveCount(0);
    } finally {
      server.kill();
    }
  });
});
