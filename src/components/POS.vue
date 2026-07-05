<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Minus, 
  Plus, 
  User, 
  Percent, 
  CreditCard, 
  Sparkles,
  Barcode,
  Coins,
  CheckCircle,
  ShoppingBag,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { Product, CartItem, PaymentMethod } from '../types';
import { formatPHP } from '../utils';

// Props & Emits
const props = defineProps<{
  products: Product[];
}>();

const emit = defineEmits<{
  (e: 'checkout', items: CartItem[], paymentMethod: PaymentMethod, discountPercent: number, customerName?: string): void;
  (e: 'add-toast', title: string, message: string, type: 'success' | 'error'): void;
}>();

const CATEGORIES = ['All', 'Footwear', 'Headwear', 'Apparel', 'Accessories', 'Others'];

// POS States
const searchQuery = ref('');
const selectedCategory = ref('All');
const cart = ref<CartItem[]>([]);
const customerName = ref('');
const transactionDiscount = ref<number>(0);
const paymentMethod = ref<PaymentMethod>('Cash');
const cashAmountPaid = ref<string>('');

// Barcode simulation input
const barcodeInput = ref('');
const barcodeInputRef = ref<HTMLInputElement | null>(null);

// Active products filter
const activeProducts = computed(() => {
  return props.products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.barcode.includes(searchQuery.value);
    
    const matchesCategory = selectedCategory.value === 'All' || p.category === selectedCategory.value;
    
    return matchesSearch && matchesCategory;
  });
});

// Add Item to Cart
const handleAddToCart = (product: Product) => {
  if (product.currentStock <= 0) {
    emit('add-toast', 'Stock Warning', `${product.name} is out of stock!`, 'error');
    return;
  }

  const existingIndex = cart.value.findIndex(item => item.product.id === product.id);
  if (existingIndex !== -1) {
    const existing = cart.value[existingIndex];
    if (existing.quantity >= product.currentStock) {
      emit('add-toast', 'Stock Limit', `Cannot sell more than available stock (${product.currentStock}).`, 'error');
      return;
    }
    cart.value[existingIndex].quantity += 1;
  } else {
    cart.value.push({ product, quantity: 1, discount: 0 });
  }
};

// Simulating Barcode Scan
const handleBarcodeSubmit = () => {
  if (!barcodeInput.value.trim()) return;

  const matchedProduct = props.products.find(p => 
    p.barcode === barcodeInput.value.trim() || 
    p.sku.toLowerCase() === barcodeInput.value.trim().toLowerCase()
  );
  
  if (matchedProduct) {
    handleAddToCart(matchedProduct);
    barcodeInput.value = '';
    emit('add-toast', 'Barcode Scanned', `Scanned: ${matchedProduct.name}`, 'success');
  } else {
    emit('add-toast', 'Scan Error', `No product found with Barcode/SKU: ${barcodeInput.value}`, 'error');
  }
};

// Update Cart Quantity
const handleUpdateQuantity = (productId: string, delta: number) => {
  const existingIndex = cart.value.findIndex(item => item.product.id === productId);
  if (existingIndex === -1) return;

  const item = cart.value[existingIndex];
  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    cart.value.splice(existingIndex, 1);
    return;
  }

  if (newQty > item.product.currentStock) {
    emit('add-toast', 'Stock Limit', `Cannot exceed available stock of ${item.product.currentStock}.`, 'error');
    return;
  }

  cart.value[existingIndex].quantity = newQty;
};

// Update Item Discount
const handleUpdateItemDiscount = (productId: string, discountVal: number) => {
  const existingIndex = cart.value.findIndex(item => item.product.id === productId);
  if (existingIndex === -1) return;

  cart.value[existingIndex].discount = Math.min(100, Math.max(0, discountVal));
};

// Remove item from Cart
const handleRemoveFromCart = (productId: string) => {
  cart.value = cart.value.filter(item => item.product.id !== productId);
};

// Clear POS Cart
const handleClearCart = () => {
  cart.value = [];
  customerName.value = '';
  transactionDiscount.value = 0;
  cashAmountPaid.value = '';
};

