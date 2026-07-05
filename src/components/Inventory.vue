<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Plus, 
  Search, 
  FileDown, 
  FileUp, 
  Copy, 
  Edit2, 
  Trash2, 
  Package, 
  AlertCircle, 
  X, 
  ChevronLeft, 
  ChevronRight,
  TrendingDown, 
  TrendingUp, 
  AlertTriangle 
} from 'lucide-react';
import { Product, StockMovement } from '../types';
import { formatPHP, generateSKU, generateBarcode, exportToCSV, parseCSV } from '../utils';

// Props & Emits
const props = defineProps<{
  products: Product[];
  stockMovements: StockMovement[];
}>();

const emit = defineEmits<{
  (e: 'add-product', product: Omit<Product, 'id' | 'createdAt' | 'status'>): void;
  (e: 'update-product', product: Product): void;
  (e: 'delete-product', id: string): void;
  (e: 'adjust-stock', productId: string, quantity: number, type: 'In' | 'Out' | 'Adjustment', reason: string): void;
  (e: 'import-products', imported: Omit<Product, 'id' | 'createdAt' | 'status'>[]): void;
}>();

const CATEGORIES = ['Footwear', 'Headwear', 'Apparel', 'Accessories', 'Others'];
const EMOJIS = ['👟', '👕', '🧢', '🧥', '🎒', '🧦', '🕶️', '🧣', '💼', '📦'];

// Component State
const searchQuery = ref('');
const categoryFilter = ref('All');
const statusFilter = ref('All');
const activeTab = ref<'list' | 'history'>('list');

// Pagination
const currentPage = ref(1);
const itemsPerPage = 8;

// Modals State
const isProductModalOpen = ref(false);
const isAdjustModalOpen = ref(false);
const editingProduct = ref<Product | null>(null);

// CSV Import Ref
const fileInputRef = ref<HTMLInputElement | null>(null);

// Form States for Add/Edit
const name = ref('');
const sku = ref('');
const barcode = ref('');
const description = ref('');
const category = ref('Others');
const brand = ref('');
const supplier = ref('');
const costPrice = ref(0);
const sellingPrice = ref(0);
const currentStock = ref(0);
const minimumStock = ref(5);
const image = ref('📦');

// Form States for Stock Adjustment
const adjustingProduct = ref<Product | null>(null);
const adjustQuantity = ref(0);
const adjustType = ref<'In' | 'Out' | 'Adjustment'>('Adjustment');
const adjustReason = ref('');

// Open Add Modal
const handleOpenAddModal = () => {
  editingProduct.value = null;
  name.value = '';
  sku.value = generateSKU(CATEGORIES[0], '');
  barcode.value = generateBarcode();
  description.value = '';
  category.value = 'Others';
  brand.value = '';
  supplier.value = '';
  costPrice.value = 0;
  sellingPrice.value = 0;
  currentStock.value = 0;
  minimumStock.value = 5;
  image.value = '📦';
  isProductModalOpen.value = true;
};

// Duplicate Product
const handleDuplicate = (product: Product) => {
  editingProduct.value = null;
  name.value = `${product.name} (Copy)`;
  sku.value = generateSKU(product.category, product.name);
  barcode.value = generateBarcode();
  description.value = product.description;
  category.value = product.category;
  brand.value = product.brand;
  supplier.value = product.supplier;
  costPrice.value = product.costPrice;
  sellingPrice.value = product.sellingPrice;
  currentStock.value = product.currentStock;
  minimumStock.value = product.minimumStock;
  image.value = product.image;
  isProductModalOpen.value = true;
};

// Edit Modal
const handleOpenEditModal = (product: Product) => {
  editingProduct.value = product;
  name.value = product.name;
  sku.value = product.sku;
  barcode.value = product.barcode;
  description.value = product.description;
  category.value = product.category;
  brand.value = product.brand;
  supplier.value = product.supplier;
  costPrice.value = product.costPrice;
  sellingPrice.value = product.sellingPrice;
  currentStock.value = product.currentStock;
  minimumStock.value = product.minimumStock;
  image.value = product.image;
  isProductModalOpen.value = true;
};

