<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText, 
  Receipt, 
  Coins, 
  Sun, 
  Moon, 
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
  LogOut,
  Lock,
  User
} from '@lucide/vue';
import { 
  Product, 
  Transaction, 
  Expense, 
  Partner, 
  ProfitDistributionRecord, 
  StockMovement, 
  ToastMessage, 
  CartItem, 
  PaymentMethod,
  AuthUser,
  InvestorAccount
} from './types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_EXPENSES, 
  INITIAL_PARTNERS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_STOCK_MOVEMENTS, 
  INITIAL_DISTRIBUTIONS
} from './utils';
import { loadServerState, PersistedAppState, saveServerState } from './serverState';

// Views
import Dashboard from './components/Dashboard.vue';
import Inventory from './components/Inventory.vue';
import POS from './components/POS.vue';
import Expenses from './components/Expenses.vue';
import ProfitDistribution from './components/ProfitDistribution.vue';
import Reports from './components/Reports.vue';
import InvestorView from './components/InvestorView.vue';

// ----------------------------------------------------
// STATE INITIALIZATION
// ----------------------------------------------------
const products = ref<Product[]>([]);
const transactions = ref<Transaction[]>([]);
const expenses = ref<Expense[]>([]);
const partners = ref<Partner[]>([]);
const distributions = ref<ProfitDistributionRecord[]>([]);
const stockMovements = ref<StockMovement[]>([]);
const investorAccounts = ref<InvestorAccount[]>([]);
const activeProducts = computed(() => products.value.filter((product) => !product.deletedAt));
const activeExpenses = computed(() => expenses.value.filter((expense) => !expense.deletedAt));
const activePartners = computed(() => partners.value.filter((partner) => !partner.deletedAt));

const activeView = ref<string>('dashboard');
const darkMode = ref<boolean>(false);
const toasts = ref<ToastMessage[]>([]);
const currentTime = ref<string>('');
const stateLoaded = ref<boolean>(false);
const authReady = ref<boolean>(false);
const isAuthenticated = ref<boolean>(false);
const currentUser = ref<AuthUser | null>(null);
const loginUsername = ref<string>('');
const loginPassword = ref<string>('');
const loginError = ref<string>('');
const loginLoading = ref<boolean>(false);
type DeleteTarget =
  | { type: 'product'; id: string; title: string; details: string }
  | { type: 'expense'; id: string; title: string; details: string }
  | { type: 'partner'; id: string; title: string; details: string };
const deleteTarget = ref<DeleteTarget | null>(null);
const deleteConfirmationText = ref<string>('');
const deleteLoading = ref<boolean>(false);

let timeInterval: any = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const getPersistedState = (): PersistedAppState => ({
  products: products.value,
  transactions: transactions.value,
  expenses: expenses.value,
  partners: partners.value,
  distributions: distributions.value,
  stockMovements: stockMovements.value,
  darkMode: darkMode.value,
});

const queueServerSave = () => {
  if (!stateLoaded.value) return;
  if (currentUser.value?.role === 'investor') return;
  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    saveServerState(getPersistedState()).catch((error) => {
      console.warn('PostgreSQL sync failed; localStorage fallback remains available.', error);
    });
  }, 400);
};

const applyRemoteState = (state: Partial<PersistedAppState>) => {
  products.value = Array.isArray(state.products) ? state.products : INITIAL_PRODUCTS;
  transactions.value = Array.isArray(state.transactions) ? state.transactions : INITIAL_TRANSACTIONS;
  expenses.value = Array.isArray(state.expenses) ? state.expenses : INITIAL_EXPENSES;
  partners.value = Array.isArray(state.partners) ? state.partners : INITIAL_PARTNERS;
  distributions.value = Array.isArray(state.distributions) ? state.distributions : INITIAL_DISTRIBUTIONS;
  stockMovements.value = Array.isArray(state.stockMovements) ? state.stockMovements : INITIAL_STOCK_MOVEMENTS;
  darkMode.value = !!state.darkMode;
};