// Cart Calculations
const totals = computed(() => {
  let subtotal = 0;
  let itemDiscountsTotal = 0;

  cart.value.forEach(item => {
    const originalPrice = item.product.sellingPrice * item.quantity;
    const discountAmount = originalPrice * (item.discount / 100);
    subtotal += originalPrice;
    itemDiscountsTotal += discountAmount;
  });

  const subtotalAfterItemDiscounts = subtotal - itemDiscountsTotal;
  const globalDiscountAmount = subtotalAfterItemDiscounts * (transactionDiscount.value / 100);
  const totalDiscount = itemDiscountsTotal + globalDiscountAmount;
  const total = Math.max(0, subtotal - totalDiscount);

  let costOfGoodsSold = 0;
  cart.value.forEach(item => {
    costOfGoodsSold += item.product.costPrice * item.quantity;
  });

  const profit = Math.max(0, total - costOfGoodsSold);

  return {
    subtotal,
    totalDiscount,
    total,
    costOfGoodsSold,
    profit
  };
});

// Checkout process
const handleCheckoutSubmit = () => {
  if (cart.value.length === 0) {
    emit('add-toast', 'POS Cart Empty', 'Please add products to checkout.', 'error');
    return;
  }

  if (paymentMethod.value === 'Cash' && cashAmountPaid.value !== '') {
    const paid = Number(cashAmountPaid.value);
    if (paid < totals.value.total) {
      emit('add-toast', 'Insufficient Cash', `Cash paid (${formatPHP(paid)}) is less than total amount due (${formatPHP(totals.value.total)}).`, 'error');
      return;
    }
  }

  emit('checkout', cart.value, paymentMethod.value, transactionDiscount.value, customerName.value.trim() || undefined);
  handleClearCart();
};