// Auto SKU Generator Helper
const handleAutoDetails = () => {
  if (name.value.trim()) {
    sku.value = generateSKU(category.value, name.value);
  }
};

// Submit Product Form
const handleProductSubmit = () => {
  if (!name.value.trim()) return;

  const data = {
    sku: sku.value,
    barcode: barcode.value,
    name: name.value.trim(),
    description: description.value.trim(),
    category: category.value,
    brand: brand.value.trim(),
    supplier: supplier.value.trim(),
    costPrice: Number(costPrice.value) || 0,
    sellingPrice: Number(sellingPrice.value) || 0,
    currentStock: Number(currentStock.value) || 0,
    minimumStock: Number(minimumStock.value) || 0,
    image: image.value,
  };

  if (editingProduct.value) {
    emit('update-product', {
      ...editingProduct.value,
      ...data,
    });
  } else {
    emit('add-product', data);
  }
  isProductModalOpen.value = false;
};

// Open Adjust Modal
const handleOpenAdjustModal = (product: Product) => {
  adjustingProduct.value = product;
  adjustQuantity.value = 0;
  adjustType.value = 'Adjustment';
  adjustReason.value = '';
  isAdjustModalOpen.value = true;
};

// Submit Stock Adjustment
const handleAdjustSubmit = () => {
  if (!adjustingProduct.value) return;
  emit('adjust-stock', adjustingProduct.value.id, adjustQuantity.value, adjustType.value, adjustReason.value || 'Manual Stock Adjustment');
  isAdjustModalOpen.value = false;
};

// Export CSV
const handleExport = () => {
  const headers = ['SKU', 'Barcode', 'Name', 'Description', 'Category', 'Brand', 'Supplier', 'Cost Price', 'Selling Price', 'Current Stock', 'Minimum Stock'];
  const rows = props.products.map(p => [
    p.sku,
    p.barcode,
    p.name,
    p.description,
    p.category,
    p.brand,
    p.supplier,
    p.costPrice.toString(),
    p.sellingPrice.toString(),
    p.currentStock.toString(),
    p.minimumStock.toString()
  ]);
  exportToCSV(headers, rows, `Inventory_Report_${new Date().toISOString().slice(0, 10)}`);
};

// Import CSV
const handleImportClick = () => {
  fileInputRef.value?.click();
};

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target?.result as string;
    if (!text) return;

    const rows = parseCSV(text);
    if (rows.length <= 1) return;

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const importedProducts: Omit<Product, 'id' | 'createdAt' | 'status'>[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

      const pSku = row[headers.indexOf('sku')] || generateSKU('GEN', row[headers.indexOf('name')] || 'IMPORTED');
      const pBarcode = row[headers.indexOf('barcode')] || generateBarcode();
      const pName = row[headers.indexOf('name')] || 'Imported Product';
      const pDesc = row[headers.indexOf('description')] || '';
      const pCat = row[headers.indexOf('category')] || 'Others';
      const pBrand = row[headers.indexOf('brand')] || 'Generic';
      const pSupplier = row[headers.indexOf('supplier')] || 'Unknown';
      const pCost = Number(row[headers.indexOf('cost price')]) || 0;
      const pSell = Number(row[headers.indexOf('selling price')]) || 0;
      const pStock = Number(row[headers.indexOf('current stock')]) || 0;
      const pMin = Number(row[headers.indexOf('minimum stock')]) || 5;

      importedProducts.push({
        sku: pSku,
        barcode: pBarcode,
        name: pName,
        description: pDesc,
        category: pCat,
        brand: pBrand,
        supplier: pSupplier,
        costPrice: pCost,
        sellingPrice: pSell,
        currentStock: pStock,
        minimumStock: pMin,
        image: '📦'
      });
    }

    if (importedProducts.length > 0) {
      emit('import-products', importedProducts);
    }
  };
  reader.readAsText(file);
  target.value = '';
};

