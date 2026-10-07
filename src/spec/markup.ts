export type MarkupToken =
  | { kind: 'text'; text: string }
  | { kind: 'term'; termId: string; display?: string };

const TERM_RE = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;
const PLACEHOLDER_RE = /\{([a-z]+)\}/g;

export function parseMarkup(input: string): MarkupToken[] {
  const tokens: MarkupToken[] = [];
  let last = 0;
  for (const match of input.matchAll(TERM_RE)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ kind: 'text', text: input.slice(last, index) });
    const termId = match[1] ?? '';
    const display = match[2];
    tokens.push(display !== undefined ? { kind: 'term', termId, display } : { kind: 'term', termId });
    last = index + match[0].length;
  }
  if (last < input.length) tokens.push({ kind: 'text', text: input.slice(last) });
  return tokens;
}

export function collectTermRefs(input: string): string[] {
  return [...input.matchAll(TERM_RE)].map((m) => m[1] ?? '');
}

export function collectPlaceholders(input: string): string[] {
  return [...input.matchAll(PLACEHOLDER_RE)].map((m) => m[1] ?? '');
}

export function fillPlaceholders(input: string, vars: Record<string, string | number>): string {
  return input.replace(PLACEHOLDER_RE, (all, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : all,
  );
}
