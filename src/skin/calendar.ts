import type { Spec } from '../spec/types';

export const CAL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const CAL_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function wrap(index: number): number {
  return ((index % 12) + 12) % 12;
}

export function calendarMonth(startCalendarMonth: number, month: number): number {
  return (startCalendarMonth + month) % 12;
}

export function monthName(index: number): string {
  return CAL_MONTHS[wrap(index)]!;
}

export function monthShort(index: number): string {
  return CAL_MONTHS_SHORT[wrap(index)]!;
}

export function monthTag(index: number): string {
  return monthShort(index).toUpperCase();
}

export function calendarYear(
  startCalendarMonth: number,
  month: number,
  startYear = 1347,
): number {
  return startYear + Math.floor((startCalendarMonth + month) / 12);
}

export function startYearFromSpec(spec: Spec): number {
  const match = spec.endings?.normal?.kicker?.match(/(1\d{3})/);
  return match ? Number(match[1]) : 1347;
}

export function seasonOf(index: number): 'winter' | 'spring' | 'summer' | 'autumn' {
  const m = wrap(index);
  if (m === 11 || m <= 1) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}