// Filter Products
const filteredProducts = computed(() => {
  return props.products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.barcode.includes(searchQuery.value) ||
      p.brand.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesCategory = categoryFilter.value === 'All' || p.category === categoryFilter.value;
    
    const matchesStatus = statusFilter.value === 'All' || 
      (statusFilter.value === 'In Stock' && p.currentStock > p.minimumStock) ||
      (statusFilter.value === 'Low Stock' && p.currentStock > 0 && p.currentStock <= p.minimumStock) ||
      (statusFilter.value === 'Out of Stock' && p.currentStock === 0);

    return matchesSearch && matchesCategory && matchesStatus;
  });
});

// Paginate Products
const paginatedProducts = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  return filteredProducts.value.slice(startIndex, startIndex + itemsPerPage);
});

const totalPages = computed(() => {
  return Math.ceil(filteredProducts.value.length / itemsPerPage);
});

// Stats Computation
const stats = computed(() => {
  const totalItems = props.products.length;
  const lowStockItems = props.products.filter(p => p.currentStock > 0 && p.currentStock <= p.minimumStock).length;
  const outOfStockItems = props.products.filter(p => p.currentStock === 0).length;
  const totalValue = props.products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);

  return { totalItems, lowStockItems, outOfStockItems, totalValue };
});

const handleDelete = (id: string) => {
  const item = props.products.find(p => p.id === id);
  if (!item) return;
  if (window.confirm(`Are you sure you want to permanently delete SKU: ${item.sku} - ${item.name}?`)) {
    emit('delete-product', id);
  }
};
</script>

