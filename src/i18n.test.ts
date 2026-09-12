import { describe, expect, it } from 'vitest';
import i18n from './i18n';

const sourceModules = import.meta.glob('./**/*.{ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default'
});

function literalTranslationKeys(): string[] {
  const keys = new Set<string>();
  const pattern = /\bt\(\s*(['"`])([^'"`]+)\1/g;
  for (const [path, source] of Object.entries(sourceModules)) {
    if (path.endsWith('.test.ts')) continue;
    for (const match of source.matchAll(pattern)) {
      const key = match[2];
      if (key && !key.includes('${')) keys.add(key);
    }
  }
  return [...keys].sort();
}

describe('translations', () => {
  it.each(['en', 'de'])('defines every literal UI key in %s', (language) => {
    const missing = literalTranslationKeys().filter(
      (key) => !i18n.exists(key, { lng: language, fallbackLng: false })
    );
    expect(missing).toEqual([]);
  });
});
