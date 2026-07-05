import {
  Expense,
  Partner,
  Product,
  ProfitDistributionRecord,
  StockMovement,
  Transaction,
} from './types';

export interface PersistedAppState {
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
  partners: Partner[];
  distributions: ProfitDistributionRecord[];
  stockMovements: StockMovement[];
  darkMode: boolean;
}

export const loadServerState = async (): Promise<Partial<PersistedAppState> | null> => {
  const response = await fetch('/api/state');
  if (!response.ok) {
    throw new Error(`Failed to load server state: ${response.status}`);
  }

  const payload = await response.json();
  return payload.data || null;
};

export const saveServerState = async (state: PersistedAppState): Promise<void> => {
  const response = await fetch('/api/state', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    throw new Error(`Failed to save server state: ${response.status}`);
  }
};

