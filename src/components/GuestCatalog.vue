<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { PackageSearch, RefreshCw } from '@lucide/vue';
import { formatPHP, getGuestPriceDisplay } from '../utils';

interface GuestProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  srpPrice?: number;
  storePrice: number;
  currentStock: number;
  image?: string;
  imageUrl?: string;
  apparelSizes?: string[];
  shoeGender?: 'Men' | 'Women';
  shoeSizes?: number[];
  sizeStocks?: Record<string, number>;
}

const products = ref<GuestProduct[]>([]);
const generatedAt = ref<string | null>(null);
const loading = ref(true);
const error = ref('');
const search = ref('');
const category = ref('All');
const selectedProduct = ref<GuestProduct | null>(null);
const zoomLevel = ref(1);
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const categories = computed(() => ['All', ...new Set(products.value.map((product) => product.category))]);
const filteredProducts = computed(() => {
  const query = search.value.trim().toLowerCase();
  return [...products.value]
    .filter((product) => (category.value === 'All' || product.category === category.value)
      && (!query || [product.name, product.brand, product.category].some((value) => value.toLowerCase().includes(query))))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const availableProducts = computed(() => filteredProducts.value.filter((product) => product.currentStock > 0));
const soldOutProducts = computed(() => filteredProducts.value.filter((product) => product.currentStock <= 0));

const loadCatalog = async (options: { showLoading?: boolean } = {}) => {
  const { showLoading = true } = options;
  if (showLoading) {
    loading.value = true;
  }
  error.value = '';
  try {
    const response = await fetch(`/api/catalog.json?updated=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Catalog file is not available.');
    const data = await response.json();
    products.value = Array.isArray(data.products) ? data.products : [];
    generatedAt.value = data.generatedAt || null;
  } catch (loadError) {
    products.value = [];
    error.value = loadError instanceof Error ? loadError.message : 'Could not load the catalog.';
  } finally {
    if (showLoading) {
      loading.value = false;
    }
  }
};

const openProductImage = (product: GuestProduct) => {
  selectedProduct.value = product;
  zoomLevel.value = 1;
};

const closeProductImage = () => {
  selectedProduct.value = null;
  zoomLevel.value = 1;
};

const adjustZoom = (delta: number) => {
  zoomLevel.value = Math.min(3, Math.max(1, Number((zoomLevel.value + delta).toFixed(1))));
};

onMounted(() => {
  loadCatalog();
  // Keep the public page in sync without re-triggering the loader for every background refresh.
  refreshTimer = setInterval(() => loadCatalog({ showLoading: false }), 60_000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-900">
    <header class="bg-slate-950 text-white border-b-4 border-[#E81221]">
      <div class="max-w-7xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff5a64]">Hai Store</p>
          <h1 class="text-2xl font-black tracking-tight">Available Items</h1>
          <p class="text-sm text-slate-300 mt-1">Browse what is currently in stock.</p>
        </div>
        <button @click="loadCatalog" class="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/20">
          <RefreshCw class="h-4 w-4" /> Refresh
        </button>
      </div>
    </header>

    <section class="max-w-7xl mx-auto px-5 py-8">
      <div class="flex flex-col sm:flex-row gap-3 mb-7">
        <input v-model="search" type="search" placeholder="Search items or brands" class="flex-1 px-4 py-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-indigo-500" />
        <select v-model="category" class="px-4 py-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold">
          <option v-for="itemCategory in categories" :key="itemCategory" :value="itemCategory">{{ itemCategory }}</option>
        </select>
      </div>

      <p v-if="generatedAt" class="mb-5 text-xs text-slate-400">Catalog updated {{ new Date(generatedAt).toLocaleString() }}</p>
      <div v-if="loading" class="py-20 text-center text-slate-400">Loading available items…</div>
      <div v-else-if="error" class="py-20 text-center text-slate-500">{{ error }}</div>
      <div v-else-if="!filteredProducts.length" class="py-20 text-center text-slate-500">
        <PackageSearch class="h-10 w-10 mx-auto mb-3 text-slate-300" />
        No items match your search.
      </div>
      <div v-else class="space-y-8">
        <div v-if="availableProducts.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <article v-for="product in availableProducts" :key="product.id" class="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div class="h-64 bg-white flex items-center justify-center overflow-visible cursor-zoom-in" @click="openProductImage(product)">
              <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" class="w-full h-full object-contain p-2" />
              <span v-else class="text-8xl leading-none">{{ product.image || '📦' }}</span>
            </div>
            <div class="p-4">
              <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{{ product.category }}<span v-if="product.brand"> · {{ product.brand }}</span></p>
              <h2 class="mt-1 font-bold text-slate-900">{{ product.name }}</h2>
              <div v-if="product.apparelSizes?.length || product.shoeSizes?.length" class="mt-3 text-xs text-slate-600">
                <span v-if="product.apparelSizes?.length">Sizes: <template v-for="(size, index) in product.apparelSizes" :key="size">{{ index ? ', ' : '' }}{{ size }} ({{ product.sizeStocks?.[size] || 0 }})</template></span>
                <span v-else>{{ product.shoeGender || 'US' }} US: <template v-for="(size, index) in product.shoeSizes" :key="size">{{ index ? ', ' : '' }}{{ size }} ({{ product.sizeStocks?.[String(size)] || 0 }})</template></span>
              </div>
              <div class="mt-4 flex items-end justify-between gap-2">
                <div>
                  <div v-if="getGuestPriceDisplay(product).hasDiscount" class="flex items-center gap-2 mb-1">
                    <span class="text-[10px] text-slate-400 line-through">{{ formatPHP(getGuestPriceDisplay(product).originalPrice) }}</span>
                    <span class="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-600">
                      Save {{ getGuestPriceDisplay(product).discountPercent }}%
                    </span>
                  </div>
                  <strong class="text-lg">{{ formatPHP(getGuestPriceDisplay(product).currentPrice) }}</strong>
                </div>
                <span class="text-[10px] font-bold text-emerald-600 uppercase">{{ product.currentStock }} Available</span>
              </div>
            </div>
          </article>
        </div>

        <div v-if="soldOutProducts.length" class="pt-2">
          <h2 class="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-600">Sold Out</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 opacity-90">
            <article v-for="product in soldOutProducts" :key="product.id" class="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
              <div class="absolute inset-0 bg-slate-100/55"></div>
              <div class="relative h-64 bg-slate-50 flex items-center justify-center overflow-visible cursor-zoom-in" @click="openProductImage(product)">
                <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" class="w-full h-full object-contain p-2" style="filter: saturate(0.7) brightness(0.95);" />
                <span v-else class="text-8xl leading-none text-slate-500 opacity-70">{{ product.image || '📦' }}</span>
              </div>
              <div class="p-4">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-600">{{ product.category }}<span v-if="product.brand"> · {{ product.brand }}</span></p>
                <h2 class="mt-1 font-bold text-slate-800">{{ product.name }}</h2>
                <div class="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <div v-if="getGuestPriceDisplay(product).hasDiscount" class="flex items-center gap-2 mb-1">
                      <span class="text-[10px] text-slate-400 line-through">{{ formatPHP(getGuestPriceDisplay(product).originalPrice) }}</span>
                      <span class="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-600">
                        Save {{ getGuestPriceDisplay(product).discountPercent }}%
                      </span>
                    </div>
                    <strong class="text-lg text-slate-700">{{ formatPHP(getGuestPriceDisplay(product).currentPrice) }}</strong>
                  </div>
                  <span class="text-[10px] font-black uppercase tracking-wide text-rose-600">Sold Out</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <div v-if="selectedProduct" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4" @click="closeProductImage">
      <div class="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl" @click.stop>
        <button @click="closeProductImage" class="absolute right-3 top-3 z-10 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800">Close</button>
        <div class="flex items-center justify-center bg-slate-950 p-6 sm:p-10">
          <div class="overflow-auto max-h-[72vh] w-full flex items-center justify-center">
            <img
              v-if="selectedProduct.imageUrl"
              :src="selectedProduct.imageUrl"
              :alt="selectedProduct.name"
              :style="{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease' }"
              class="max-h-[72vh] max-w-full object-contain rounded-xl"
            />
            <span v-else class="text-[8rem]" :style="{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease' }">{{ selectedProduct.image || '📦' }}</span>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-4 py-3 text-white">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-300">{{ selectedProduct.category }}</p>
            <h3 class="text-base font-bold">{{ selectedProduct.name }}</h3>
          </div>
          <div class="flex items-center gap-2">
            <button @click="adjustZoom(-0.2)" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-bold hover:bg-slate-800">-</button>
            <span class="min-w-12 text-center text-xs font-bold uppercase tracking-wider text-slate-300">{{ zoomLevel.toFixed(1) }}x</span>
            <button @click="adjustZoom(0.2)" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-bold hover:bg-slate-800">+</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
