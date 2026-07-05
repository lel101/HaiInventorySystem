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
  currentStock: number;
  minimumStock: number;
  image: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  createdAt: string;
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
  receiptImage?: string; // Base64 or mock file path
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  sharePercentage: number;
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

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}