// Initialize state with localStorage
const loadLocalState = () => {
  // Products
  const savedProd = localStorage.getItem('biz_products');
  if (savedProd) {
    try {
      const parsed = JSON.parse(savedProd);
      const hasOldProducts = parsed.some((p: any) => 
        p.category === 'Beverages' || 
        p.category === 'Instant Food' || 
        p.category === 'Canned Goods' || 
        (p.name && (p.name.includes('San Miguel') || p.name.includes('Lucky Me!')))
      );
      if (hasOldProducts) {
        localStorage.removeItem('biz_products');
        localStorage.removeItem('biz_transactions');
        localStorage.removeItem('biz_stock_movements');
        localStorage.removeItem('biz_distributions');
        products.value = INITIAL_PRODUCTS;
      } else {
        products.value = parsed;
      }
    } catch (e) {
      products.value = INITIAL_PRODUCTS;
    }
  } else {
    products.value = INITIAL_PRODUCTS;
  }

  // Transactions
  const savedTx = localStorage.getItem('biz_transactions');
  if (savedTx && localStorage.getItem('biz_products')) {
    try {
      transactions.value = JSON.parse(savedTx);
    } catch (e) {
      transactions.value = INITIAL_TRANSACTIONS;
    }
  } else {
    transactions.value = INITIAL_TRANSACTIONS;
  }

  // Expenses
  const savedExp = localStorage.getItem('biz_expenses');
  if (savedExp) {
    try {
      expenses.value = JSON.parse(savedExp);
    } catch (e) {
      expenses.value = INITIAL_EXPENSES;
    }
  } else {
    expenses.value = INITIAL_EXPENSES;
  }

  // Partners
  const savedPartners = localStorage.getItem('biz_partners');
  if (savedPartners) {
    try {
      const parsed = JSON.parse(savedPartners);
      // Check if it has the old partner percentages or names
      const hasOldPartnerConfig = parsed.some((p: any) => 
        p.sharePercentage === 50 || 
        p.sharePercentage === 30 || 
        p.sharePercentage === 20 ||
        (p.name && (p.name.includes('(Investor)') || p.name.includes('(Managing Partner)')))
      );
      if (hasOldPartnerConfig) {
        localStorage.removeItem('biz_partners');
        localStorage.removeItem('biz_distributions');
        partners.value = INITIAL_PARTNERS;
        distributions.value = INITIAL_DISTRIBUTIONS;
      } else {
        partners.value = parsed;
      }
    } catch (e) {
      partners.value = INITIAL_PARTNERS;
    }
  } else {
    partners.value = INITIAL_PARTNERS;
  }

  // Distributions
  const savedDist = localStorage.getItem('biz_distributions');
  if (savedDist && localStorage.getItem('biz_products')) {
    try {
      distributions.value = JSON.parse(savedDist);
    } catch (e) {
      distributions.value = INITIAL_DISTRIBUTIONS;
    }
  } else {
    distributions.value = INITIAL_DISTRIBUTIONS;
  }

  // Stock movements
  const savedMvs = localStorage.getItem('biz_stock_movements');
  if (savedMvs && localStorage.getItem('biz_products')) {
    try {
      stockMovements.value = JSON.parse(savedMvs);
    } catch (e) {
      stockMovements.value = INITIAL_STOCK_MOVEMENTS;
    }
  } else {
    stockMovements.value = INITIAL_STOCK_MOVEMENTS;
  }

  // Dark mode
  darkMode.value = localStorage.getItem('biz_dark_mode') === 'true';
};

const loadState = async () => {
  try {
    const serverState = await loadServerState();
    if (serverState) {
      applyRemoteState(serverState);
      return;
    }
  } catch (error) {
    console.warn('PostgreSQL state unavailable; using localStorage fallback.', error);
  }

  loadLocalState();
};

// Syncing triggers using watch
watch(products, (newVal) => {
  localStorage.setItem('biz_products', JSON.stringify(newVal));
  queueServerSave();
}, { deep: true });

watch(transactions, (newVal) => {
  localStorage.setItem('biz_transactions', JSON.stringify(newVal));
  queueServerSave();
}, { deep: true });

watch(expenses, (newVal) => {
  localStorage.setItem('biz_expenses', JSON.stringify(newVal));
  queueServerSave();
}, { deep: true });

watch(partners, (newVal) => {
  localStorage.setItem('biz_partners', JSON.stringify(newVal));
  queueServerSave();
}, { deep: true });

watch(distributions, (newVal) => {
  localStorage.setItem('biz_distributions', JSON.stringify(newVal));
  queueServerSave();
}, { deep: true });

watch(stockMovements, (newVal) => {
  localStorage.setItem('biz_stock_movements', JSON.stringify(newVal));
  queueServerSave();
}, { deep: true });

watch(darkMode, (newVal) => {
  localStorage.setItem('biz_dark_mode', String(newVal));
  const root = window.document.documentElement;
  if (newVal) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  queueServerSave();
});

// Current local time ticker setup
const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const initializeAuthenticatedState = async () => {
  await loadState();
  if (currentUser.value?.role === 'admin') {
    await loadInvestorAccounts();
  } else {
    investorAccounts.value = [];
  }
  stateLoaded.value = true;
};

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('hai_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const loadInvestorAccounts = async () => {
  try {
    const response = await fetch('/api/investor-accounts', {
      headers: getAuthHeaders(),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Unable to load investor accounts.');
    }

    investorAccounts.value = Array.isArray(payload.accounts) ? payload.accounts : [];
  } catch (error) {
    console.warn('Investor account list unavailable.', error);
    investorAccounts.value = [];
  }
};

const saveInvestorAccount = async (partnerId: string, username: string, password: string) => {
  const response = await fetch('/api/investor-accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ partnerId, username, password }),
  });
  const payload = await response.json();

  if (!response.ok || !payload.account) {
    throw new Error(payload.error || 'Unable to save investor account.');
  }

  investorAccounts.value = [
    payload.account,
    ...investorAccounts.value.filter((account) => account.partnerId !== partnerId),
  ];
};

