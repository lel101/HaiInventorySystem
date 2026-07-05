<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Printer, 
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { Product, Transaction, Expense, Partner, ProfitDistributionRecord } from '../types';
import { formatPHP, exportToCSV } from '../utils';

// Props & Emits
const props = defineProps<{
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
  partners: Partner[];
  distributions: ProfitDistributionRecord[];
}>();

const emit = defineEmits<{
  (e: 'add-toast', title: string, message: string, type: 'success' | 'error'): void;
}>();

type ReportType = 'daily' | 'monthly' | 'inventory' | 'expenses' | 'profit' | 'distribution';

// States
const activeReport = ref<ReportType>('profit');
const dateFrom = ref(() => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().substring(0, 10);
});
const dateTo = ref(() => {
  return new Date().toISOString().substring(0, 10);
});

// DATA SELECTORS based on date range

// 1. Daily Sales list (filtered)
const dailySalesData = computed(() => {
  return props.transactions.filter(tx => {
    const dStr = tx.createdAt.substring(0, 10);
    return dStr >= dateFrom.value && dStr <= dateTo.value;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});

// 2. Monthly grouped sales
const monthlyGroupedData = computed(() => {
  const dataMap: { [key: string]: { revenue: number; cogs: number; profit: number; count: number } } = {};
  
  props.transactions.forEach(tx => {
    const month = tx.createdAt.substring(0, 7);
    if (!dataMap[month]) {
      dataMap[month] = { revenue: 0, cogs: 0, profit: 0, count: 0 };
    }
    dataMap[month].revenue += tx.total;
    dataMap[month].cogs += tx.costOfGoodsSold;
    dataMap[month].profit += tx.profit;
    dataMap[month].count += 1;
  });

  return dataMap;
});

// 3. Expenses log filtered
const expensesData = computed(() => {
  return props.expenses.filter(exp => {
    return exp.date >= dateFrom.value && exp.date <= dateTo.value;
  }).sort((a, b) => b.date.localeCompare(a.date));
});

// 4. Profit & Loss monthly report aggregation
const profitReportData = computed(() => {
  const dataMap: { [key: string]: { revenue: number; cogs: number; expenses: number; netProfit: number } } = {};

  props.transactions.forEach(tx => {
    const month = tx.createdAt.substring(0, 7);
    if (!dataMap[month]) {
      dataMap[month] = { revenue: 0, cogs: 0, expenses: 0, netProfit: 0 };
    }
    dataMap[month].revenue += tx.total;
    dataMap[month].cogs += tx.costOfGoodsSold;
  });

  props.expenses.forEach(exp => {
    const month = exp.date.substring(0, 7);
    if (!dataMap[month]) {
      dataMap[month] = { revenue: 0, cogs: 0, expenses: 0, netProfit: 0 };
    }
    dataMap[month].expenses += exp.amount;
  });

  Object.keys(dataMap).forEach(month => {
    const item = dataMap[month];
    item.netProfit = Math.max(0, item.revenue - item.cogs - item.expenses);
  });

  return dataMap;
});

// Financial aggregates for totals box
const aggregates = computed(() => {
  let salesTotal = 0;
  let profitTotal = 0;
  let cogsTotal = 0;
  let expensesTotal = 0;

  dailySalesData.value.forEach(tx => {
    salesTotal += tx.total;
    profitTotal += tx.profit;
    cogsTotal += tx.costOfGoodsSold;
  });

  expensesData.value.forEach(exp => {
    expensesTotal += exp.amount;
  });

  return {
    salesTotal,
    profitTotal,
    cogsTotal,
    expensesTotal,
    netProfit: Math.max(0, salesTotal - cogsTotal - expensesTotal)
  };
});

// Export dynamically based on active report
const handleCSVExport = () => {
  let headers: string[] = [];
  let rows: string[][] = [];
  let filename = '';

  switch (activeReport.value) {
    case 'daily':
      headers = ['Invoice No', 'Date', 'Customer', 'Items Count', 'Subtotal', 'Discount', 'Total Paid', 'Payment Channel', 'Profit'];
      rows = dailySalesData.value.map(tx => [
        tx.invoiceNo,
        new Date(tx.createdAt).toLocaleDateString(),
        tx.customerName || 'Walk-in Guest',
        tx.items.length.toString(),
        tx.subtotal.toFixed(2),
        tx.discountAmount.toFixed(2),
        tx.total.toFixed(2),
        tx.paymentMethod,
        tx.profit.toFixed(2)
      ]);
      filename = `Daily_Sales_Report_${dateFrom.value}_to_${dateTo.value}`;
      break;

    case 'monthly':
      headers = ['Month Cycle', 'Total Sales Volume', 'Revenue', 'Cost of Goods Sold', 'Gross Profit'];
      rows = Object.keys(monthlyGroupedData.value).map(month => {
        const data = monthlyGroupedData.value[month];
        return [
          month,
          data.count.toString(),
          data.revenue.toFixed(2),
          data.cogs.toFixed(2),
          data.profit.toFixed(2)
        ];
      });
      filename = `Monthly_Sales_Report_${dateFrom.value}_to_${dateTo.value}`;
      break;

    case 'inventory':
      headers = ['SKU', 'Barcode', 'Product Name', 'Category', 'Brand', 'Supplier', 'Cost Price', 'Selling Price', 'Current Stock', 'Stock Valuation', 'Status'];
      rows = props.products.map(p => [
        p.sku,
        p.barcode,
        p.name,
        p.category,
        p.brand,
        p.supplier,
        p.costPrice.toFixed(2),
        p.sellingPrice.toFixed(2),
        p.currentStock.toString(),
        (p.currentStock * p.costPrice).toFixed(2),
        p.currentStock === 0 ? 'Out of Stock' : p.currentStock <= p.minimumStock ? 'Low Stock' : 'In Stock'
      ]);
      filename = `Inventory_Stock_Report_${new Date().toISOString().slice(0, 10)}`;
      break;

    case 'expenses':
      headers = ['Date', 'Category', 'Description', 'Amount PHP'];
      rows = expensesData.value.map(exp => [
        new Date(exp.date).toLocaleDateString(),
        exp.category,
        exp.description,
        exp.amount.toFixed(2)
      ]);
      filename = `Expenses_Audit_Report_${dateFrom.value}_to_${dateTo.value}`;
      break;

    case 'profit':
      headers = ['Month Cycle', 'Revenue PHP', 'Cost of Goods Sold PHP', 'Expenses PHP', 'Calculated Net Profit PHP'];
      rows = Object.keys(profitReportData.value).map(month => {
        const data = profitReportData.value[month];
        return [
          month,
          data.revenue.toFixed(2),
          data.cogs.toFixed(2),
          data.expenses.toFixed(2),
          data.netProfit.toFixed(2)
        ];
      });
      filename = `Profit_Margin_Report_${dateFrom.value}_to_${dateTo.value}`;
      break;

    case 'distribution':
      props.distributions.forEach(d => {
        d.distributions.forEach(item => {
          rows.push([
            d.month,
            item.partnerName,
            `${item.percentage}%`,
            item.amount.toFixed(2)
          ]);
        });
      });
      headers = ['Billing Cycle', 'Partner Name', 'Equity Share %', 'Distributed Payout PHP'];
      filename = `Profit_Distribution_Report_${new Date().toISOString().slice(0, 10)}`;
      break;
  }

  exportToCSV(headers, rows, filename);
  emit('add-toast', 'Export Succeeded', `Exported ${activeReport.value} report as CSV successfully.`, 'success');
};

const handlePrint = () => {
  window.print();
};
</script>

<template>
  <div class="space-y-6" id="reports-view">
    <!-- Search & Selection Sidebar + Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6" id="reports-grid-container">
      <!-- REPORT MENU CARD (1 col) -->
      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm space-y-4 print:hidden" id="reports-selection-sidebar">
        <div>
          <h4 class="text-xs font-bold text-slate-700 dark:text-zinc-350 uppercase tracking-widest font-display">Business Reports</h4>
          <p class="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 font-semibold">Select and query granular business indexes</p>
        </div>

        <!-- Date range filters -->
        <div class="space-y-2.5 p-3 bg-zinc-50 dark:bg-zinc-850 rounded-xl text-xs border border-slate-100 dark:border-zinc-800">
          <span class="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] block">Global Date Scope</span>
          
          <div class="space-y-2">
            <div>
              <label class="block text-[10px] text-zinc-400 mb-0.5 font-bold uppercase tracking-wide">From:</label>
              <input
                type="date"
                v-model="dateFrom"
                class="w-full p-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-md font-bold text-xs"
              />
            </div>

            <div>
              <label class="block text-[10px] text-zinc-400 mb-0.5 font-bold uppercase tracking-wide">To:</label>
              <input
                type="date"
                v-model="dateTo"
                class="w-full p-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-md font-bold text-xs"
              />
            </div>
          </div>
        </div>

        <!-- Report types list -->
        <div class="space-y-1.5" id="report-types-list">
          <button
            v-for="item in [
              { type: 'profit', label: 'Profit & Loss Statement (P&L)' },
              { type: 'daily', label: 'Daily Sales Audits' },
              { type: 'monthly', label: 'Monthly Sales Summaries' },
              { type: 'inventory', label: 'Inventory Stock Valuation' },
              { type: 'expenses', label: 'Expense Category Audits' },
              { type: 'distribution', label: 'Partner Payout History' }
            ]"
            :key="item.type"
            @click="activeReport = (item.type as ReportType)"
            :class="['w-full text-left p-3 text-[10px] uppercase tracking-wider rounded-lg font-bold flex items-center justify-between transition-all duration-155',
              activeReport === item.type
                ? 'bg-indigo-600 text-white shadow-sm font-black'
                : 'hover:bg-[#F8FAFC] dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350'
            ]"
          >
            <span>{{ item.label }}</span>
            <ChevronRight class="h-3.5 w-3.5 opacity-60" />
          </button>
        </div>
      </div>

      <!-- REPORT VISUAL DISPLAY (3 cols) -->
      <div class="lg:col-span-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6" id="report-canvas">
        
        <!-- Header Row -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-150 dark:border-zinc-800 pb-4 gap-4 print:border-b-2">
          <div>
            <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block font-display">
              {{ activeReport.toUpperCase() }} STATEMENT
            </span>
            <h3 class="text-sm font-bold text-slate-900 dark:text-zinc-50 mt-1 uppercase tracking-wider font-display">
              <span v-if="activeReport === 'profit'">Profit & Loss (P&L) Ledger</span>
              <span v-else-if="activeReport === 'daily'">Daily Sales & Receipts Ledger</span>
              <span v-else-if="activeReport === 'monthly'">Monthly Performance Aggregates</span>
              <span v-else-if="activeReport === 'inventory'">Inventory Assets Valuation Sheet</span>
              <span v-else-if="activeReport === 'expenses'">Operational Overhead Audits</span>
              <span v-else-if="activeReport === 'distribution'">Equity Stakeholder Payout History</span>
            </h3>
            <p class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 font-semibold">
              {{ activeReport !== 'inventory' ? `Period scoped from ${dateFrom} through ${dateTo}` : 'Current assets status sheet' }}
            </p>
          </div>

          <div class="flex items-center gap-2 print:hidden">
            <button
              @click="handleCSVExport"
              class="p-2 border border-slate-200 dark:border-zinc-750 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              title="Export Spreadsheet"
            >
              <FileSpreadsheet class="h-4 w-4" /> Export CSV
            </button>

            <button
              @click="handlePrint"
              class="p-2 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              title="Print Report"
            >
              <Printer class="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        <!-- Dynamic Render Section based on Selection -->
        <div class="flex-1 overflow-x-auto" id="report-active-data">
          
          <!-- 1. Daily Sales -->
          <table v-if="activeReport === 'daily'" class="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr class="bg-[#F8FAFC] dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                <th class="p-3">Invoice No</th>
                <th class="p-3">Date</th>
                <th class="p-3">Customer</th>
                <th class="p-3 text-center">Items</th>
                <th class="p-3 text-right">Subtotal</th>
                <th class="p-3 text-right">Discounts</th>
                <th class="p-3 text-right">Total Paid</th>
                <th class="p-3 text-right">Margins</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/40">
              <tr v-if="dailySalesData.length === 0">
                <td colspan="8" class="p-6 text-center text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">No transactions recorded for selected dates.</td>
              </tr>
              <tr v-else v-for="tx in dailySalesData" :key="tx.id" class="hover:bg-zinc-50/50">
                <td class="p-3 font-mono font-bold text-zinc-800 dark:text-zinc-200">{{ tx.invoiceNo }}</td>
                <td class="p-3 text-zinc-500 font-semibold">{{ new Date(tx.createdAt).toLocaleDateString() }}</td>
                <td class="p-3 font-bold text-zinc-700 dark:text-zinc-300">{{ tx.customerName || 'Walk-in Guest' }}</td>
                <td class="p-3 text-center font-mono font-bold">{{ tx.items.reduce((sum, item) => sum + item.quantity, 0) }}</td>
                <td class="p-3 text-right font-mono font-semibold">{{ formatPHP(tx.subtotal) }}</td>
                <td class="p-3 text-right font-mono text-rose-500 font-bold">-{formatPHP(tx.discountAmount)}</td>
                <td class="p-3 text-right font-mono font-black text-zinc-900 dark:text-zinc-50">{{ formatPHP(tx.total) }}</td>
                <td class="p-3 text-right font-mono text-emerald-600 font-black">+{{ formatPHP(tx.profit) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- 2. Monthly Performance -->
          <table v-else-if="activeReport === 'monthly'" class="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr class="bg-[#F8FAFC] dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                <th class="p-3">Month Cycle</th>
                <th class="p-3">Tx Counts</th>
                <th class="p-3 text-right">Gross Sales Volume</th>
                <th class="p-3 text-right">Cost of Goods Sold (COGS)</th>
                <th class="p-3 text-right">Gross Margin Yield</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/40">
              <tr v-if="Object.keys(monthlyGroupedData).length === 0">
                <td colspan="5" class="p-6 text-center text-zinc-400 font-semibold">No monthly data parsed.</td>
              </tr>
              <tr v-else v-for="month in Object.keys(monthlyGroupedData).sort((a, b) => b.localeCompare(a))" :key="month" class="hover:bg-zinc-50/50">
                <td class="p-3 font-black text-zinc-850 dark:text-zinc-200">{{ month }}</td>
                <td class="p-3 font-mono font-bold">{{ monthlyGroupedData[month].count }} receipts</td>
                <td class="p-3 text-right font-mono text-zinc-900 dark:text-zinc-50 font-bold">{{ formatPHP(monthlyGroupedData[month].revenue) }}</td>
                <td class="p-3 text-right font-mono text-zinc-400 font-semibold">{{ formatPHP(monthlyGroupedData[month].cogs) }}</td>
                <td class="p-3 text-right font-mono text-emerald-600 font-black">{{ formatPHP(monthlyGroupedData[month].profit) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- 3. Inventory Assets Sheet -->
          <table v-else-if="activeReport === 'inventory'" class="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr class="bg-[#F8FAFC] dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                <th class="p-3">SKU</th>
                <th class="p-3">Product Item</th>
                <th class="p-3">Supplier</th>
                <th class="p-3 text-right">Cost Price</th>
                <th class="p-3 text-right">Selling Price</th>
                <th class="p-3 text-center">Stock Count</th>
                <th class="p-3 text-right">Asset Valuation</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/40">
              <tr v-for="p in products" :key="p.id" class="hover:bg-zinc-50/50">
                <td class="p-3 font-mono font-bold text-[11px] text-zinc-600 dark:text-zinc-300">{{ p.sku }}</td>
                <td class="p-3 font-bold text-slate-800 dark:text-zinc-200">{{ p.name }}</td>
                <td class="p-3 text-zinc-450 font-semibold">{{ p.supplier }}</td>
                <td class="p-3 text-right font-mono font-medium">{{ formatPHP(p.costPrice) }}</td>
                <td class="p-3 text-right font-mono font-bold">{{ formatPHP(p.sellingPrice) }}</td>
                <td class="p-3 text-center font-mono font-black text-sm">{{ p.currentStock }}</td>
                <td class="p-3 text-right font-mono font-black text-emerald-600">{{ formatPHP(p.currentStock * p.costPrice) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- 4. Expenses Overlays -->
          <table v-else-if="activeReport === 'expenses'" class="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr class="bg-[#F8FAFC] dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                <th class="p-3">Date</th>
                <th class="p-3">Category</th>
                <th class="p-3">Description Details</th>
                <th class="p-3 text-right">Amount Outlayed</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/40">
              <tr v-if="expensesData.length === 0">
                <td colspan="4" class="p-6 text-center text-zinc-400 font-bold uppercase text-[10px]">No expenses recorded for selected dates.</td>
              </tr>
              <tr v-else v-for="exp in expensesData" :key="exp.id" class="hover:bg-zinc-50/50">
                <td class="p-3 text-zinc-500 font-semibold">{{ new Date(exp.date).toLocaleDateString() }}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-black">
                    {{ exp.category }}
                  </span>
                </td>
                <td class="p-3 font-semibold text-zinc-750 dark:text-zinc-300">{{ exp.description }}</td>
                <td class="p-3 text-right font-mono font-black text-rose-600">{{ formatPHP(exp.amount) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- 5. Profit & Loss (P&L) Ledger -->
          <div v-else-if="activeReport === 'profit'" class="space-y-6">
            <table class="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr class="bg-[#F8FAFC] dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                  <th class="p-3">Billing Cycle</th>
                  <th class="p-3 text-right">Gross Sales (A)</th>
                  <th class="p-3 text-right">Cost of Goods (B)</th>
                  <th class="p-3 text-right">Operating Expenses (C)</th>
                  <th class="p-3 text-right">Net Business Yield (A - B - C)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/40">
                <tr v-if="Object.keys(profitReportData).length === 0">
                  <td colspan="5" class="p-6 text-center text-zinc-400 font-bold">No operational logs for selected range.</td>
                </tr>
                <tr v-else v-for="month in Object.keys(profitReportData).sort((a, b) => b.localeCompare(a))" :key="month" class="hover:bg-zinc-50/50">
                  <td class="p-3 font-black text-slate-800 dark:text-zinc-200 text-sm">{{ month }}</td>
                  <td class="p-3 text-right font-mono text-zinc-900 dark:text-zinc-100 font-bold">{{ formatPHP(profitReportData[month].revenue) }}</td>
                  <td class="p-3 text-right font-mono text-zinc-400 font-semibold">{{ formatPHP(profitReportData[month].cogs) }}</td>
                  <td class="p-3 text-right font-mono text-rose-600 font-bold">-{{ formatPHP(profitReportData[month].expenses) }}</td>
                  <td class="p-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">{{ formatPHP(profitReportData[month].netProfit) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 6. Partner Distributions Payouts -->
          <table v-else class="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr class="bg-[#F8FAFC] dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                <th class="p-3">Billing Cycle</th>
                <th class="p-3">Equity Partner</th>
                <th class="p-3 text-center">Percentage Share</th>
                <th class="p-3 text-right">Dividends Payout</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/40">
              <tr v-if="distributions.length === 0">
                <td colspan="4" class="p-6 text-center text-zinc-400 font-bold">No historical partner distribution transactions.</td>
              </tr>
              <template v-else v-for="d in distributions" :key="d.id">
                <tr v-for="(item, index) in d.distributions" :key="index" class="hover:bg-zinc-50/50">
                  <td v-if="index === 0" :rowspan="d.distributions.length" class="p-3 font-black text-zinc-850 dark:text-zinc-200 border-r border-slate-200 dark:border-zinc-800 align-top text-sm">
                    {{ d.month }}
                  </td>
                  <td class="p-3 font-bold text-slate-800 dark:text-zinc-200">{{ item.partnerName }}</td>
                  <td class="p-3 text-center font-mono font-black text-zinc-500">{{ item.percentage }}%</td>
                  <td class="p-3 text-right font-mono font-black text-emerald-600">{{ formatPHP(item.amount) }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Scoped Summary aggregate panel -->
        <div class="bg-[#F8FAFC] dark:bg-zinc-850 border border-slate-250 dark:border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="report-financial-aggregates">
          <div class="space-y-1">
            <h5 class="font-bold text-slate-850 dark:text-zinc-200 text-xs">Period Scoped Ledger Aggregates</h5>
            <p class="text-[10px] text-zinc-400 font-medium">Totalized calculation indexes compiled from current scoped inputs</p>
          </div>

          <div class="flex flex-wrap items-center gap-6 text-xs text-right" id="report-aggregates-box">
            <div v-if="activeReport !== 'inventory'" class="flex items-center gap-6">
              <div>
                <span class="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider mb-0.5">Period Sales</span>
                <span class="font-bold font-mono text-zinc-900 dark:text-zinc-100">{{ formatPHP(aggregates.salesTotal) }}</span>
              </div>

              <div>
                <span class="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider mb-0.5">Period COGS</span>
                <span class="font-bold font-mono text-zinc-500">-{formatPHP(aggregates.cogsTotal)}</span>
              </div>

              <div>
                <span class="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider mb-0.5">Period Expenses</span>
                <span class="font-bold font-mono text-rose-500">-{formatPHP(aggregates.expensesTotal)}</span>
              </div>

              <div class="border-l border-slate-200 dark:border-zinc-800 pl-4">
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-black block uppercase tracking-wider mb-0.5">Net Yield</span>
                <span class="font-black font-mono text-emerald-600 text-sm">{{ formatPHP(aggregates.netProfit) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
