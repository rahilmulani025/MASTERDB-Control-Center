import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';

// Ensure crypto and subtle are available in jsdom test environment
if (!globalThis.crypto) {
  // @ts-expect-error Node webcrypto polyfill for jsdom
  globalThis.crypto = webcrypto;
} else if (!globalThis.crypto.subtle && webcrypto.subtle) {
  // @ts-expect-error Node webcrypto subtle polyfill
  globalThis.crypto.subtle = webcrypto.subtle;
}
