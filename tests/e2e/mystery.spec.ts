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

async function startSeeded(page: Page, seed = 1000): Promise<void> {
  await page.goto(`/?seed=${seed}`);
  await page.getByTestId('opening-skip').click();
  await page.getByTestId('name-0').click();
}

test.describe('the mystery', () => {
  test('argues all three verdicts, solves question one, and opens the codex popover', async ({
    page,
  }) => {
    const problems = trackProblems(page);
    await startSeeded(page);

    await page.getByTestId('nav-evidence').click();
    await expect(page.getByTestId('board-q-q1')).toBeVisible();

    await page.getByTestId('theory-q1-east').click();
    await expect(page.getByTestId('sheet-verdict')).toContainText('Not yet');
    await page.getByTestId('verdict-close').click();

    await page.getByTestId('theory-q1-air').click();
    await expect(page.getByTestId('sheet-verdict')).toContainText('The clues');
    await expect(page.getByTestId('verdict-noclue')).toBeVisible();
    await page.getByTestId('verdict-close').click();

    await page.getByTestId('board-q-q2').click();
    await page.getByTestId('theory-q2-judgment').click();
    await expect(page.getByTestId('sheet-verdict')).toContainText('Many people believed this sincerely');
    await page.getByTestId('verdict-close').click();

    await page.getByTestId('tab-map').click();
    await page.getByTestId('decree-hold-ships').click();
    await page.getByTestId('end-month').click();
    await expect(page.getByTestId('sheet-report')).toContainText('The quarantined galley');
    await expect(page.getByTestId('unlock-chronicle-forty-days')).toBeVisible();
    await page.getByTestId('report-next').click();

    await expect(page.getByTestId('earned-moment')).toBeVisible();
    await expect(page.getByTestId('earned-moment')).toContainText('Quarantine is a modern idea');
    await expect(page.getByTestId('earned-moment')).toContainText('Earned in November 1347');
    await page.getByTestId('earned-keep').click();

    // The Merchant introduces himself after the first report.
    await expect(page.getByTestId('sheet-advisor')).toBeVisible();
    await page.getByTestId('advisor-thanks').click();

    await page.getByTestId('nav-evidence').click();
    await page.getByTestId('board-q-q1').click();
    await page.getByTestId('theory-q1-east').click();
    await expect(page.getByTestId('sheet-verdict')).toContainText('Solved');
    await page.getByTestId('verdict-pin').click();
    await expect(page.getByTestId('board-q-q1')).toContainText('Solved');

    await page.locator('.q-solved .term').first().click();
    await expect(page.getByTestId('popover')).toBeVisible();
    await expect(page.getByTestId('popover')).toContainText('Caffa');
    await page.getByTestId('open-codex').click();
    await expect(page.getByTestId('codex-entry')).toContainText('Caffa');
    expect(problems).toEqual([]);
  });

  test('runs a chronicle quiz, marks review, and clears it on a correct retry', async ({ page }) => {
    const problems = trackProblems(page);
    await startSeeded(page);

    await page.getByTestId('nav-chronicles').click();
    await expect(page.getByTestId('chronicle-page')).toContainText('Ships from Caffa');
    await page.getByTestId('chronicle-quiz').click();
    await expect(page.getByTestId('quiz')).toContainText('Question 1 of 2');

    await page.getByTestId('quiz-option-0').click();
    await expect(page.getByTestId('quiz-continue')).toHaveText('Next');
    await page.getByTestId('quiz-continue').click();

    await page.getByTestId('quiz-option-0').click();
    await expect(page.getByTestId('quiz-continue')).toHaveText('Try again');
    await expect(page.getByTestId('review-dot')).toBeVisible();
    await page.getByTestId('quiz-continue').click();

    await page.getByTestId('quiz-option-1').click();
    await expect(page.getByTestId('quiz-continue')).toHaveText('Next');
    await page.getByTestId('quiz-continue').click();

    await expect(page.getByTestId('quiz')).toContainText('Well read');
    await page.getByTestId('quiz-close').click();
    await expect(page.getByTestId('review-dot')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('earns a card mid-month, flips it, and shows it in the collection', async ({ page }) => {
    const problems = trackProblems(page);
    await startSeeded(page);

    await page.getByTestId('decree-hire-physicians').click();
    await expect(page.getByTestId('decree-hire-physicians')).toContainText('Now tap a town on the map.');
    await page.locator('#town-collina').click();
    await expect(page.getByTestId('sheet-confirm')).toBeVisible();
    await page.getByTestId('confirm-issue').click();

    await expect(page.getByTestId('earned-moment')).toBeVisible();
    await expect(page.getByTestId('earned-moment')).toContainText('Plague doctors wore beaked masks');
    await page.locator('.earned-card .earned-front').click();
    await expect(page.getByTestId('earned-moment')).toContainText('almost 300 years after the Black Death');
    await page.getByTestId('earned-keep').click();

    await page.getByTestId('nav-cards').click();
    await expect(page.getByTestId('card-beaked-mask')).toBeVisible();
    await expect(page.getByTestId('card-beaked-mask').locator('.new-tag')).toHaveCount(0);
    await expect(page.getByTestId('card-bathing')).toContainText('Sealed · earned in play');
    expect(problems).toEqual([]);
  });

  for (const size of [
    { name: 'landscape', width: 1180, height: 820 },
    { name: 'portrait', width: 820, height: 1180 },
  ]) {
    test(`captures the mystery screens at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      mkdirSync('screenshots/milestone-3', { recursive: true });
      await startSeeded(page);
      await page.getByTestId('decree-hold-ships').click();
      await page.getByTestId('end-month').click();
      await expect(page.getByTestId('sheet-report')).toBeVisible();
      await settle(page);
      await page.getByTestId('report-next').click();
      await expect(page.getByTestId('earned-moment')).toBeVisible();
      await page.getByTestId('earned-keep').click();
      await expect(page.getByTestId('sheet-advisor')).toBeVisible();
      await page.getByTestId('advisor-thanks').click();

      await page.getByTestId('nav-evidence').click();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-3/${size.name}-board.png` });

      await page.getByTestId('theory-q1-east').click();
      await expect(page.getByTestId('sheet-verdict')).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-3/${size.name}-verdict.png` });
      await page.getByTestId('verdict-pin').click();

      await page.locator('.q-solved .term').first().click();
      await expect(page.getByTestId('popover')).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-3/${size.name}-popover.png` });
      await page.getByTestId('popover-close').first().click();

      await page.getByTestId('tab-chronicles').click();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-3/${size.name}-chronicles.png` });

      await page.getByTestId('chronicle-quiz').click();
      await expect(page.getByTestId('quiz')).toBeVisible();
      await page.screenshot({ path: `screenshots/milestone-3/${size.name}-quiz.png` });

      await page.getByTestId('tab-cards').click();
      await settle(page);
      await page.screenshot({ path: `screenshots/milestone-3/${size.name}-cards.png` });
    });
  }
});