const deleteInvestorAccount = async (partnerId: string) => {
  const response = await fetch(`/api/investor-accounts/${encodeURIComponent(partnerId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Unable to delete investor account.');
  }

  investorAccounts.value = investorAccounts.value.filter((account) => account.partnerId !== partnerId);
};

const restoreAuthSession = async () => {
  const token = localStorage.getItem('hai_auth_token');
  if (!token) return;

  try {
    const response = await fetch('/api/auth/session', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = await response.json();

    if (response.ok && payload.authenticated) {
      currentUser.value = payload.user || { username: 'admin', role: 'admin' };
      isAuthenticated.value = true;
      activeView.value = currentUser.value.role === 'investor' ? 'investor' : 'dashboard';
      await initializeAuthenticatedState();
      return;
    }
  } catch (error) {
    console.warn('Login session check failed.', error);
  }

  localStorage.removeItem('hai_auth_token');
};

onMounted(async () => {
  try {
    await restoreAuthSession();
  } finally {
    authReady.value = true;
  }

  updateTime();
  timeInterval = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
  if (saveTimer) clearTimeout(saveTimer);
});

// Toast dispatch helper
const addToast = (title: string, message: string, type: ToastMessage['type'] = 'success') => {
  const id = Math.random().toString(36).substring(2, 9);
  toasts.value.push({ id, title, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 4500);
};

const removeToast = (id: string) => {
  toasts.value = toasts.value.filter(t => t.id !== id);
};

const openDeleteConfirmation = (target: DeleteTarget) => {
  deleteTarget.value = target;
  deleteConfirmationText.value = '';
};

const closeDeleteConfirmation = () => {
  if (deleteLoading.value) return;
  deleteTarget.value = null;
  deleteConfirmationText.value = '';
};

const handleLogin = async () => {
  loginLoading.value = true;
  loginError.value = '';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: loginUsername.value,
        password: loginPassword.value,
      }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.token) {
      loginError.value = payload.error || 'Invalid username or password.';
      return;
    }

    localStorage.setItem('hai_auth_token', payload.token);
    currentUser.value = payload.user || { username: loginUsername.value, role: 'admin' };
    isAuthenticated.value = true;
    activeView.value = currentUser.value.role === 'investor' ? 'investor' : 'dashboard';
    loginPassword.value = '';
    await initializeAuthenticatedState();
  } catch (error) {
    loginError.value = 'Unable to connect to the login server.';
  } finally {
    loginLoading.value = false;
  }
};

const handleLogout = async () => {
  const token = localStorage.getItem('hai_auth_token');
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch((error) => console.warn('Logout request failed.', error));
  }

  isAuthenticated.value = false;
  currentUser.value = null;
  stateLoaded.value = false;
  loginUsername.value = '';
  loginPassword.value = '';
  localStorage.removeItem('hai_auth_token');
};

// ----------------------------------------------------
// PRODUCT CATALOG OPERATIONS
// ----------------------------------------------------
const handleAddProduct = (newProduct: Omit<Product, 'id' | 'createdAt' | 'status'>) => {
  const product: Product = {
    ...newProduct,
    id: `prod-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    status: newProduct.currentStock === 0 
      ? 'Out of Stock' 
      : newProduct.currentStock <= newProduct.minimumStock 
        ? 'Low Stock' 
        : 'In Stock'
  };

  products.value = [product, ...products.value];

  // Log initial stock movement if current stock > 0
  if (product.currentStock > 0) {
    const movement: StockMovement = {
      id: `mv-${Math.random().toString(36).substring(2, 9)}`,
      productId: product.id,
      productName: product.name,
      type: 'In',
      quantity: product.currentStock,
      previousStock: 0,
      newStock: product.currentStock,
      reason: 'Initial Restocking batch setup',
      createdAt: new Date().toISOString()
    };
    stockMovements.value = [movement, ...stockMovements.value];
  }

  addToast('Product Registered', `${product.name} created and cataloged.`, 'success');
};

const handleUpdateProduct = (updated: Product) => {
  const previous = products.value.find(p => p.id === updated.id);
  const newStatus = updated.currentStock === 0 
    ? 'Out of Stock' 
    : updated.currentStock <= updated.minimumStock 
      ? 'Low Stock' 
      : 'In Stock';

  const finalProduct = { ...updated, status: newStatus };

  products.value = products.value.map(p => p.id === updated.id ? finalProduct : p);

  // If stock changed, log movement
  if (previous && previous.currentStock !== updated.currentStock) {
    const diff = updated.currentStock - previous.currentStock;
    const movement: StockMovement = {
      id: `mv-${Math.random().toString(36).substring(2, 9)}`,
      productId: updated.id,
      productName: updated.name,
      type: diff > 0 ? 'In' : 'Out',
      quantity: Math.abs(diff),
      previousStock: previous.currentStock,
      newStock: updated.currentStock,
      reason: 'Item detail modifications sync',
      createdAt: new Date().toISOString()
    };
    stockMovements.value = [movement, ...stockMovements.value];
  }

  addToast('Product Updated', `Successfully updated modifications for ${updated.name}.`, 'success');
};

