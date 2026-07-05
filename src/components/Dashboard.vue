<script setup lang="ts">
import { computed } from 'vue';
import { 
  TrendingUp, 
  ArrowUpRight, 
  FileText, 
  AlertTriangle 
} from 'lucide-react';
import { Product, Transaction } from '../types';
import { formatPHP } from '../utils';

// Define Props and Emits
const props = defineProps<{
  products: Product[];
  transactions: Transaction[];
}>();

const emit = defineEmits<{
  (e: 'navigate', view: string): void;
}>();

const stats = computed(() => {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  let todaySales = 0;
  let todayProfit = 0;
  let monthlySales = 0;

  props.transactions.forEach(tx => {
    const txDate = tx.createdAt.split('T')[0];
    if (txDate === todayStr) {
      todaySales += tx.total;
      todayProfit += tx.profit;
    }
    const txMonth = tx.createdAt.substring(0, 7);
    if (txMonth === currentMonthStr) {
      monthlySales += tx.total;
    }
  });

  const lowStockCount = props.products.filter(p => p.currentStock > 0 && p.currentStock <= p.minimumStock).length;
  const outOfStockCount = props.products.filter(p => p.currentStock === 0).length;

  return {
    todaySales,
    todayProfit,
    monthlySales,
    lowStockCount,
    outOfStockCount
  };
});

const handleNavigate = (view: string) => {
  emit('navigate', view);
};

// Top Selling Products computation
const topSellingProducts = computed(() => {
  const productSalesMap: { [key: string]: { name: string; quantity: number; revenue: number; image: string } } = {};

  props.transactions.forEach(tx => {
    tx.items.forEach(item => {
      if (!productSalesMap[item.productId]) {
        const originalProd = props.products.find(p => p.id === item.productId);
        productSalesMap[item.productId] = {
          name: item.name,
          quantity: 0,
          revenue: 0,
          image: originalProd?.image || '📦'
        };
      }
      productSalesMap[item.productId].quantity += item.quantity;
      productSalesMap[item.productId].revenue += item.totalPrice;
    });
  });

  return Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
});

