import { expect, test } from 'vitest';
import { darknessT, lerpHex, themeFor } from '../../src/skin/theme';

test('hex interpolation hits both endpoints and the midpoint', () => {
  expect(lerpHex('#3a2a1c', '#1f150c', 0)).toBe('#3a2a1c');
  expect(lerpHex('#3a2a1c', '#1f150c', 1)).toBe('#1f150c');
  expect(lerpHex('#000000', '#ffffff', 0.5)).toBe('#808080');
});

test('darkness ramps from no deaths to a full late theme at forty-five percent dead', () => {
  expect(darknessT(0, 1000)).toBe(0);
  expect(darknessT(225, 1000)).toBeCloseTo(0.5, 10);
  expect(darknessT(450, 1000)).toBe(1);
  expect(darknessT(600, 1000)).toBe(1);
});

test('the theme at zero is the early palette', () => {
  const theme = themeFor(0);
  expect(theme.frame).toBe('#3a2a1c');
  expect(theme.mapInk).toBe('#4a2f1d');
  expect(theme.lateOpacity).toBe(0);
  expect(theme.roadsInner).toBe(0);
});

test('the theme at one is the late palette', () => {
  const theme = themeFor(1);
  expect(theme.frame).toBe('#1f150c');
  expect(theme.mapInk).toBe('#f1e6cf');
  expect(theme.mapDropcap).toBe('#c96b5e');
  expect(theme.lateOpacity).toBe(1);
  expect(theme.roadsInner).toBeCloseTo(0.7, 10);
});

test('intermediate themes blend and clamp', () => {
  const mid = themeFor(0.5);
  expect(mid.lateOpacity).toBe(0.5);
  expect(mid.frame).not.toBe('#3a2a1c');
  expect(mid.frame).not.toBe('#1f150c');
  expect(themeFor(-1).lateOpacity).toBe(0);
  expect(themeFor(2).lateOpacity).toBe(1);
});
