<script setup lang="ts">
import { computed } from 'vue';
import {
  Banknote,
  Boxes,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  FileText,
  HandCoins,
  ReceiptText,
  TrendingUp
} from '@lucide/vue';
import { Expense, Partner, Product, ProfitDistributionRecord, Transaction } from '../types';
import { formatPHP } from '../utils';

const props = defineProps<{
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
  partners: Partner[];
  distributions: ProfitDistributionRecord[];
  partnerId?: string;
}>();

const currentMonth = computed(() => new Date().toISOString().substring(0, 7));

const monthFinancials = computed(() => {
  let revenue = 0;
  let cogs = 0;
  let expenses = 0;

  props.transactions.forEach((tx) => {
    if (tx.createdAt.substring(0, 7) === currentMonth.value) {
      revenue += tx.total;
      cogs += tx.costOfGoodsSold;
    }
  });

  props.expenses.forEach((expense) => {
    if (expense.date.substring(0, 7) === currentMonth.value) {
      expenses += expense.amount;
    }
  });

  return {
    revenue,
    cogs,
    expenses,
    netProfit: Math.max(0, revenue - cogs - expenses),
  };
});

const lifetime = computed(() => {
  const revenue = props.transactions.reduce((sum, tx) => sum + tx.total, 0);
  const cogs = props.transactions.reduce((sum, tx) => sum + tx.costOfGoodsSold, 0);
  const expenses = props.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const distributed = props.distributions.reduce((sum, record) => {
    if (!props.partnerId) return sum + record.distributedAmount;
    const item = record.distributions.find((distribution) => distribution.partnerId === props.partnerId);
    return sum + (item?.amount || 0);
  }, 0);
  const inventoryValue = props.products.reduce((sum, product) => sum + product.currentStock * product.costPrice, 0);

  return {
    revenue,
    cogs,
    expenses,
    distributed,
    inventoryValue,
    netProfit: Math.max(0, revenue - cogs - expenses),
  };
});

const latestDistributions = computed(() => {
  return [...props.distributions]
    .map((record) => {
      if (!props.partnerId) return record;

      const distributions = record.distributions.filter((item) => item.partnerId === props.partnerId);
      return {
        ...record,
        distributedAmount: distributions.reduce((sum, item) => sum + item.amount, 0),
        distributions,
      };
    })
    .filter((record) => !props.partnerId || record.distributions.length > 0)
    .sort((a, b) => b.month.localeCompare(a.month) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);
});

const monthlyLedger = computed(() => {
  const ledger: Record<string, { revenue: number; cogs: number; expenses: number; netProfit: number }> = {};

  props.transactions.forEach((tx) => {
    const month = tx.createdAt.substring(0, 7);
    ledger[month] ||= { revenue: 0, cogs: 0, expenses: 0, netProfit: 0 };
    ledger[month].revenue += tx.total;
    ledger[month].cogs += tx.costOfGoodsSold;
  });

  props.expenses.forEach((expense) => {
    const month = expense.date.substring(0, 7);
    ledger[month] ||= { revenue: 0, cogs: 0, expenses: 0, netProfit: 0 };
    ledger[month].expenses += expense.amount;
  });

  Object.values(ledger).forEach((item) => {
    item.netProfit = Math.max(0, item.revenue - item.cogs - item.expenses);
  });

  return Object.entries(ledger)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 8);
});

const topProducts = computed(() => {
  const sales = new Map<string, { name: string; quantity: number; revenue: number }>();

  props.transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      const entry = sales.get(item.productId) || { name: item.name, quantity: 0, revenue: 0 };
      entry.quantity += item.quantity;
      entry.revenue += item.totalPrice;
      sales.set(item.productId, entry);
    });
  });

  return [...sales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
});

const partnerRows = computed(() => {
  return props.partners
  .filter((partner) => !props.partnerId || partner.id === props.partnerId)
  .map((partner) => ({
    ...partner,
    currentMonthShare: monthFinancials.value.netProfit * (partner.sharePercentage / 100),
    lifetimeDistributed: props.distributions.reduce((sum, record) => {
      const item = record.distributions.find((distribution) => distribution.partnerId === partner.id);
      return sum + (item?.amount || 0);
    }, 0),
  }));
});
</script>

