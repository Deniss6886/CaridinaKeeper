import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

if (!globalThis.crypto?.randomUUID) {
  throw new Error('Test runtime must provide crypto.randomUUID.');
}
