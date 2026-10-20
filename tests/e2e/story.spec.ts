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

async function startSeeded(page: Page, seed = 1, nameIndex = 0): Promise<void> {
  await page.goto(`/?seed=${seed}`);
  await expect(page.getByTestId('splash')).toHaveCount(0);
  await page.getByTestId('opening-skip').click();
  await page.getByTestId(`name-${nameIndex}`).click();
  if (await page.getByTestId('sheet-howto').count()) {
    await page.getByTestId('howto-close').click();
  }
}

/**
 * Dismisses report, earned, and advisor sheets until the map returns.
 * Returns true when a scripted event sheet is showing.
 */
async function dismissUntilMapOrEvent(page: Page): Promise<boolean> {
  for (let guard = 0; guard < 30; guard++) {
    if (await page.getByTestId('sheet-report').count()) {
      await page.getByTestId('report-next').click();
      continue;
    }
    if (await page.getByTestId('earned-moment').count()) {
      await page.getByTestId('earned-keep').click();
      continue;
    }
    if (await page.getByTestId('sheet-advisor').count()) {
      await page.getByTestId('advisor-thanks').click();
      continue;
    }
    if (await page.getByTestId('sheet-event').count()) return true;
    return false;
  }
  return false;
}

test.describe('the story', () => {
  test('walks the opening, rerolls the names, and returns for a visit', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/');
    await expect(page.getByTestId('opening-line')).toHaveText('Twelve galleys from the Black Sea.');
    for (let i = 0; i < 4; i++) {
      await page.getByTestId('opening-next').click();
    }
    await expect(page.getByTestId('opening-line')).toHaveText(
      'Driven from Messina, the galleys row north along the coast. Toward your port.',
    );
    await page.getByTestId('opening-next').click();
    await expect(page.getByTestId('opening-title')).toBeVisible();
    await expect(page.getByTestId('opening-title')).toContainText('Choose your name');

    const first = await page.getByTestId('name-0').textContent();
    await page.getByTestId('name-reroll').click();
    const second = await page.getByTestId('name-0').textContent();
    expect(second).not.toBe(first);

    const picked = await page.getByTestId('name-3').textContent();
    await page.getByTestId('name-3').click();
    if (await page.getByTestId('sheet-howto').count()) {
      await page.getByTestId('howto-close').click();
    }
    await expect(page.getByTestId('map-heading')).toHaveText('November 1347');

    await page.reload();
    await expect(page.getByTestId('return-visit')).toBeVisible();
    await expect(page.getByTestId('continue-run')).toContainText(
      `${picked} · November 1347 · 6 towns healthy`,
    );
    await expect(page.getByTestId('return-visit')).toContainText('0 of 4 questions solved');
    await page.getByTestId('continue-run').click();
    await expect(page.getByTestId('map-heading')).toHaveText('November 1347');
    expect(problems).toEqual([]);
  });

  test('meets the advisors and applies an accepted decree next month', async ({ page }) => {
    const problems = trackProblems(page);
    await startSeeded(page, 1000);

    // Month 0 report: the Merchant introduces himself; nothing to lift yet.
    await page.getByTestId('end-month').click();
    await expect(page.getByTestId('sheet-report')).toBeVisible();
    await page.getByTestId('report-next').click();
    await expect(page.getByTestId('sheet-advisor')).toContainText('THE MERCHANT');
    await expect(page.getByTestId('advisor-take')).toHaveCount(0);
    await page.getByTestId('advisor-thanks').click();
    await expect(page.getByTestId('advisor-peek')).toContainText('THE MERCHANT');

    // Month 1 report: the Physician offers to burn herbs.
    await page.getByTestId('end-month').click();
    for (let guard = 0; guard < 12; guard++) {
      if (await page.getByTestId('sheet-report').count()) {
        await page.getByTestId('report-next').click();
        continue;
      }
      if (await page.getByTestId('earned-moment').count()) {
        await page.getByTestId('earned-keep').click();
        continue;
      }
      break;
    }
    await expect(page.getByTestId('sheet-advisor')).toBeVisible();
    await expect(page.getByTestId('sheet-advisor')).toContainText('THE PHYSICIAN');
    await expect(page.getByTestId('advisor-take')).toContainText('Burn herbs');
    await expect(page.getByTestId('advisor-take')).toContainText('ƒ');
    await page.getByTestId('advisor-take').click();
    await expect(page.getByTestId('sheet-advisor')).toBeHidden();
    await expect(page.getByTestId('map-heading')).toHaveText('January 1348');
    await expect(page.getByTestId('decree-slots')).toContainText('1 of 2');
    expect(problems).toEqual([]);
  });

  test('fires Fear and Blame in month 6 and opens the chronicle', async ({ page }) => {
    const problems = trackProblems(page);
    await startSeeded(page, 1);

    let sawEvent = false;
    for (let month = 0; month < 7 && !sawEvent; month++) {
      await page.getByTestId('end-month').click();
      sawEvent = await dismissUntilMapOrEvent(page);
    }
    expect(sawEvent).toBe(true);
    await expect(page.getByTestId('sheet-event')).toContainText('SANTA LUCIA');
    await expect(page.getByTestId('sheet-event')).toContainText('A crowd at the well');
    await expect(page.getByTestId('sheet-event')).toContainText('bookbinder');
    await expect(page.getByTestId('sheet-event')).toContainText('No one is harmed');
    await page.getByTestId('event-read').click();

    // The queue continues (advisor) and then the chronicle opens.
    for (let guard = 0; guard < 10; guard++) {
      if (await page.getByTestId('sheet-advisor').count()) {
        await page.getByTestId('advisor-thanks').click();
        continue;
      }
      if (await page.getByTestId('earned-moment').count()) {
        await page.getByTestId('earned-keep').click();
        continue;
      }
      break;
    }
    await expect(page.getByTestId('chronicle-page')).toContainText('Fear and Blame');
    await page.getByTestId('tab-map').click();
    await expect(page.getByTestId('map-heading')).toHaveText('June 1348');
    expect(problems).toEqual([]);
  });

  test('flees, sees the fled ending, and reckons', async ({ page }) => {
    const problems = trackProblems(page);
    await startSeeded(page, 1000, 1);

    await page.getByTestId('decree-flee').click();
    await expect(page.getByTestId('sheet-confirm')).toContainText('Leave the towns to their fate');
    await page.getByTestId('confirm-issue').click();
    await page.getByTestId('confirm-issue').click();

    await expect(page.getByTestId('earned-moment')).toBeVisible();
    await page.getByTestId('earned-keep').click();
    await expect(page.getByTestId('end-screen')).toBeVisible();
    await expect(page.getByTestId('end-screen')).toContainText('Matteo the Fled');
    await expect(page.getByTestId('end-screen')).toContainText('Boccaccio');
    await expect(page.getByTestId('end-screen')).toContainText('NOVEMBER 1347 · MONTH 1 OF 18');
    await page.getByTestId('ending-reckoning').click();
    await expect(page.getByTestId('reckoning')).toBeVisible();
    await expect(page.getByTestId('reckoning')).toContainText('the Fled');
    await expect(page.getByTestId('reckoning')).toContainText('Epithets earned');
    await page.getByTestId('reckon-again').click();
    await expect(page.getByTestId('return-visit')).toBeVisible();
    await expect(page.getByTestId('new-game')).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe('milestone 4 screenshots', () => {
  for (const size of [
    { name: 'landscape', width: 1180, height: 820 },
    { name: 'portrait', width: 820, height: 1180 },
  ]) {
    test(`captures the story screens at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      mkdirSync('screenshots/milestone-4', { recursive: true });

      await page.goto('/');
      await expect(page.getByTestId('splash')).toHaveCount(0);
      await expect(page.getByTestId('opening-line')).toBeVisible();
      await page.getByTestId('opening-next').click();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-4/${size.name}-opening.png` });

      await page.getByTestId('opening-skip').click();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-4/${size.name}-title.png` });
      await page.getByTestId('name-0').click();

      await page.reload();
      await expect(page.getByTestId('splash')).toHaveCount(0);
      await expect(page.getByTestId('return-visit')).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-4/${size.name}-return.png` });
      await page.getByTestId('continue-run').click();

      // April 1348: the Physician calls (month 1).
      await page.getByTestId('end-month').click();
      await dismissUntilMapOrEvent(page);
      await page.getByTestId('end-month').click();
      for (let guard = 0; guard < 12; guard++) {
        if (await page.getByTestId('sheet-report').count()) {
          await page.getByTestId('report-next').click();
          continue;
        }
        if (await page.getByTestId('earned-moment').count()) {
          await page.getByTestId('earned-keep').click();
          continue;
        }
        break;
      }
      await expect(page.getByTestId('sheet-advisor')).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-4/${size.name}-advisor.png` });
      await page.getByTestId('advisor-thanks').click();

      // Months 2-6; Fear and Blame fires in May 1348 (month 6).
      for (let month = 2; month <= 6; month++) {
        await page.getByTestId('end-month').click();
        const event = await dismissUntilMapOrEvent(page);
        if (event) {
          await settle(page);
          await page.screenshot({ path: `screenshots/milestone-4/${size.name}-event.png` });
          await page.getByTestId('event-read').click();
          for (let guard = 0; guard < 10; guard++) {
            if (await page.getByTestId('sheet-advisor').count()) {
              await page.getByTestId('advisor-thanks').click();
              continue;
            }
            if (await page.getByTestId('earned-moment').count()) {
              await page.getByTestId('earned-keep').click();
              continue;
            }
            break;
          }
          if (await page.getByTestId('chronicle-page').count()) {
            await page.getByTestId('tab-map').click();
          }
          break;
        }
      }

      // Flee for the ending screens.
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
      await expect(page.getByTestId('end-screen')).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-4/${size.name}-fled.png` });
      await page.getByTestId('ending-reckoning').click();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-4/${size.name}-reckoning.png` });
    });

    test(`captures the lens screens at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      mkdirSync('screenshots/milestone-4', { recursive: true });
      await startSeeded(page, 1);

      // Let the sickness move through a few months before looking through it.
      for (let month = 0; month < 5; month++) {
        await page.getByTestId('end-month').click();
        await dismissUntilMapOrEvent(page);
      }
      await page.evaluate(() => {
        const tgm = (window as unknown as { __tgm: { store: { get(): { persistent: { lensUnlocked: boolean } }; update(patch: unknown): void } } }).__tgm;
        tgm.store.get().persistent.lensUnlocked = true;
        tgm.store.update({ sheet: { kind: 'lens-reveal' } });
      });
      await expect(page.getByTestId('sheet-lens-reveal')).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-4/${size.name}-lens-reveal.png` });
      await page.getByTestId('lens-enter').click();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-4/${size.name}-lens.png` });
      await page.getByTestId('lens-toggle-forms').click();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-4/${size.name}-lens-forms.png` });
    });
  }
});
