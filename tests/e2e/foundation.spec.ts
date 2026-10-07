import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SIZES = [
  { name: 'landscape-1180x820', width: 1180, height: 820 },
  { name: 'portrait-820x1180', width: 820, height: 1180 },
];

test.describe('foundation status page', () => {
  for (const size of SIZES) {
    test(`renders, validates and reports at ${size.name}`, async ({ page }) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(String(error)));
      page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('favicon')) {
          problems.push(message.text());
        }
      });

      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/');

      await expect(page.getByTestId('spec-status')).toContainText('Spec validation: OK');
      await expect(page.getByTestId('engine-status')).toContainText('do nothing');
      await expect(page.getByTestId('engine-status')).toContainText('hold ships');
      await expect(page.getByTestId('storage-status')).toContainText('round-trip OK');
      await expect(page.getByTestId('storage-status')).toContainText('indexeddb');
      await expect(page.getByTestId('viewport')).toHaveText(`${size.width} × ${size.height}`);

      expect(problems).toEqual([]);

      mkdirSync('screenshots/milestone-1', { recursive: true });
      await page.screenshot({ path: `screenshots/milestone-1/${size.name}.png` });
    });
  }
});
