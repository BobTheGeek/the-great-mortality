import { describe, expect, it } from 'vitest';
import { shouldShowA2hs } from '../../src/shell/pwa';

describe('add to home screen visibility', () => {
  it('shows in a browser tab until dismissed', () => {
    expect(shouldShowA2hs(false, { a2hsDismissed: false })).toBe(true);
    expect(shouldShowA2hs(false, { a2hsDismissed: true })).toBe(false);
  });

  it('never shows in the installed app', () => {
    expect(shouldShowA2hs(true, { a2hsDismissed: false })).toBe(false);
    expect(shouldShowA2hs(true, { a2hsDismissed: true })).toBe(false);
  });
});