const handleDeleteProduct = (id: string) => {
  const item = products.value.find(p => p.id === id);
  if (!item) return;

  openDeleteConfirmation({
    type: 'product',
    id,
    title: `Delete SKU ${item.sku}`,
    details: `${item.name} will be removed from the active product catalog and kept archived.`,
  });
};

const handleAdjustStock = (productId: string, quantity: number, type: 'In' | 'Out' | 'Adjustment', reason: string) => {
  products.value = products.value.map(p => {
    if (p.id === productId) {
      let delta = Math.abs(quantity);
      if (type === 'Out') delta = -delta;
      if (type === 'Adjustment') delta = quantity; // can be pos or neg directly

      const oldStock = p.currentStock;
      const newStock = Math.max(0, oldStock + delta);
      const newStatus = newStock === 0 
        ? 'Out of Stock' 
        : newStock <= p.minimumStock 
          ? 'Low Stock' 
          : 'In Stock';

      // Log movement
      const movement: StockMovement = {
        id: `mv-${Math.random().toString(36).substring(2, 9)}`,
        productId: p.id,
        productName: p.name,
        type: type,
        quantity: delta,
        previousStock: oldStock,
        newStock: newStock,
        reason: reason || 'Manual Admin Overrides adjustment',
        createdAt: new Date().toISOString()
      };

      stockMovements.value = [movement, ...stockMovements.value];

      return {
        ...p,
        currentStock: newStock,
        status: newStatus
      };
    }
    return p;
  });

  addToast('Stock Overwritten', 'Durable inventory offset recalculated.', 'success');
};

const handleImportProducts = (imported: Omit<Product, 'id' | 'createdAt' | 'status'>[]) => {
  const newItems: Product[] = [];
  const newMvs: StockMovement[] = [];

  imported.forEach(item => {
    const id = `prod-${Math.random().toString(36).substring(2, 9)}`;
    const product: Product = {
      ...item,
      id,
      createdAt: new Date().toISOString(),
      status: item.currentStock === 0 ? 'Out of Stock' : item.currentStock <= item.minimumStock ? 'Low Stock' : 'In Stock'
    };
    newItems.push(product);

    if (product.currentStock > 0) {
      newMvs.push({
        id: `mv-${Math.random().toString(36).substring(2, 9)}`,
        productId: id,
        productName: product.name,
        type: 'In',
        quantity: product.currentStock,
        previousStock: 0,
        newStock: product.currentStock,
        reason: 'CSV File Bulk Catalog Import restock',
        createdAt: new Date().toISOString()
      });
    }
  });

  products.value = [...newItems, ...products.value];
  if (newMvs.length > 0) {
    stockMovements.value = [...newMvs, ...stockMovements.value];
  }

  addToast('Bulk Import Succeeded', `Processed and verified ${newItems.length} SKUs into active storage.`, 'success');
};

