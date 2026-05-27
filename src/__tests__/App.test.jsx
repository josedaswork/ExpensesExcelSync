import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/sheetsApi', () => ({
  getScriptUrl: vi.fn(() => 'https://script.google.com/test'),
  setScriptUrl: vi.fn(),
  getCategories: vi.fn(() => Promise.resolve({ categories: ['Restaurante', 'Transporte', 'Ocio'] })),
  getExpenses: vi.fn(() => Promise.resolve({
    expenses: [
      { row: 1, category: 'Restaurante', amount: 25.50 },
      { row: 2, category: 'Transporte', amount: 10.00 },
    ],
  })),
  getSummary: vi.fn(() => Promise.resolve({
    income: 2000, fixedExpenses: 800, variableExpenses: 35.50, savings: 1164.50,
  })),
  addExpenseDirect: vi.fn(() => Promise.resolve({ success: true })),
  addToPending: vi.fn(),
  updateExpense: vi.fn(() => Promise.resolve({ success: true })),
  syncPendingExpenses: vi.fn(() => Promise.resolve({ synced: 0, failed: 0 })),
  getPendingExpenses: vi.fn(() => []),
  getPendingForMonth: vi.fn(() => []),
  getCachedSummary: vi.fn(() => null),
  getCachedExpenses: vi.fn(() => null),
  getCachedCategories: vi.fn(() => null),
  clearAllCache: vi.fn(),
  DEFAULT_CATEGORIES: ['Restaurante', 'Transporte', 'Ocio'],
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: () => Promise.resolve() },
  ImpactStyle: { Light: 'LIGHT' },
}));

import App from '../App';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('sheets_script_url', 'https://script.google.com/test');
});

describe('App', () => {
  it('renders the header', async () => {
    render(<App />);
    expect(screen.getByText('💰 Control Gastos')).toBeInTheDocument();
  });

  it('shows monthly summary labels', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Ingresos')).toBeInTheDocument();
      expect(screen.getByText('Gastos Fijos')).toBeInTheDocument();
      expect(screen.getByText('Restante mes')).toBeInTheDocument();
    });
  });

  it('shows expenses after loading', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Restaurante')).toBeInTheDocument();
      expect(screen.getByText('Transporte')).toBeInTheDocument();
    });
  });

  it('opens add expense modal on FAB click', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Restaurante')).toBeInTheDocument());

    const buttons = screen.getAllByRole('button');
    const fabButton = buttons[buttons.length - 1];
    await user.click(fabButton);

    await waitFor(() => {
      expect(screen.getByText('Nuevo Gasto')).toBeInTheDocument();
    });
  });
});

describe('fmt utility', () => {
  it('formats currency correctly', async () => {
    const { fmt } = await import('@/lib/utils');
    const result = fmt(25.5);
    expect(result).toContain('25,50');
    expect(result).toContain('€');
  });

  it('returns dash for null', async () => {
    const { fmt } = await import('@/lib/utils');
    expect(fmt(null)).toBe('—');
    expect(fmt(undefined)).toBe('—');
  });
});
