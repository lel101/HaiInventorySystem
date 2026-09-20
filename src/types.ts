export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  supplier: string;
  costPrice: number;
  sellingPrice: number;
  /** Suggested retail price used for promotional comparisons in the guest catalog. */
  srpPrice?: number;
  /** Public retail price displayed in the guest catalog. */
  storePrice: number;
  currentStock: number;
  minimumStock: number;
  image: string;
  /** Public URL from Supabase Storage (or another image host). */
  imageUrl?: string;
  /** Apparel sizes offered by this SKU. Stock remains tracked at the SKU level. */
  apparelSizes?: string[];
  /** US shoe sizing, optionally marked for men's or women's fit. */
  shoeGender?: 'Men' | 'Women';
  shoeSizes?: number[];
  /** Remaining units keyed by an offered apparel or US shoe size. */
  sizeStocks?: Record<string, number>;
  inventoryType?: 'owned' | 'consignment';
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  createdAt: string;
  deletedAt?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'In' | 'Out' | 'Adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer';

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // percentage or fixed amount, let's treat as percentage
  selectedSize?: string;
}

export interface Transaction {
  id: string;
  invoiceNo: string;
  items: {
    productId: string;
    name: string;
    sku: string;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
    discount: number; // percentage
    totalPrice: number;
    selectedSize?: string;
    inventoryType?: 'owned' | 'consignment';
  }[];
  subtotal: number;
  discountAmount: number;
  total: number;
  costOfGoodsSold: number;
  profit: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: 'Rent' | 'Salary' | 'Electricity' | 'Internet' | 'Marketing' | 'Transportation' | 'Miscellaneous';
  amount: number;
  description: string;
  date: string;
  inventoryType?: 'owned' | 'consignment';
  receiptImage?: string; // Base64 or mock file path
  createdAt: string;
  deletedAt?: string;
}

export interface Partner {
  id: string;
  name: string;
  sharePercentage: number;
  deletedAt?: string;
}

export interface ProfitDistributionRecord {
  id: string;
  month: string; // YYYY-MM
  revenue: number;
  cogs: number;
  expenses: number;
  netProfit: number;
  distributedAmount: number; // usually same as net profit or what they decide
  distributions: {
    partnerId: string;
    partnerName: string;
    percentage: number;
    amount: number;
  }[];
  createdAt: string;
}

export interface ConsignmentWithdrawal {
  id: string;
  month: string; // YYYY-MM
  amount: number;
  note: string;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export type UserRole = 'admin' | 'investor';

export interface AuthUser {
  username: string;
  role: UserRole;
  partnerId?: string;
}

export interface InvestorAccount {
  id: string;
  partnerId: string;
  username: string;
  password: string;
  updatedAt: string;
  deletedAt?: string;
}