// ----------------------------------------------------
// EXPENSE OPERATIONS
// ----------------------------------------------------
const handleAddExpense = (newExpense: Omit<Expense, 'id' | 'createdAt'>) => {
  const expense: Expense = {
    ...newExpense,
    id: `exp-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString()
  };
  expenses.value = [expense, ...expenses.value];
  addToast('Expense Added', `Successfully charged ${newExpense.category} item into ledger.`, 'success');
};

const handleDeleteExpense = (id: string) => {
  const item = expenses.value.find(e => e.id === id);
  if (!item) return;

  openDeleteConfirmation({
    type: 'expense',
    id,
    title: 'Delete Expense Record',
    details: `${item.category} expense for PHP ${item.amount.toFixed(2)} on ${new Date(item.date).toLocaleDateString()} will be removed from active ledgers and kept archived.`,
  });
};

// ----------------------------------------------------
// POINT OF SALE CHECKOUT
// ----------------------------------------------------
const handleCheckout = (
  cartItems: CartItem[], 
  paymentMethod: PaymentMethod, 
  discountPercent: number, 
  customerName?: string
) => {
  // Generate Invoice Number
  const invoiceNo = `INV-2026-${String(transactions.value.length + 1).padStart(4, '0')}`;
  
  let subtotal = 0;
  let itemDiscountsTotal = 0;
  let costOfGoodsSold = 0;

  const transactionItems = cartItems.map(item => {
    const originalPrice = item.product.sellingPrice * item.quantity;
    const discountAmount = originalPrice * (item.discount / 100);
    
    subtotal += originalPrice;
    itemDiscountsTotal += discountAmount;
    costOfGoodsSold += item.product.costPrice * item.quantity;

    return {
      productId: item.product.id,
      name: item.product.name,
      sku: item.product.sku,
      costPrice: item.product.costPrice,
      sellingPrice: item.product.sellingPrice,
      quantity: item.quantity,
      discount: item.discount,
      totalPrice: originalPrice - discountAmount
    };
  });

  const subtotalAfterItemDiscounts = subtotal - itemDiscountsTotal;
  const globalDiscountAmount = subtotalAfterItemDiscounts * (discountPercent / 100);
  const totalDiscount = itemDiscountsTotal + globalDiscountAmount;
  const total = Math.max(0, subtotal - totalDiscount);
  const profit = Math.max(0, total - costOfGoodsSold);

  const transaction: Transaction = {
    id: `tx-${Math.random().toString(36).substring(2, 9)}`,
    invoiceNo,
    items: transactionItems,
    subtotal,
    discountAmount: totalDiscount,
    total,
    costOfGoodsSold,
    profit,
    paymentMethod,
    customerName,
    createdAt: new Date().toISOString()
  };

  // Deduct stock counts in products catalog & Log stock movements
  products.value = products.value.map(p => {
    const cartMatch = cartItems.find(item => item.product.id === p.id);
    if (cartMatch) {
      const newQty = Math.max(0, p.currentStock - cartMatch.quantity);
      const newStatus = newQty === 0 
        ? 'Out of Stock' 
        : newQty <= p.minimumStock 
          ? 'Low Stock' 
          : 'In Stock';

      // Log stock movement Out
      const movement: StockMovement = {
        id: `mv-${Math.random().toString(36).substring(2, 9)}`,
        productId: p.id,
        productName: p.name,
        type: 'Out',
        quantity: -cartMatch.quantity,
        previousStock: p.currentStock,
        newStock: newQty,
        reason: `Sold via POS ${invoiceNo}`,
        createdAt: new Date().toISOString()
      };

      stockMovements.value = [movement, ...stockMovements.value];

      return {
        ...p,
        currentStock: newQty,
        status: newStatus
      };
    }
    return p;
  });

  // Add transaction to ledger
  transactions.value = [transaction, ...transactions.value];

  addToast('Invoice Created', `Invoice: ${invoiceNo} logged. Change calculated.`, 'success');
};

// ----------------------------------------------------
// PARTNERS & PROFIT DISTRIBUTIONS
// ----------------------------------------------------
const handleAddPartner = async (newPartner: Omit<Partner, 'id'> & { investorUsername: string; investorPassword: string }) => {
  const partner: Partner = {
    name: newPartner.name,
    sharePercentage: newPartner.sharePercentage,
    id: `part-${Math.random().toString(36).substring(2, 9)}`
  };
  partners.value = [...partners.value, partner];

  try {
    await saveInvestorAccount(partner.id, newPartner.investorUsername, newPartner.investorPassword);
    addToast('Investor Account Created', `${partner.name} can now sign in with their own read-only account.`, 'success');
  } catch (error) {
    partners.value = partners.value.filter(p => p.id !== partner.id);
    addToast('Account Creation Failed', error instanceof Error ? error.message : 'Unable to create investor credentials.', 'error');
  }
};

const handleUpdatePartnerShares = (updated: Partner[]) => {
  const updatedById = new Map(updated.map((partner) => [partner.id, partner]));
  partners.value = partners.value.map((partner) => updatedById.get(partner.id) || partner);
};

const handleDeletePartner = (id: string) => {
  const item = partners.value.find(p => p.id === id);
  if (!item) return;

  openDeleteConfirmation({
    type: 'partner',
    id,
    title: `Remove ${item.name}`,
    details: 'This will remove the shareholder and investor login from active use while keeping an archived record.',
  });
};

const handleSaveInvestorAccount = async (payload: { partnerId: string; username: string; password: string }) => {
  try {
    await saveInvestorAccount(payload.partnerId, payload.username, payload.password);
    addToast('Investor Account Updated', 'Investor login credentials saved.', 'success');
  } catch (error) {
    addToast('Account Update Failed', error instanceof Error ? error.message : 'Unable to save investor credentials.', 'error');
  }
};

const executeConfirmedDelete = async () => {
  if (!deleteTarget.value || deleteConfirmationText.value !== 'DELETE') return;

  deleteLoading.value = true;
  const target = deleteTarget.value;

  try {
    if (target.type === 'product') {
      const item = products.value.find(p => p.id === target.id);
      const deletedAt = new Date().toISOString();
      products.value = products.value.map(p => p.id === target.id ? { ...p, deletedAt } : p);
      addToast('SKU Archived', item ? `${item.name} was soft deleted from the active catalog.` : 'Product archived.', 'info');
    }

    if (target.type === 'expense') {
      const deletedAt = new Date().toISOString();
      expenses.value = expenses.value.map(e => e.id === target.id ? { ...e, deletedAt } : e);
      addToast('Record Archived', 'Expense ledger item was soft deleted.', 'info');
    }

    if (target.type === 'partner') {
      const deletedAt = new Date().toISOString();
      partners.value = partners.value.map(p => p.id === target.id ? { ...p, deletedAt } : p);
      try {
        await deleteInvestorAccount(target.id);
      } catch (error) {
        console.warn('Unable to remove investor account.', error);
      }
      addToast('Registry Archived', 'Partner and investor login were soft deleted.', 'info');
    }

    deleteTarget.value = null;
    deleteConfirmationText.value = '';
  } finally {
    deleteLoading.value = false;
  }
};

const handlePostDistribution = (newRecord: Omit<ProfitDistributionRecord, 'id' | 'createdAt'>) => {
  const record: ProfitDistributionRecord = {
    ...newRecord,
    id: `dist-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString()
  };
  distributions.value = [record, ...distributions.value];
};
</script>