// Cash Change Calculation
const changeDue = computed(() => {
  if (paymentMethod.value !== 'Cash' || !cashAmountPaid.value) return 0;
  const paid = Number(cashAmountPaid.value);
  return Math.max(0, paid - totals.value.total);
});
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="pos-view">
    <!-- LEFT COLUMN: Product Catalog (7 cols) -->
    <div class="lg:col-span-7 space-y-4" id="pos-catalog-column">
      <!-- Search, Categories, and Barcode Simulation -->
      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl space-y-3.5 shadow-sm">
        <div class="flex flex-col sm:flex-row gap-3">
          <!-- Catalog search -->
          <div class="relative flex-1">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <Search class="h-4 w-4" />
            </span>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Type to search products..."
              class="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <!-- Barcode Simulator input -->
          <form @submit.prevent="handleBarcodeSubmit" class="relative w-full sm:w-56 flex gap-1">
            <div class="relative flex-1">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Barcode class="h-4 w-4" />
              </span>
              <input
                type="text"
                ref="barcodeInputRef"
                v-model="barcodeInput"
                placeholder="Simulate Barcode / SKU Scan"
                class="w-full pl-9 pr-2 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
              />
            </div>
            <button 
              type="submit"
              class="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 p-2 rounded-lg border border-slate-200 dark:border-zinc-750 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Scan
            </button>
          </form>
        </div>

        <!-- Quick-links of Categories -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin" id="category-scroller">
          <button
            v-for="cat in CATEGORIES"
            :key="cat"
            @click="selectedCategory = cat"
            :class="['px-3 py-1.5 text-[11px] font-semibold rounded-full shrink-0 transition-all uppercase tracking-wider',
              selectedCategory === cat
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            ]"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- Catalog Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3" id="pos-products-grid">
        <div v-if="activeProducts.length === 0" class="col-span-full bg-white dark:bg-zinc-900 border border-dashed border-slate-200 dark:border-zinc-800 p-12 text-center text-zinc-400 text-xs">
          No products match search criteria.
        </div>
        <button
          v-else
          v-for="p in activeProducts"
          :key="p.id"
          :disabled="p.currentStock === 0"
          @click="handleAddToCart(p)"
          :class="['bg-white dark:bg-zinc-900 border text-left rounded-xl p-3.5 relative overflow-hidden transition-all flex flex-col justify-between duration-150',
            p.currentStock === 0 
              ? 'opacity-40 border-slate-100 dark:border-zinc-800 cursor-not-allowed' 
              : 'border-slate-200 dark:border-zinc-850 hover:border-indigo-500/80 dark:hover:border-indigo-500/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
          ]"
        >
          <div>
            <!-- Emojis thumbnail -->
            <div class="flex justify-between items-start">
              <span class="text-2xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center w-9 h-9 rounded-lg border border-slate-100 dark:border-zinc-700/50">
                {{ p.image }}
              </span>
              <span v-if="p.currentStock > 0 && p.currentStock <= p.minimumStock" class="bg-amber-50 dark:bg-amber-950/20 text-amber-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                Low Stock
              </span>
              <span v-else-if="p.currentStock === 0" class="bg-rose-50 dark:bg-rose-950/20 text-rose-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                Sold Out
              </span>
            </div>

            <h4 class="font-bold text-xs text-slate-800 dark:text-zinc-100 mt-3 line-clamp-2">{{ p.name }}</h4>
            <p class="text-[10px] text-zinc-400 mt-1 font-semibold">{{ p.brand }} • SKU: {{ p.sku }}</p>
          </div>

          <div class="flex items-center justify-between mt-4 pt-2 border-t border-slate-50 dark:border-zinc-800/60">
            <span class="font-bold text-sm text-slate-900 dark:text-zinc-50">{{ formatPHP(p.sellingPrice) }}</span>
            <span class="text-[10px] text-zinc-400 font-mono font-bold">Qty: {{ p.currentStock }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- RIGHT COLUMN: Active Cart / Billing Form (5 cols) -->
    <div class="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[580px]" id="pos-billing-column">
      <div>
        <!-- Header -->
        <div class="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <h4 class="font-bold text-xs uppercase tracking-widest text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 font-display">
            <ShoppingCart class="h-4 w-4 text-indigo-500" /> Active Checkout
          </h4>
          <button 
            v-if="cart.length > 0"
            @click="handleClearCart"
            class="text-[11px] font-black uppercase tracking-wider text-rose-600 hover:underline"
          >
            Clear Cart
          </button>
        </div>

        <!-- Cart items list -->
        <div class="divide-y divide-slate-100 dark:divide-zinc-800 max-h-64 overflow-y-auto mt-2 pr-1" id="cart-items-list">
          <div v-if="cart.length === 0" class="py-16 text-center text-zinc-400 text-xs">
            <div class="flex flex-col items-center gap-2">
              <ShoppingBag class="h-7 w-7 text-zinc-300" />
              <span class="font-bold uppercase tracking-wider text-[10px]">Cart is empty. Tap products to sell</span>
            </div>
          </div>
          <div v-else v-for="item in cart" :key="item.product.id" class="py-3 text-xs flex flex-col gap-1.5">
            <div class="flex justify-between items-start gap-2">
              <div class="flex items-center gap-2">
                <span class="text-base bg-slate-100 dark:bg-zinc-800 p-1 rounded-md">{{ item.product.image }}</span>
                <div>
                  <p class="font-bold text-slate-800 dark:text-zinc-200 line-clamp-1">{{ item.product.name }}</p>
                  <p class="text-[10px] text-zinc-400 font-semibold">{{ formatPHP(item.product.sellingPrice) }} each</p>
                </div>
              </div>
              <span class="font-bold text-slate-900 dark:text-zinc-100">
                {{ formatPHP((item.product.sellingPrice * item.quantity) * (1 - item.discount / 100)) }}
              </span>
            </div>

            <div class="flex justify-between items-center pl-8">
              <!-- Qty count control -->
              <div class="flex items-center gap-2 border border-slate-200 dark:border-zinc-700 rounded-md py-0.5 px-1.5 bg-slate-50 dark:bg-zinc-800/20">
                <button 
                  @click="handleUpdateQuantity(item.product.id, -1)"
                  class="text-zinc-500 hover:text-zinc-700"
                >
                  <Minus class="h-3 w-3" />
                </button>
                <span class="font-mono font-bold w-6 text-center text-[11px]">{{ item.quantity }}</span>
                <button 
                  @click="handleUpdateQuantity(item.product.id, 1)"
                  class="text-zinc-500 hover:text-zinc-700"
                >
                  <Plus class="h-3 w-3" />
                </button>
              </div>

              <!-- Per item discount input -->
              <div class="flex items-center gap-1">
                <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Disc:</span>
                <div class="relative w-14">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    :value="item.discount"
                    @input="handleUpdateItemDiscount(item.product.id, Number(($event.target as HTMLInputElement).value))"
                    class="w-full text-right pr-4 py-0.5 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md font-bold text-zinc-850"
                  />
                  <span class="absolute right-1 top-0.5 text-[10px] text-zinc-400">%</span>
                </div>
                <button
                  @click="handleRemoveFromCart(item.product.id)"
                  class="p-1 text-zinc-400 hover:text-rose-500 ml-1.5 transition-colors"
                  title="Remove item"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer, Discount & Checkout Form -->
      <div class="border-t border-slate-100 dark:border-zinc-800 pt-4 mt-4 space-y-3" id="pos-billing-form">
        <div class="grid grid-cols-2 gap-2 text-xs">
          <!-- Customer input -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-0.5 uppercase tracking-widest">Customer Name</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400">
                <User class="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                v-model="customerName"
                placeholder="Guest Walk-in"
                class="w-full pl-8 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
          </div>

          <!-- Global Invoice Discount -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-0.5 uppercase tracking-widest">Invoice Discount %</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400">
                <Percent class="h-3.5 w-3.5" />
              </span>
              <input
                type="number"
                min="0"
                max="100"
                v-model="transactionDiscount"
                placeholder="0"
                class="w-full pl-8 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-850 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>
          </div>
        </div>

        <!-- Payment Method Selector -->
        <div>
          <label class="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1 uppercase tracking-widest">Payment Channel</label>
          <div class="grid grid-cols-4 gap-1.5" id="payment-methods">
            <button
              v-for="pm in (['Cash', 'GCash', 'Maya', 'Bank Transfer'] as PaymentMethod[])"
              :key="pm"
              type="button"
              @click="paymentMethod = pm; if (pm !== 'Cash') cashAmountPaid = ''"
              :class="['py-2 px-1 text-[10px] border rounded-lg font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all',
                paymentMethod === pm
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'border-slate-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              ]"
            >
              <Coins v-if="pm === 'Cash'" class="h-3.5 w-3.5" />
              <Sparkles v-else-if="pm === 'GCash'" class="h-3.5 w-3.5" />
              <CreditCard v-else-if="pm === 'Maya'" class="h-3.5 w-3.5" />
              <Receipt v-else class="h-3.5 w-3.5" />
              {{ pm }}
            </button>
          </div>
        </div>

        <!-- Cash Payment Helper -->
        <div v-if="paymentMethod === 'Cash'" class="p-3 bg-slate-50 dark:bg-zinc-850 rounded-lg space-y-2 text-xs border border-slate-100 dark:border-zinc-800">
          <div class="flex justify-between items-center">
            <span class="font-bold uppercase tracking-wider text-[10px] text-slate-500">Cash Received (PHP)</span>
            <input
              type="number"
              placeholder="₱0.00"
              v-model="cashAmountPaid"
              class="w-28 p-1 text-right bg-white dark:bg-zinc-900 border border-slate-250 dark:border-zinc-700 rounded-md font-mono font-bold text-zinc-850"
            />
          </div>
          <div v-if="cashAmountPaid" class="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
            <span class="font-bold uppercase tracking-wider text-[10px]">Change Due</span>
            <span class="font-mono text-sm font-black">{{ formatPHP(changeDue) }}</span>
          </div>
        </div>

        <!-- Totals Box -->
        <div class="bg-[#F8FAFC] dark:bg-zinc-850 p-3.5 rounded-xl space-y-2 text-xs border border-slate-100 dark:border-zinc-800" id="pos-totals">
          <div class="flex justify-between items-center text-zinc-500">
            <span class="font-bold uppercase tracking-wider text-[10px]">Subtotal:</span>
            <span class="font-mono font-bold">{{ formatPHP(totals.subtotal) }}</span>
          </div>
          <div v-if="totals.totalDiscount > 0" class="flex justify-between items-center text-rose-500 font-bold">
            <span class="font-bold uppercase tracking-wider text-[10px]">Total Discounts:</span>
            <span class="font-mono">-{formatPHP(totals.totalDiscount)}</span>
          </div>
          <div class="flex justify-between items-center border-t border-slate-200 dark:border-zinc-700 pt-2 text-[11px] font-black text-slate-700 dark:text-zinc-100 uppercase tracking-widest">
            <span>Grand Total Due:</span>
            <span class="font-mono text-base text-indigo-600 dark:text-indigo-400 font-black">{{ formatPHP(totals.total) }}</span>
          </div>
        </div>

        <!-- Checkout Trigger -->
        <button
          @click="handleCheckoutSubmit"
          :disabled="cart.length === 0"
          :class="['w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 text-xs text-white uppercase tracking-widest transition-all active:scale-98',
            cart.length === 0
              ? 'bg-zinc-200 dark:bg-zinc-800 cursor-not-allowed text-zinc-400'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
          ]"
        >
          <CheckCircle class="h-4.5 w-4.5" /> Confirm & Post Checkout <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
