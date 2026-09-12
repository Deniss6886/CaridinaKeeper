import { describe, expect, it, vi } from 'vitest';
import {
  assertSafeObjectGraph,
  isoDateSchema,
  isoDateTimeSchema,
  MAX_ARRAY_ITEMS,
  MAX_LONG_TEXT_LENGTH,
  MAX_OBJECT_GRAPH_DEPTH,
  settingsSchema,
  tankSchema
} from './validation';
import { createDemoData } from '../data/demoData';

describe('strict calendar validation', () => {
  it.each(['2026-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00'])(
    'rejects the nonexistent calendar date %s',
    (date) => expect(isoDateSchema.safeParse(date).success).toBe(false)
  );

  it.each(['2024-02-29', '2000-02-29', '0099-01-01', '0000-02-29'])(
    'accepts valid proleptic Gregorian dates including years below 100: %s',
    (date) => expect(isoDateSchema.parse(date)).toBe(date)
  );

  it.each([
    '2026-02-30T12:00:00.000Z',
    '1900-02-29T12:00:00Z',
    '2026-01-01T24:00:00Z',
    '2026-01-01T23:60:00Z',
    '2026-01-01T23:00:60Z',
    '2026-01-01T12:00:00+25:00',
    '2026-01-01T12:00:00'
  ])('rejects normalized or timezone-free date-times: %s', (date) => {
    expect(isoDateTimeSchema.safeParse(date).success).toBe(false);
  });

  it.each(['2024-02-29T23:59:59.1+02:00', '2026-01-01T00:00:00-05:30', '0099-01-01T00:00:00Z'])(
    'retains valid version 1 timezone and precision representations: %s',
    (date) => expect(isoDateTimeSchema.parse(date)).toBe(date)
  );
});

describe('safe object graph', () => {
  it('rejects an accessor without invoking it', () => {
    const getter = vi.fn(() => 'secret');
    const payload = Object.defineProperty({}, 'value', { get: getter, enumerable: true });
    expect(() => assertSafeObjectGraph(payload)).toThrow(/accessor/);
    expect(getter).not.toHaveBeenCalled();
  });

  it('accepts shared acyclic children but rejects a cycle', () => {
    const child = { value: 1 };
    expect(() => assertSafeObjectGraph({ a: child, b: child })).not.toThrow();
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    expect(() => assertSafeObjectGraph(cycle)).toThrow(/circular/);
  });

  it.each(['__proto__', 'constructor', 'prototype'])('rejects forbidden key %s', (key) => {
    expect(() => assertSafeObjectGraph(JSON.parse(`{"${key}": {"polluted": true}}`))).toThrow(
      /Forbidden/
    );
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });

  it.each([new Date(), new Map(), /regexp/, () => 1, Symbol('value'), 1n, Infinity, NaN])(
    'rejects non-JSON input %#',
    (value) => expect(() => assertSafeObjectGraph({ value })).toThrow()
  );

  it('never executes a custom toJSON or array iterator', () => {
    const toJSON = vi.fn(() => ({}));
    expect(() => assertSafeObjectGraph({ toJSON })).toThrow();
    expect(toJSON).not.toHaveBeenCalled();
    const iterator = vi.fn();
    const array = Object.assign([], { [Symbol.iterator]: iterator });
    expect(() => assertSafeObjectGraph(array)).toThrow(/symbol/);
    expect(iterator).not.toHaveBeenCalled();
  });

  it('enforces string, collection and depth budgets', () => {
    expect(() => assertSafeObjectGraph('x'.repeat(MAX_LONG_TEXT_LENGTH + 1))).toThrow(/oversized/);
    expect(() => assertSafeObjectGraph(new Array(MAX_ARRAY_ITEMS + 1))).toThrow(/array/);
    let value: unknown = null;
    for (let index = 0; index <= MAX_OBJECT_GRAPH_DEPTH; index += 1) value = { value };
    expect(() => assertSafeObjectGraph(value)).toThrow(/deeply/);
  });

  it('validates duplicate inhabitants at ordinary write boundaries', () => {
    const tank = createDemoData().tanks[0]!;
    tank.inhabitants.push({ ...tank.inhabitants[0]! });
    expect(() => tankSchema.parse(tank)).toThrow(/duplicate inhabitant/);
  });

  it('rejects locales that would crash Intl while retaining supported v1 locale forms', () => {
    const settings = createDemoData().settings[0]!;
    expect(settingsSchema.parse({ ...settings, locale: 'en' }).locale).toBe('en');
    expect(settingsSchema.parse({ ...settings, locale: 'de-DE' }).locale).toBe('de-DE');
    expect(() => settingsSchema.parse({ ...settings, locale: 'en_US' })).toThrow(/language tag/);
  });
});