<template>
  <div v-if="!authReady" class="min-h-screen bg-[#111113] text-zinc-100 flex items-center justify-center p-6 font-sans transition-colors duration-150">
    <div class="flex flex-col items-center gap-3">
      <div class="hai-logo-mark" aria-hidden="true">
        <span class="hai-kana">はい</span>
        <span class="hai-word">Hai</span>
        <span class="hai-dot"></span>
      </div>
      <p class="text-[10px] font-black uppercase tracking-[0.22em] text-[#E81221]">Loading</p>
    </div>
  </div>

  <div v-else-if="!isAuthenticated" class="min-h-screen bg-[#111113] text-slate-900 flex items-center justify-center p-6 font-sans transition-colors duration-150">
    <div class="w-full max-w-sm bg-white border border-white/10 rounded-xl shadow-2xl overflow-hidden">
      <div class="h-1 bg-[#E81221]"></div>
      <div class="p-6 border-b border-slate-100 bg-white">
        <div class="flex items-center gap-3">
          <div class="hai-logo-mark" aria-hidden="true">
            <span class="hai-kana">はい</span>
            <span class="hai-word">Hai</span>
            <span class="hai-dot"></span>
          </div>
          <div>
            <h1 class="text-xl font-black uppercase tracking-tight font-display text-black">Hai Store</h1>
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-[#E81221]">Inventory Login</p>
          </div>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="p-6 space-y-4 text-xs">
        <div>
          <label class="block font-bold text-slate-600 mb-1 uppercase tracking-wide">Username</label>
          <div class="relative">
            <User class="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              v-model="loginUsername"
              type="text"
              autocomplete="username"
              class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-zinc-800 font-semibold focus:outline-none focus:border-[#E81221]"
              placeholder="admin"
            />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-600 mb-1 uppercase tracking-wide">Password</label>
          <div class="relative">
            <Lock class="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              v-model="loginPassword"
              type="password"
              autocomplete="current-password"
              class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-zinc-800 font-semibold focus:outline-none focus:border-[#E81221]"
              placeholder="Password"
            />
          </div>
        </div>

        <p v-if="loginError" class="text-[11px] font-bold text-rose-600">{{ loginError }}</p>

        <button
          type="submit"
          :disabled="loginLoading"
          class="w-full py-2.5 rounded-lg bg-[#E81221] hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest transition-colors"
        >
          {{ loginLoading ? 'Signing In' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>

  <div v-else class="min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-150">
    <template v-if="currentUser?.role === 'investor'">
      <header class="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-4 sm:px-6 lg:px-8 py-4 print:hidden shadow-xs">
        <div class="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="hai-logo-mark" aria-hidden="true">
              <span class="hai-kana">はい</span>
              <span class="hai-word">Hai</span>
              <span class="hai-dot"></span>
            </div>
            <div>
              <h1 class="text-base sm:text-lg font-black uppercase tracking-tight font-display text-slate-900 dark:text-zinc-50">Hai Store</h1>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-[#E81221]">Investor Portal</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider">
            <div class="hidden md:flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] normal-case tracking-normal">
              <Clock class="h-3.5 w-3.5 text-indigo-500" />
              <span>{{ currentTime }}</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">View Only</span>
            </div>

            <button
              @click="darkMode = !darkMode"
              class="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              title="Toggle theme mode"
            >
              <Sun v-if="darkMode" class="h-4 w-4" />
              <Moon v-else class="h-4 w-4" />
            </button>

            <button
              @click="handleLogout"
              class="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-zinc-700 dark:hover:text-rose-400 transition-colors"
              title="Sign out"
            >
              <LogOut class="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" id="investor-workspace">
        <div class="max-w-7xl mx-auto">
          <InvestorView
            :products="activeProducts"
            :transactions="transactions"
            :expenses="activeExpenses"
            :partners="activePartners"
            :distributions="distributions"
            :partner-id="currentUser.partnerId"
          />
        </div>
      </main>
    </template>

    <template v-else>
    
    <!-- HEADER BAR -->
    <header class="h-16 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-8 flex justify-between items-center shrink-0 print:hidden shadow-xs">
      <div class="flex items-center gap-3">
        <h1 class="text-sm md:text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest font-display">
          <span v-if="activeView === 'dashboard'">Hai Store Inventory</span>
          <span v-else-if="activeView === 'pos'">POS Terminal</span>
          <span v-else-if="activeView === 'inventory'">Hai Store Inventory</span>
          <span v-else-if="activeView === 'expenses'">Expenses Ledger</span>
          <span v-else-if="activeView === 'partners'">Profit Distribution</span>
          <span v-else-if="activeView === 'reports'">Business Reports</span>
        </h1>
      </div>

      <!-- Dynamic clocks, status & controls -->
      <div class="flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
        <!-- Real-time local timezone clock -->
        <div class="hidden lg:flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] normal-case tracking-normal">
          <Clock class="h-3.5 w-3.5 text-indigo-500" />
          <span>{{ currentTime }}</span>
        </div>

        <!-- Role status badge -->
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Hai Store Live</span>
        </div>

        <div class="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden md:block"></div>

        <!-- Theme Switcher -->
        <button
          @click="darkMode = !darkMode"
          class="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
          title="Toggle theme mode"
        >
          <Sun v-if="darkMode" class="h-4 w-4" />
          <Moon v-else class="h-4 w-4" />
        </button>

        <button
          @click="handleLogout"
          class="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-zinc-700 dark:hover:text-rose-400 transition-colors"
          title="Sign out"
        >
          <LogOut class="h-4 w-4" />
        </button>
      </div>
    </header>

    <!-- VIEWPORT BODY -->
    <div class="flex-1 flex overflow-hidden">
      
      <!-- SIDEBAR NAVIGATION -->
      <aside class="w-64 bg-[#0F172A] dark:bg-zinc-950 text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800 dark:border-zinc-900 p-6 print:hidden">
        <div class="space-y-8">
          <!-- Logo block -->
          <div class="flex items-center gap-3">
            <div class="hai-logo-mark" aria-hidden="true">
              <span class="hai-kana">はい</span>
              <span class="hai-word">Hai</span>
              <span class="hai-dot"></span>
            </div>
            <div>
              <span class="block text-white font-black text-xl tracking-tight uppercase font-display leading-none">Hai Store</span>
              <span class="block text-[#E81221] text-[10px] font-black tracking-[0.18em] uppercase mt-1">Inventory</span>
            </div>
          </div>

          <div class="space-y-1">
            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Operations</span>
            <nav class="space-y-1" id="nav-operations">
              <button
                v-for="item in [
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'pos', label: 'POS Terminal', icon: ShoppingCart },
                  { id: 'inventory', label: 'Inventory', icon: Package }
                ]"
                :key="item.id"
                @click="activeView = item.id"
                :class="['w-full text-left py-2 px-3 rounded-md text-sm font-medium flex items-center gap-3 transition-colors',
                  activeView === item.id
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white dark:hover:bg-zinc-900'
                ]"
              >
                <component :is="item.icon" class="h-4.5 w-4.5" />
                <span>{{ item.label }}</span>
              </button>
            </nav>
          </div>

          <div class="space-y-1">
            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Profit & Ledger</span>
            <nav class="space-y-1" id="nav-ledger">
              <button
                v-for="item in [
                  { id: 'expenses', label: 'Expenses', icon: Receipt },
                  { id: 'partners', label: 'Profit Share', icon: Coins },
                  { id: 'reports', label: 'Reports', icon: FileText }
                ]"
                :key="item.id"
                @click="activeView = item.id"
                :class="['w-full text-left py-2 px-3 rounded-md text-sm font-medium flex items-center gap-3 transition-colors',
                  activeView === item.id
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white dark:hover:bg-zinc-900'
                ]"
              >
                <component :is="item.icon" class="h-4.5 w-4.5" />
                <span>{{ item.label }}</span>
              </button>
            </nav>
          </div>
        </div>

        <!-- Footer of sidebar details -->
        <div class="pt-4 border-t border-slate-800 dark:border-zinc-900 space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-slate-700/60 dark:bg-zinc-800 flex items-center justify-center font-bold text-white text-xs">
              AD
            </div>
            <div>
              <p class="text-white text-xs font-semibold">Hai Store</p>
              <p class="text-[10px] text-slate-400 tracking-wider">STORE OWNER</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- WORKSPACE AREA -->
      <main class="flex-1 overflow-y-auto p-8" id="workspace-viewport">
        <div class="max-w-7xl mx-auto space-y-6 animate-fade-in" id="workspace-inner">
          
          <!-- RENDER ACTIVE SCREEN -->
          <Dashboard 
            v-if="activeView === 'dashboard'"
            :products="activeProducts"
            :transactions="transactions"
            :expenses="activeExpenses"
            @navigate="activeView = $event"
          />

          <Inventory
            v-else-if="activeView === 'inventory'"
            :products="activeProducts"
            :stockMovements="stockMovements"
            @add-product="handleAddProduct"
            @update-product="handleUpdateProduct"
            @delete-product="handleDeleteProduct"
            @adjust-stock="handleAdjustStock"
            @import-products="handleImportProducts"
          />

          <POS
            v-else-if="activeView === 'pos'"
            :products="activeProducts"
            @checkout="handleCheckout"
            @add-toast="addToast"
          />

          <Expenses
            v-else-if="activeView === 'expenses'"
            :expenses="activeExpenses"
            @add-expense="handleAddExpense"
            @delete-expense="handleDeleteExpense"
            @add-toast="addToast"
          />

          <ProfitDistribution
            v-else-if="activeView === 'partners'"
            :partners="activePartners"
            :distributions="distributions"
            :transactions="transactions"
            :expenses="activeExpenses"
            :investor-accounts="investorAccounts"
            @add-partner="handleAddPartner"
            @update-partner-shares="handleUpdatePartnerShares"
            @delete-partner="handleDeletePartner"
            @save-investor-account="handleSaveInvestorAccount"
            @post-distribution="handlePostDistribution"
            @add-toast="addToast"
          />

          <Reports
            v-else-if="activeView === 'reports'"
            :products="activeProducts"
            :transactions="transactions"
            :expenses="activeExpenses"
            :partners="activePartners"
            :distributions="distributions"
            @add-toast="addToast"
          />

        </div>
      </main>
    </div>
    </template>

    <!-- AWS-style delete confirmation modal -->
    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        id="delete-confirmation-modal"
      >
        <div class="w-full max-w-md bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
          <div class="h-1 bg-rose-600"></div>
          <div class="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <div class="mt-0.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                <AlertCircle class="h-5 w-5" />
              </div>
              <div>
                <h3 class="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-zinc-50 font-display">
                  {{ deleteTarget.title }}
                </h3>
                <p class="mt-1 text-xs font-semibold leading-relaxed text-slate-500 dark:text-zinc-400">
                  {{ deleteTarget.details }}
                </p>
              </div>
            </div>
            <button
              @click="closeDeleteConfirmation"
              :disabled="deleteLoading"
              class="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50"
              title="Cancel"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <form @submit.prevent="executeConfirmedDelete" class="p-5 space-y-4 text-xs">
            <div class="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 p-3">
              <p class="font-bold text-rose-700 dark:text-rose-300 leading-relaxed">
                This removes the record from active views but keeps it archived in storage. Type <span class="font-black font-mono">DELETE</span> to confirm.
              </p>
            </div>

            <div>
              <label class="block mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                Confirmation
              </label>
              <input
                v-model="deleteConfirmationText"
                type="text"
                autocomplete="off"
                class="w-full p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono font-black focus:outline-none focus:border-rose-500"
                placeholder="DELETE"
              />
            </div>

            <div class="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                @click="closeDeleteConfirmation"
                :disabled="deleteLoading"
                class="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="deleteConfirmationText !== 'DELETE' || deleteLoading"
                class="flex-1 py-2.5 rounded-lg bg-rose-600 text-white font-black uppercase tracking-widest hover:bg-rose-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {{ deleteLoading ? 'Deleting' : 'Soft Delete' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- TOAST SYSTEM BENCH -->
    <div class="fixed bottom-5 right-5 z-55 flex flex-col gap-2 max-w-sm pointer-events-none" id="toasts-bench">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto bg-zinc-950/95 dark:bg-zinc-900/98 text-white border border-zinc-800 rounded-xl p-3.5 shadow-2xl flex items-start gap-3 animate-slide-in"
      >
        <AlertCircle v-if="t.type === 'error'" class="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
        <CheckCircle v-else class="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        
        <div class="flex-1 text-xs">
          <p class="font-bold text-zinc-100">{{ t.title }}</p>
          <p class="text-zinc-400 mt-1 font-semibold">{{ t.message }}</p>
        </div>

        <button 
          @click="removeToast(t.id)"
          class="text-zinc-500 hover:text-zinc-300 p-0.5"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style>
.hai-logo-mark {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  border: 2px solid #000000;
  background: #FDEDC9;
  color: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 2px rgba(232, 18, 33, 0.14);
  overflow: hidden;
  flex-shrink: 0;
}

.hai-word {
  font-family: "Space Grotesk", sans-serif;
  font-weight: 900;
  font-size: 1rem;
  line-height: 1;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  transform: skew(-8deg);
}

.hai-kana {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  font-size: 0.45rem;
  line-height: 1;
  font-weight: 900;
  writing-mode: vertical-rl;
}

.hai-dot {
  position: absolute;
  top: 0.3rem;
  right: 0.25rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 9999px;
  background: #E81221;
}

/* Clean layout fade transitions */
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

.animate-slide-in {
  animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
