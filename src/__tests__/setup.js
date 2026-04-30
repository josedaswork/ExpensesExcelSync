import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const store = {};
global.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

// Mock @capacitor/haptics
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: () => Promise.resolve() },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
}));

// jsdom doesn't support scrollIntoView
Element.prototype.scrollIntoView = vi.fn();