<template>
  <div class="space-y-5 sm:space-y-6" id="investor-view">
    <section class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 sm:p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.22em] text-[#E81221]">Investor Portal</p>
          <h2 class="mt-1 text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-zinc-50 font-display">Hai Store Performance</h2>
          <p class="mt-2 max-w-2xl text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400">
            View-only financial snapshot, dividend history, inventory value, and sales performance.
          </p>
        </div>
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          Read Only Access
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">This Month Sales</span>
          <TrendingUp class="h-4 w-4 text-indigo-500" />
        </div>
        <p class="mt-3 text-2xl font-black text-slate-900 dark:text-zinc-50 font-display">{{ formatPHP(monthFinancials.revenue) }}</p>
      </div>

      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">This Month Net</span>
          <CircleDollarSign class="h-4 w-4 text-emerald-500" />
        </div>
        <p class="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display">{{ formatPHP(monthFinancials.netProfit) }}</p>
      </div>

      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Distributed</span>
          <HandCoins class="h-4 w-4 text-amber-500" />
        </div>
        <p class="mt-3 text-2xl font-black text-slate-900 dark:text-zinc-50 font-display">{{ formatPHP(lifetime.distributed) }}</p>
      </div>

      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Value</span>
          <Boxes class="h-4 w-4 text-sky-500" />
        </div>
        <p class="mt-3 text-2xl font-black text-slate-900 dark:text-zinc-50 font-display">{{ formatPHP(lifetime.inventoryValue) }}</p>
      </div>
    </section>

    <section class="grid grid-cols-1 xl:grid-cols-12 gap-5">
      <div class="xl:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 shadow-sm">
        <div class="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <ChartNoAxesColumnIncreasing class="h-4 w-4 text-indigo-500" />
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-zinc-300 font-display">Monthly Profit And Loss</h3>
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[620px] text-left text-xs">
            <thead class="bg-slate-50 dark:bg-zinc-950 text-[10px] uppercase tracking-widest text-slate-400">
              <tr>
                <th class="p-3">Month</th>
                <th class="p-3 text-right">Sales</th>
                <th class="p-3 text-right">COGS</th>
                <th class="p-3 text-right">Expenses</th>
                <th class="p-3 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-zinc-800">
              <tr v-if="monthlyLedger.length === 0">
                <td colspan="5" class="p-5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">No financial records yet.</td>
              </tr>
              <tr v-for="[month, item] in monthlyLedger" :key="month">
                <td class="p-3 font-black text-slate-800 dark:text-zinc-200">{{ month }}</td>
                <td class="p-3 text-right font-mono font-bold">{{ formatPHP(item.revenue) }}</td>
                <td class="p-3 text-right font-mono text-slate-500">{{ formatPHP(item.cogs) }}</td>
                <td class="p-3 text-right font-mono text-rose-500">-{{ formatPHP(item.expenses) }}</td>
                <td class="p-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">{{ formatPHP(item.netProfit) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="xl:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 shadow-sm">
        <div class="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <Banknote class="h-4 w-4 text-emerald-500" />
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-zinc-300 font-display">Shareholder Summary</h3>
        </div>
        <div class="mt-4 space-y-3">
          <div v-if="partnerRows.length === 0" class="py-8 text-center text-xs font-semibold text-slate-400">No shareholder records yet.</div>
          <div v-for="partner in partnerRows" :key="partner.id" class="rounded-lg border border-slate-200 dark:border-zinc-800 p-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-black text-slate-900 dark:text-zinc-100">{{ partner.name }}</p>
                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ partner.sharePercentage }}% share</p>
              </div>
              <p class="text-right text-sm font-black text-emerald-600 dark:text-emerald-400">{{ formatPHP(partner.currentMonthShare) }}</p>
            </div>
            <div class="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Lifetime Paid</span>
              <span class="font-mono text-slate-700 dark:text-zinc-300">{{ formatPHP(partner.lifetimeDistributed) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 shadow-sm">
        <div class="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <ReceiptText class="h-4 w-4 text-amber-500" />
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-zinc-300 font-display">Recent Distributions</h3>
        </div>
        <div class="mt-4 divide-y divide-slate-100 dark:divide-zinc-800">
          <div v-if="latestDistributions.length === 0" class="py-8 text-center text-xs font-semibold text-slate-400">No dividend distributions posted yet.</div>
          <div v-for="record in latestDistributions" :key="record.id" class="py-3">
            <div class="flex items-center justify-between gap-3">
              <p class="font-black text-slate-900 dark:text-zinc-100">{{ record.month }}</p>
              <p class="font-mono font-black text-indigo-600 dark:text-indigo-400">{{ formatPHP(record.distributedAmount) }}</p>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span v-for="item in record.distributions" :key="`${record.id}-${item.partnerId}`" class="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                {{ item.partnerName }} {{ formatPHP(item.amount) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 shadow-sm">
        <div class="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <FileText class="h-4 w-4 text-sky-500" />
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-zinc-300 font-display">Top Products</h3>
        </div>
        <div class="mt-4 divide-y divide-slate-100 dark:divide-zinc-800">
          <div v-if="topProducts.length === 0" class="py-8 text-center text-xs font-semibold text-slate-400">No product sales yet.</div>
          <div v-for="product in topProducts" :key="product.name" class="py-3 flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate text-sm font-black text-slate-900 dark:text-zinc-100">{{ product.name }}</p>
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ product.quantity }} units sold</p>
            </div>
            <p class="shrink-0 font-mono text-sm font-black text-slate-800 dark:text-zinc-200">{{ formatPHP(product.revenue) }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