// Recent Transactions computation
const recentTx = computed(() => {
  return [...props.transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
});

// Category Stock Valuation computation
const categoryChartData = computed(() => {
  const catMap: { [key: string]: { name: string; Stock: number; Value: number } } = {};
  
  props.products.forEach(p => {
    if (!catMap[p.category]) {
      catMap[p.category] = { name: p.category, Stock: 0, Value: 0 };
    }
    catMap[p.category].Stock += p.currentStock;
    catMap[p.category].Value += p.currentStock * p.costPrice;
  });

  return Object.values(catMap);
});

// Category bar graph calculations
const maxCategoryValuation = computed(() => {
  const values = categoryChartData.value.map(c => c.Value);
  return values.length > 0 ? Math.max(...values, 1000) : 1000;
});

// Daily Sales & Profit for last 7 days computation
const dailyChartData = computed(() => {
  const chartData: { date: string; Sales: number; Profit: number }[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDateKey = d.toISOString().split('T')[0];

    let daySales = 0;
    let dayProfit = 0;

    props.transactions.forEach(tx => {
      const txDate = tx.createdAt.split('T')[0];
      if (txDate === fullDateKey) {
        daySales += tx.total;
        dayProfit += tx.profit;
      }
    });

    chartData.push({
      date: dateStr,
      Sales: daySales,
      Profit: dayProfit
    });
  }

  return chartData;
});

const maxDailyValue = computed(() => {
  let max = 5000;
  dailyChartData.value.forEach(d => {
    if (d.Sales > max) max = d.Sales;
    if (d.Profit > max) max = d.Profit;
  });
  return max;
});

// Generate SVG Polyline points for daily sales & profit
const generatePolylinePoints = (key: 'Sales' | 'Profit', width = 500, height = 200) => {
  const data = dailyChartData.value;
  if (data.length === 0) return '';
  const maxVal = maxDailyValue.value;
  const paddingX = 40;
  const paddingY = 20;
  
  const stepX = (width - paddingX * 2) / (data.length - 1);
  return data.map((d, i) => {
    const x = paddingX + i * stepX;
    const value = d[key];
    // invert Y since SVG Y starts at top
    const y = height - paddingY - (value / maxVal) * (height - paddingY * 2);
    return `${x},${y}`;
  }).join(' ');
};

// Generate SVG Polygon points for filled areas under polylines
const generatePolygonPoints = (key: 'Sales' | 'Profit', width = 500, height = 200) => {
  const points = generatePolylinePoints(key, width, height);
  if (!points) return '';
  const paddingX = 40;
  const paddingY = 20;
  const stepX = (width - paddingX * 2) / (dailyChartData.value.length - 1);
  
  const startX = paddingX;
  const endX = paddingX + (dailyChartData.value.length - 1) * stepX;
  const floorY = height - paddingY;
  
  return `${startX},${floorY} ${points} ${endX},${floorY}`;
};
</script>

<template>
  <div class="space-y-6" id="dashboard-container">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-black text-slate-800 dark:text-zinc-50 uppercase tracking-wider font-display">Store Metrics</h2>
        <p class="text-xs text-slate-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wide">Real-time performance metrics</p>
      </div>
    </div>

    <!-- Overview Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="stats-grid">
      <!-- Today's Sales -->
      <div class="bg-white dark:bg-zinc-900 p-6 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col justify-between" id="stat-card-today-sales">
        <div>
          <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1 tracking-wider">Today's Sales</p>
          <p class="text-3xl font-black text-slate-900 dark:text-zinc-50 tracking-tight font-display">{{ formatPHP(stats.todaySales) }}</p>
          <div class="mt-2 flex items-center text-xs font-bold text-emerald-600">
            <TrendingUp class="h-3.5 w-3.5 mr-1" :stroke-width="3" />
            <span>Real-time tracking</span>
          </div>
        </div>
      </div>

      <!-- Today's Net Profit -->
      <div class="bg-white dark:bg-zinc-900 p-6 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col justify-between" id="stat-card-today-profit">
        <div>
          <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1 tracking-wider">Today's Profit</p>
          <p class="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-display">{{ formatPHP(stats.todayProfit) }}</p>
          <div class="mt-2 flex items-center text-xs font-bold text-slate-500">
            <span class="font-semibold text-emerald-600 mr-1">+{{ stats.todaySales > 0 ? (stats.todayProfit / stats.todaySales * 100).toFixed(0) : 30 }}% margin</span>
          </div>
        </div>
      </div>

      <!-- Monthly Performance -->
      <div class="bg-white dark:bg-zinc-900 p-6 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col justify-between" id="stat-card-monthly">
        <div>
          <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1 tracking-wider">Monthly Sales</p>
          <p class="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight font-display">{{ formatPHP(stats.monthlySales) }}</p>
          <button 
            @click="handleNavigate('reports')" 
            class="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline block text-left uppercase tracking-wider text-[10px]"
          >
            Download Report
          </button>
        </div>
      </div>

      <!-- Inventory Value & Alerts -->
      <div class="bg-white dark:bg-zinc-900 p-6 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col justify-between" id="stat-card-inventory">
        <div>
          <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1 tracking-wider">Inventory Alerts</p>
          <p v-if="stats.outOfStockCount + stats.lowStockCount > 0" class="text-3xl font-black text-rose-600 tracking-tight font-display">
            {{ stats.outOfStockCount + stats.lowStockCount }} Items
          </p>
          <p v-else class="text-3xl font-black text-emerald-600 tracking-tight font-display">
            Healthy
          </p>
          <div class="mt-2 text-xs font-bold">
            <span v-if="stats.outOfStockCount > 0" class="text-rose-500 mr-2 uppercase tracking-wide text-[10px]">{{ stats.outOfStockCount }} Out of stock</span>
            <span v-if="stats.lowStockCount > 0" class="text-amber-500 uppercase tracking-wide text-[10px]">{{ stats.lowStockCount }} Low stock</span>
            <span v-if="stats.outOfStockCount === 0 && stats.lowStockCount === 0" class="text-slate-400 uppercase tracking-wide text-[10px]">All items supplied</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6" id="charts-row">
      <!-- Sales & Profit Area Chart -->
      <div class="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm" id="sales-trend-container">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h4 class="text-xs font-bold text-slate-700 dark:text-zinc-350 uppercase tracking-widest font-display">Sales & Profit Trend</h4>
            <p class="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Last 7 days performance metrics</p>
          </div>
          <button 
            @click="handleNavigate('pos')"
            class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 uppercase tracking-wider"
          >
            Open POS <ArrowUpRight class="h-3.5 w-3.5 text-indigo-500" />
          </button>
        </div>

        <!-- Responsive Native SVG Line Chart -->
        <div class="h-72 w-full relative" id="daily-sales-chart">
          <svg class="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="colorSalesVue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stop-color="#4f46e5" stop-opacity="0.25"/>
                <stop offset="95%" stop-color="#4f46e5" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="colorProfitVue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stop-color="#10b981" stop-opacity="0.25"/>
                <stop offset="95%" stop-color="#10b981" stop-opacity="0"/>
              </linearGradient>
            </defs>

            <!-- Grid Lines -->
            <line x1="40" y1="20" x2="460" y2="20" stroke="#f1f5f9" class="dark:stroke-zinc-800/40" stroke-dasharray="3,3" />
            <line x1="40" y1="65" x2="460" y2="65" stroke="#f1f5f9" class="dark:stroke-zinc-800/40" stroke-dasharray="3,3" />
            <line x1="40" y1="110" x2="460" y2="110" stroke="#f1f5f9" class="dark:stroke-zinc-800/40" stroke-dasharray="3,3" />
            <line x1="40" y1="155" x2="460" y2="155" stroke="#f1f5f9" class="dark:stroke-zinc-800/40" stroke-dasharray="3,3" />
            <line x1="40" y1="180" x2="460" y2="180" stroke="#e2e8f0" class="dark:stroke-zinc-800/80" />

            <!-- Filled Areas -->
            <polygon :points="generatePolygonPoints('Sales', 500, 200)" fill="url(#colorSalesVue)" />
            <polygon :points="generatePolygonPoints('Profit', 500, 200)" fill="url(#colorProfitVue)" />

            <!-- Polyline Trails -->
            <polyline :points="generatePolylinePoints('Sales', 500, 200)" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <polyline :points="generatePolylinePoints('Profit', 500, 200)" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

            <!-- Circular Points -->
            <template v-for="(d, i) in dailyChartData" :key="i">
              <circle 
                v-if="d.Sales > 0"
                :cx="40 + i * ((500 - 80) / (dailyChartData.length - 1))" 
                :cy="200 - 20 - (d.Sales / maxDailyValue) * (200 - 40)" 
                r="3" 
                fill="#4f46e5" 
                stroke="#ffffff" 
                stroke-width="1"
              />
              <circle 
                v-if="d.Profit > 0"
                :cx="40 + i * ((500 - 80) / (dailyChartData.length - 1))" 
                :cy="200 - 20 - (d.Profit / maxDailyValue) * (200 - 40)" 
                r="3" 
                fill="#10b981" 
                stroke="#ffffff" 
                stroke-width="1"
              />
            </template>
          </svg>

          <!-- Label overlays inside SVG container -->
          <div class="absolute bottom-0 left-10 right-10 flex justify-between text-[9px] font-bold text-slate-400 dark:text-zinc-500 font-mono tracking-tight pointer-events-none">
            <span v-for="(d, i) in dailyChartData" :key="i">{{ d.date }}</span>
          </div>

          <div class="absolute top-2 left-2 text-[9px] font-bold text-slate-400 dark:text-zinc-500 font-mono flex items-center gap-3 bg-white/80 dark:bg-zinc-950/80 p-1 px-2 rounded border border-slate-100 dark:border-zinc-800">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-indigo-600 block"></span> Sales</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-emerald-500 block"></span> Net Profit</span>
            <span class="text-slate-300 dark:text-zinc-700">| Max: {{ formatPHP(maxDailyValue) }}</span>
          </div>
        </div>
      </div>

      <!-- Category Share Chart -->
      <div class="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between" id="category-share-container">
        <div>
          <div class="mb-6">
            <h4 class="text-xs font-bold text-slate-700 dark:text-zinc-350 uppercase tracking-widest font-display">Category Stock Valuation</h4>
            <p class="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Asset distribution by business category</p>
          </div>
          
          <div class="space-y-4" id="category-bar-chart">
            <div v-if="categoryChartData.length === 0" class="py-12 text-center text-xs text-zinc-400">
              No inventory data available
            </div>
            <div v-else v-for="(cat, idx) in categoryChartData" :key="idx" class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="font-semibold text-slate-700 dark:text-zinc-300">{{ cat.name }}</span>
                <span class="font-bold text-slate-900 dark:text-zinc-50">{{ formatPHP(cat.Value) }}</span>
              </div>
              <div class="w-full h-3 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  :style="{ width: `${(cat.Value / maxCategoryValuation) * 100}%` }"
                ></div>
              </div>
              <div class="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                {{ cat.Stock }} Items in stock
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Two Columns: Recent Transactions & Top Selling / Low Stock Alerts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" id="details-row">
      <!-- Recent Transactions Panel -->
      <div class="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm" id="recent-transactions-panel">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h4 class="text-xs font-bold text-slate-700 dark:text-zinc-350 uppercase tracking-widest font-display">Recent Transactions</h4>
            <p class="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Latest sales completed through POS</p>
          </div>
          <button 
            @click="handleNavigate('reports')"
            class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 uppercase tracking-wider"
          >
            All Reports <FileText class="h-3.5 w-3.5 text-indigo-500" />
          </button>
        </div>

        <div class="divide-y divide-slate-100 dark:divide-zinc-800/80" id="recent-tx-list">
          <div v-if="recentTx.length === 0" class="py-8 text-center text-zinc-400 text-xs">
            No transactions completed yet. Go to POS to start!
          </div>
          <div v-else v-for="tx in recentTx" :key="tx.id" class="py-3.5 flex justify-between items-center text-xs">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-semibold text-slate-800 dark:text-zinc-200">{{ tx.invoiceNo }}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                  {{ tx.paymentMethod }}
                </span>
              </div>
              <p class="text-slate-400 dark:text-zinc-500 text-[11px] mt-0.5 font-medium">
                {{ new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }}
                {{ tx.customerName ? ` • ${tx.customerName}` : '' }}
              </p>
            </div>
            <div class="text-right">
              <span class="font-bold text-slate-900 dark:text-zinc-50">{{ formatPHP(tx.total) }}</span>
              <p class="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">+{{ formatPHP(tx.profit) }} profit</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Products & Alerts -->
      <div class="space-y-6" id="right-side-details">
        <!-- Top Products -->
        <div class="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm" id="top-selling-products-panel">
          <h4 class="text-xs font-bold text-slate-700 dark:text-zinc-350 uppercase tracking-widest mb-4 font-display">Top Selling Products</h4>
          
          <div class="space-y-4" id="top-selling-list">
            <div v-if="topSellingProducts.length === 0" class="py-6 text-center text-zinc-400 text-xs">
              No products sold yet.
            </div>
            <div v-else v-for="(item, index) in topSellingProducts" :key="index" class="flex justify-between items-center text-xs">
              <div class="flex items-center gap-3">
                <span class="text-lg w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 flex items-center justify-center">
                  {{ item.image }}
                </span>
                <div>
                  <p class="font-semibold text-slate-800 dark:text-zinc-200 line-clamp-1">{{ item.name }}</p>
                  <p class="text-slate-400 dark:text-zinc-500 text-[10px] font-medium">{{ item.quantity }} units sold</p>
                </div>
              </div>
              <span class="font-bold text-slate-900 dark:text-zinc-50">{{ formatPHP(item.revenue) }}</span>
            </div>
          </div>
        </div>

        <!-- Low / Out of Stock Alert Box -->
        <div class="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm" id="stock-alerts-panel">
          <h4 class="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-display">
            <AlertTriangle class="h-4 w-4 text-rose-500" /> Stock Warnings
          </h4>

          <div class="max-h-56 overflow-y-auto space-y-3 pr-1" id="stock-alerts-list">
            <div v-if="products.filter(p => p.currentStock <= p.minimumStock).length === 0" class="py-4 text-center text-zinc-400 text-xs">
              No stock warnings. All items are fully supplied.
            </div>
            <div 
              v-else 
              v-for="p in products.filter(p => p.currentStock <= p.minimumStock).sort((a, b) => a.currentStock - b.currentStock)" 
              :key="p.id" 
              class="flex justify-between items-center text-xs border-b border-slate-50 dark:border-zinc-800/40 pb-2"
            >
              <div class="flex items-center gap-2">
                <span class="text-base">{{ p.image }}</span>
                <div>
                  <p class="font-semibold text-slate-800 dark:text-zinc-200 line-clamp-1">{{ p.name }}</p>
                  <p class="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">Min stock threshold: {{ p.minimumStock }}</p>
                </div>
              </div>
              <span :class="[
                'px-2 py-0.5 rounded-full text-[10px] font-bold',
                p.currentStock === 0 
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' 
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-500'
              ]">
                {{ p.currentStock === 0 ? 'OUT OF STOCK' : `${p.currentStock} left` }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
