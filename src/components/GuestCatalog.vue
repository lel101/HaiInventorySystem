<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { PackageSearch, RefreshCw } from '@lucide/vue';
import { formatPHP } from '../utils';

interface GuestProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
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
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const categories = computed(() => ['All', ...new Set(products.value.map((product) => product.category))]);
const visibleProducts = computed(() => products.value.filter((product) => {
  const query = search.value.trim().toLowerCase();
  return product.currentStock > 0
    && (category.value === 'All' || product.category === category.value)
    && (!query || [product.name, product.brand, product.category].some((value) => value.toLowerCase().includes(query)));
}));

const loadCatalog = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await fetch(`/catalog.json?updated=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Catalog file is not available.');
    const data = await response.json();
    products.value = Array.isArray(data.products) ? data.products : [];
    generatedAt.value = data.generatedAt || null;
  } catch (loadError) {
    products.value = [];
    error.value = loadError instanceof Error ? loadError.message : 'Could not load the catalog.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadCatalog();
  // The admin generator rewrites the static JSON file. Polling keeps open guest tabs current.
  refreshTimer = setInterval(loadCatalog, 30_000);
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
      <div v-else-if="!visibleProducts.length" class="py-20 text-center text-slate-500">
        <PackageSearch class="h-10 w-10 mx-auto mb-3 text-slate-300" />
        No available items match your search.
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <article v-for="product in visibleProducts" :key="product.id" class="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <div class="h-48 bg-slate-100 flex items-center justify-center overflow-hidden">
            <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" class="w-full h-full object-cover" />
            <span v-else class="text-6xl">{{ product.image || '📦' }}</span>
          </div>
          <div class="p-4">
            <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{{ product.category }}<span v-if="product.brand"> · {{ product.brand }}</span></p>
            <h2 class="mt-1 font-bold text-slate-900">{{ product.name }}</h2>
            <div v-if="product.apparelSizes?.length || product.shoeSizes?.length" class="mt-3 text-xs text-slate-600">
              <span v-if="product.apparelSizes?.length">Sizes: <template v-for="(size, index) in product.apparelSizes" :key="size">{{ index ? ', ' : '' }}{{ size }} ({{ product.sizeStocks?.[size] || 0 }})</template></span>
              <span v-else>{{ product.shoeGender || 'EU' }} EU: <template v-for="(size, index) in product.shoeSizes" :key="size">{{ index ? ', ' : '' }}{{ size }} ({{ product.sizeStocks?.[String(size)] || 0 }})</template></span>
            </div>
            <div class="mt-4 flex items-end justify-between gap-2">
              <strong class="text-lg">{{ formatPHP(product.storePrice) }}</strong>
              <span class="text-[10px] font-bold text-emerald-600 uppercase">{{ product.currentStock }} Available</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