<template>
  <div class="space-y-6" id="inventory-view">
    <!-- Mini Stats Summary -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="inv-summary-grid">
      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm flex items-center gap-4">
        <div class="p-3.5 bg-slate-100 dark:bg-zinc-800/60 rounded-xl text-slate-700 dark:text-zinc-300">
          <Package class="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Total SKUs</p>
          <h4 class="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight font-display">{{ stats.totalItems }}</h4>
        </div>
      </div>

      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm flex items-center gap-4">
        <div class="p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl text-amber-500">
          <AlertCircle class="h-5 w-5" />
        </div>
        <div>
          <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Low Stock Items</p>
          <h4 class="text-2xl font-black text-amber-600 dark:text-amber-550 tracking-tight font-display">{{ stats.lowStockItems }}</h4>
        </div>
      </div>

      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm flex items-center gap-4">
        <div class="p-3.5 bg-rose-50 dark:bg-rose-950/20 rounded-xl text-rose-500">
          <AlertTriangle class="h-5 w-5" />
        </div>
        <div>
          <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Out of Stock</p>
          <h4 class="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-display">{{ stats.outOfStockItems }}</h4>
        </div>
      </div>

      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm flex items-center gap-4">
        <div class="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl text-indigo-500">
          <TrendingUp class="h-5 w-5" />
        </div>
        <div>
          <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Total Cost Valuation</p>
          <h4 class="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight font-display">{{ formatPHP(stats.totalValue) }}</h4>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-slate-200 dark:border-zinc-800" id="inv-tabs">
      <button
        @click="activeTab = 'list'"
        :class="['px-4 py-2.5 font-bold text-xs uppercase tracking-widest border-b-2 transition-all -mb-[2px]',
          activeTab === 'list' 
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
            : 'border-transparent text-slate-400 hover:text-slate-600'
        ]"
      >
        Product Catalog
      </button>
      <button
        @click="activeTab = 'history'"
        :class="['px-4 py-2.5 font-bold text-xs uppercase tracking-widest border-b-2 transition-all -mb-[2px]',
          activeTab === 'history' 
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
            : 'border-transparent text-slate-400 hover:text-slate-600'
        ]"
      >
        Stock Movement Log
      </button>
    </div>

    <!-- Tab 1: List view -->
    <div v-if="activeTab === 'list'" class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm" id="inv-list-container">
      <!-- Filters Bar -->
      <div class="p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div class="relative w-full md:w-80">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <Search class="h-4 w-4" />
          </span>
          <input
            type="text"
            v-model="searchQuery"
            @input="currentPage = 1"
            placeholder="Search products, SKU, barcode..."
            class="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <!-- Category Filter -->
          <select
            v-model="categoryFilter"
            @change="currentPage = 1"
            class="text-xs bg-zinc-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 rounded-lg py-2 px-3 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 font-semibold"
          >
            <option value="All">All Categories</option>
            <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
          </select>

          <!-- Status Filter -->
          <select
            v-model="statusFilter"
            @change="currentPage = 1"
            class="text-xs bg-zinc-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 rounded-lg py-2 px-3 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 font-semibold"
          >
            <option value="All">All Statuses</option>
            <option value="In Stock">In Stock Only</option>
            <option value="Low Stock">Low Stock Alerts</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>

          <!-- Action buttons -->
          <div class="flex items-center gap-1.5 ml-auto md:ml-0 font-bold uppercase tracking-wider text-[10px]">
            <button 
              @click="handleImportClick"
              class="p-2 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex items-center gap-1 text-[10px]"
              title="Import CSV"
            >
              <FileUp class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Import</span>
            </button>
            <input 
              type="file" 
              ref="fileInputRef" 
              @change="handleFileChange" 
              accept=".csv" 
              class="hidden" 
            />

            <button 
              @click="handleExport"
              class="p-2 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex items-center gap-1 text-[10px]"
              title="Export CSV"
            >
              <FileDown class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Export</span>
            </button>

            <button 
              @click="handleOpenAddModal"
              class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 text-[10px] font-black"
            >
              <Plus class="h-4 w-4" /> Add SKU
            </button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-[#F8FAFC] dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800/60 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
              <th class="p-4">Product</th>
              <th class="p-4">SKU / Barcode</th>
              <th class="p-4">Category</th>
              <th class="p-4">Pricing</th>
              <th class="p-4 text-center">Stock</th>
              <th class="p-4 text-center">Status</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/50">
            <tr v-if="paginatedProducts.length === 0">
              <td colspan="7" class="p-8 text-center text-zinc-400">
                <div class="flex flex-col items-center justify-center space-y-2">
                  <Package class="h-8 w-8 text-zinc-300" />
                  <span class="font-bold uppercase tracking-wider text-[10px]">No products found matching filters</span>
                </div>
              </td>
            </tr>
            <tr v-else v-for="p in paginatedProducts" :key="p.id" class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
              <!-- Product Info -->
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <span class="text-xl w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 flex items-center justify-center">
                    {{ p.image }}
                  </span>
                  <div>
                    <p class="font-bold text-slate-850 dark:text-zinc-200">{{ p.name }}</p>
                    <p class="text-[10px] text-zinc-400 font-semibold mt-0.5">{{ p.brand }} • {{ p.supplier }}</p>
                  </div>
                </div>
              </td>

              <!-- SKU/Barcode -->
              <td class="p-4 font-mono text-[11px] text-slate-600 dark:text-zinc-300 font-semibold">
                <div>{{ p.sku }}</div>
                <div class="text-[10px] text-zinc-400">{{ p.barcode }}</div>
              </td>

              <!-- Category -->
              <td class="p-4">
                <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
                  {{ p.category }}
                </span>
              </td>

              <!-- Pricing -->
              <td class="p-4">
                <div>
                  <span class="font-bold text-slate-900 dark:text-zinc-100">{{ formatPHP(p.sellingPrice) }}</span>
                </div>
                <div class="text-[10px] text-zinc-400 font-semibold">Cost: {{ formatPHP(p.costPrice) }}</div>
              </td>

              <!-- Stock -->
              <td class="p-4 text-center font-mono">
                <span class="font-bold text-sm">{{ p.currentStock }}</span>
                <span class="text-[10px] text-zinc-400 block font-semibold">Min: {{ p.minimumStock }}</span>
              </td>

              <!-- Status -->
              <td class="p-4 text-center">
                <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold',
                  p.currentStock === 0 
                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' 
                    : p.currentStock <= p.minimumStock 
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500' 
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                ]">
                  {{ p.currentStock === 0 ? 'OUT OF STOCK' : p.currentStock <= p.minimumStock ? 'LOW STOCK' : 'IN STOCK' }}
                </span>
              </td>

              <!-- Operations -->
              <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click="handleOpenAdjustModal(p)"
                    class="p-1.5 border border-slate-200 dark:border-zinc-700 rounded-md text-zinc-500 hover:text-emerald-600 hover:border-emerald-250 dark:hover:text-emerald-400"
                    title="Stock Adjustment"
                  >
                    <TrendingUp class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="handleDuplicate(p)"
                    class="p-1.5 border border-slate-200 dark:border-zinc-700 rounded-md text-zinc-500 hover:text-indigo-500 hover:border-indigo-250"
                    title="Duplicate SKU"
                  >
                    <Copy class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="handleOpenEditModal(p)"
                    class="p-1.5 border border-slate-200 dark:border-zinc-700 rounded-md text-zinc-500 hover:text-emerald-600"
                    title="Edit Details"
                  >
                    <Edit2 class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="handleDelete(p.id)"
                    class="p-1.5 border border-slate-200 dark:border-zinc-700 rounded-md text-zinc-500 hover:text-rose-600 hover:border-rose-250"
                    title="Delete SKU"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Controls -->
      <div v-if="totalPages > 1" class="p-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <span>Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredProducts.length) }} of {{ filteredProducts.length }} entries</span>
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage === 1"
            @click="currentPage = Math.max(currentPage - 1, 1)"
            class="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <span class="px-3 font-semibold text-zinc-800 dark:text-zinc-200">Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            :disabled="currentPage === totalPages"
            @click="currentPage = Math.min(currentPage + 1, totalPages)"
            class="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Tab 2: Stock History -->
    <div v-else class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm" id="inv-history-container">
      <div class="p-4 border-b border-slate-100 dark:border-zinc-800">
        <h4 class="font-bold text-slate-800 dark:text-zinc-50 uppercase tracking-wider text-xs">Stock Movements History</h4>
        <p class="text-[11px] text-zinc-400 mt-0.5">Audit log of all stock increases, deductions, and adjustments</p>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-zinc-50/50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/60 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
              <th class="p-4">Timestamp</th>
              <th class="p-4">Product Name</th>
              <th class="p-4">Movement Type</th>
              <th class="p-4 text-center">Qty Offset</th>
              <th class="p-4 text-center">Previous Stock</th>
              <th class="p-4 text-center">New Stock</th>
              <th class="p-4">Reason / Notes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/50">
            <tr v-if="stockMovements.length === 0">
              <td colspan="7" class="p-8 text-center text-zinc-400">No stock movements logged.</td>
            </tr>
            <tr v-else v-for="mv in [...stockMovements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())" :key="mv.id" class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
              <td class="p-4 text-zinc-400 font-semibold">
                {{ new Date(mv.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </td>
              <td class="p-4 font-bold text-slate-850 dark:text-zinc-200">{{ mv.productName }}</td>
              <td class="p-4">
                <span :class="['px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide',
                  mv.type === 'In' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                    : mv.type === 'Out' 
                      ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' 
                      : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600'
                ]">
                  {{ mv.type === 'In' ? 'Stock In' : mv.type === 'Out' ? 'Stock Out' : 'Adjustment' }}
                </span>
              </td>
              <td :class="['p-4 text-center font-mono font-bold text-sm', mv.quantity > 0 ? 'text-emerald-600' : 'text-rose-600']">
                {{ mv.quantity > 0 ? `+${mv.quantity}` : mv.quantity }}
              </td>
              <td class="p-4 text-center font-mono text-zinc-400">{{ mv.previousStock }}</td>
              <td class="p-4 text-center font-mono font-bold text-slate-700 dark:text-zinc-200">{{ mv.newStock }}</td>
              <td class="p-4 text-zinc-600 dark:text-zinc-300 font-semibold">{{ mv.reason }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL: Product Add / Edit -->
    <div v-if="isProductModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" id="product-modal">
      <div class="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">
            {{ editingProduct ? 'Edit SKU Details' : 'Add New Inventory SKU' }}
          </h3>
          <button 
            @click="isProductModalOpen = false"
            class="text-zinc-400 hover:text-zinc-600 p-1"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="handleProductSubmit" class="p-4 space-y-4 text-xs">
          <!-- Name -->
          <div>
            <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Product Name *</label>
            <div class="flex gap-2">
              <input
                type="text"
                required
                v-model="name"
                placeholder="e.g., Vanguard Retro Court Sneakers (White/Navy)"
                class="flex-1 p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-semibold"
              />
              <button
                type="button"
                @click="handleAutoDetails"
                class="px-2.5 bg-zinc-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-200/50 font-bold uppercase text-[10px]"
                title="Auto SKU code generation"
              >
                Auto SKU
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- SKU -->
            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">SKU Code *</label>
              <input
                type="text"
                required
                v-model="sku"
                class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-mono text-[11px] font-bold"
              />
            </div>

            <!-- Barcode -->
            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Barcode *</label>
              <input
                type="text"
                required
                v-model="barcode"
                class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-mono text-[11px] font-bold"
              />
            </div>
          </div>

          <!-- Details -->
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Category</label>
              <select
                v-model="category"
                class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-bold"
              >
                <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Brand</label>
              <input
                type="text"
                v-model="brand"
                placeholder="e.g. Nike, Apex, Summit"
                class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-semibold"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Supplier</label>
              <input
                type="text"
                v-model="supplier"
                placeholder="Supplier Company"
                class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-semibold"
              />
            </div>
          </div>

          <!-- Pricing -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Cost Price (PHP) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                v-model="costPrice"
                class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-bold"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Selling Price (PHP) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                v-model="sellingPrice"
                class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none font-bold"
              />
            </div>
          </div>

          <!-- Stocks -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Initial Stock</label>
              <input
                type="number"
                required
                :disabled="!!editingProduct"
                v-model="currentStock"
                class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-bold disabled:opacity-50"
              />
              <span v-if="editingProduct" class="text-[9px] text-zinc-400 mt-1 block font-semibold uppercase">Use 'Adjustment' tool for edits</span>
            </div>

            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Min Alert Threshold</label>
              <input
                type="number"
                required
                v-model="minimumStock"
                class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-bold"
              />
            </div>
          </div>

          <!-- Emojis Selector -->
          <div>
            <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Product Icon *</label>
            <div class="flex flex-wrap gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 rounded-lg">
              <button
                v-for="em in EMOJIS"
                :key="em"
                type="button"
                @click="image = em"
                :class="['text-xl p-1 w-8 h-8 rounded-md flex items-center justify-center transition-all',
                  image === em ? 'bg-indigo-500/20 ring-2 ring-indigo-500 scale-115' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700/50'
                ]"
              >
                {{ em }}
              </button>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Description</label>
            <textarea
              v-model="description"
              placeholder="Provide specifications, dimensions, sizes..."
              rows="2"
              class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-medium"
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              @click="isProductModalOpen = false"
              class="flex-1 py-2 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 font-bold uppercase tracking-wider text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold uppercase tracking-wider text-[10px]"
            >
              {{ editingProduct ? 'Save Changes' : 'Create SKU' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: Stock Adjustment -->
    <div v-if="isAdjustModalOpen && adjustingProduct" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" id="adjust-modal">
      <div class="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">Stock Level Adjustment</h3>
          <button 
            @click="isAdjustModalOpen = false"
            class="text-zinc-400 hover:text-zinc-600 p-1"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="handleAdjustSubmit" class="p-4 space-y-4 text-xs">
          <div class="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg">
            <span class="text-2xl">{{ adjustingProduct.image }}</span>
            <div>
              <h4 class="font-bold text-slate-800 dark:text-zinc-200">{{ adjustingProduct.name }}</h4>
              <p class="text-[10px] text-zinc-400 font-semibold mt-0.5">SKU: {{ adjustingProduct.sku }} • Current Stock: {{ adjustingProduct.currentStock }}</p>
            </div>
          </div>

          <!-- Adjustment Mode -->
          <div>
            <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Adjustment Type *</label>
            <div class="grid grid-cols-3 gap-2 text-[10px]">
              <button
                type="button"
                @click="adjustType = 'In'"
                :class="['py-2 px-3 border rounded-lg font-bold flex items-center justify-center gap-1 uppercase transition-all',
                  adjustType === 'In' 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                    : 'border-slate-200 dark:border-zinc-700 text-slate-500 hover:bg-slate-50'
                ]"
              >
                <TrendingUp class="h-3.5 w-3.5" /> Stock In
              </button>
              <button
                type="button"
                @click="adjustType = 'Out'"
                :class="['py-2 px-3 border rounded-lg font-bold flex items-center justify-center gap-1 uppercase transition-all',
                  adjustType === 'Out' 
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-600' 
                    : 'border-slate-200 dark:border-zinc-700 text-slate-500 hover:bg-slate-50'
                ]"
              >
                <TrendingDown class="h-3.5 w-3.5" /> Stock Out
              </button>
              <button
                type="button"
                @click="adjustType = 'Adjustment'"
                :class="['py-2 px-3 border rounded-lg font-bold flex items-center justify-center gap-1 uppercase transition-all',
                  adjustType === 'Adjustment' 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600' 
                    : 'border-slate-200 dark:border-zinc-700 text-slate-500 hover:bg-slate-50'
                ]"
              >
                <AlertCircle class="h-3.5 w-3.5" /> Override
              </button>
            </div>
          </div>

          <!-- Quantity -->
          <div>
            <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">
              {{ adjustType === 'Adjustment' ? 'Target New Absolute Stock *' : 'Quantity Offset Offset *' }}
            </label>
            <input
              type="number"
              required
              min="0"
              v-model="adjustQuantity"
              class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-850 dark:text-zinc-200 font-bold"
            />
            <span class="text-[9px] text-zinc-400 mt-1 block font-semibold uppercase">
              <span v-if="adjustType === 'In'">Will add +{{ adjustQuantity }} to the current level (Result: {{ adjustingProduct.currentStock + adjustQuantity }} units)</span>
              <span v-else-if="adjustType === 'Out'">Will deduct -{{ adjustQuantity }} from the current level (Result: {{ Math.max(0, adjustingProduct.currentStock - adjustQuantity) }} units)</span>
              <span v-else>Will force reset current stock absolute level from {{ adjustingProduct.currentStock }} directly to {{ adjustQuantity }}</span>
            </span>
          </div>

          <!-- Reason -->
          <div>
            <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Reason / Audit Note *</label>
            <input
              type="text"
              required
              v-model="adjustReason"
              placeholder="e.g. Restock delivery batch, Damage audit write-off"
              class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-semibold"
            />
          </div>

          <!-- Buttons -->
          <div class="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              @click="isAdjustModalOpen = false"
              class="flex-1 py-2 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 font-bold uppercase tracking-wider text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold uppercase tracking-wider text-[10px]"
            >
              Apply Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
