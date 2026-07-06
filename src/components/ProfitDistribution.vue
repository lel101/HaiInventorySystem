<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { 
  Users, 
  Plus, 
  Trash2, 
  Calendar, 
  Check, 
  AlertTriangle, 
  Coins, 
  Sparkles,
  Layers,
  Calculator,
  KeyRound,
  Save,
  Eye,
  EyeOff
} from '@lucide/vue';
import { Partner, ProfitDistributionRecord, Transaction, Expense, InvestorAccount } from '../types';
import { formatPHP } from '../utils';

// Props & Emits
const props = defineProps<{
  partners: Partner[];
  distributions: ProfitDistributionRecord[];
  transactions: Transaction[];
  expenses: Expense[];
  investorAccounts: InvestorAccount[];
}>();

const emit = defineEmits<{
  (e: 'add-partner', partner: Omit<Partner, 'id'> & { investorUsername: string; investorPassword: string }): void;
  (e: 'update-partner-shares', partners: Partner[]): void;
  (e: 'delete-partner', id: string): void;
  (e: 'save-investor-account', payload: { partnerId: string; username: string; password: string }): void;
  (e: 'post-distribution', record: Omit<ProfitDistributionRecord, 'id' | 'createdAt'>): void;
  (e: 'add-toast', title: string, message: string, type: 'success' | 'error'): void;
}>();

// Form states
const partnerName = ref('');
const partnerPercentage = ref('');
const investorUsername = ref('');
const investorPassword = ref('');
const credentialDrafts = ref<Record<string, { username: string; password: string }>>({});
const showNewInvestorPassword = ref(false);
const visiblePasswords = ref<Record<string, boolean>>({});

watch(
  () => props.investorAccounts,
  (accounts) => {
    const next = { ...credentialDrafts.value };
    accounts.forEach((account) => {
      next[account.partnerId] = {
        username: account.username,
        password: account.password,
      };
    });
    credentialDrafts.value = next;
  },
  { immediate: true, deep: true }
);

// Month selector default: current month
const getDefaultMonth = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};
const selectedMonth = ref(getDefaultMonth());

// Calculate total share allocation sum
const totalSharePercentage = computed(() => {
  return props.partners.reduce((sum, p) => sum + p.sharePercentage, 0);
});

// Month-specific financial calculations
const monthFinancials = computed(() => {
  let revenue = 0;
  let cogs = 0;
  let monthExpenses = 0;

  props.transactions.forEach(tx => {
    if (tx.createdAt.substring(0, 7) === selectedMonth.value) {
      revenue += tx.total;
      cogs += tx.costOfGoodsSold;
    }
  });

  props.expenses.forEach(exp => {
    if (exp.date.substring(0, 7) === selectedMonth.value) {
      monthExpenses += exp.amount;
    }
  });

  const netProfit = Math.max(0, revenue - cogs - monthExpenses);

  return {
    revenue,
    cogs,
    expenses: monthExpenses,
    netProfit
  };
});

// Check if month is already distributed
const isAlreadyDistributed = computed(() => {
  return props.distributions.some(d => d.month === selectedMonth.value);
});

// Add Partner Stakeholder
const handleCreatePartner = () => {
  if (!partnerName.value.trim()) return;
  const pct = Number(partnerPercentage.value);
  const username = investorUsername.value.trim();
  const password = investorPassword.value.trim();

  if (isNaN(pct) || pct <= 0 || pct > 100) {
    emit('add-toast', 'Invalid Share', 'Share percentage must be between 1 and 100.', 'error');
    return;
  }

  if (!username || !password) {
    emit('add-toast', 'Missing Login', 'Set an investor username and password before registering the partner.', 'error');
    return;
  }

  if (password.length < 4) {
    emit('add-toast', 'Weak Password', 'Investor password must be at least 4 characters.', 'error');
    return;
  }

  if (totalSharePercentage.value + pct > 100) {
    emit('add-toast', 'Over Allocation', `Adding ${pct}% would exceed 100% total allocation (current total: ${totalSharePercentage.value}%).`, 'error');
    return;
  }

  emit('add-partner', {
    name: partnerName.value.trim(),
    sharePercentage: pct,
    investorUsername: username,
    investorPassword: password
  });

  partnerName.value = '';
  partnerPercentage.value = '';
  investorUsername.value = '';
  investorPassword.value = '';
};

// Adjust share allocations dynamically
const handleShareChange = (id: string, newShare: number) => {
  const updated = props.partners.map(p => 
    p.id === id ? { ...p, sharePercentage: Math.min(100, Math.max(0, newShare)) } : p
  );
  emit('update-partner-shares', updated);
};

// Post Monthly Distribution
const handlePostDistribution = () => {
  if (props.partners.length === 0) {
    emit('add-toast', 'No Partners Registered', 'Please add business partners before distributing profits.', 'error');
    return;
  }

  if (totalSharePercentage.value !== 100) {
    emit('add-toast', 'Allocation Error', `Total partner shares must equal exactly 100%. Currently it is ${totalSharePercentage.value}%.`, 'error');
    return;
  }

  if (monthFinancials.value.netProfit <= 0) {
    emit('add-toast', 'No Net Profit', `The net profit for ${selectedMonth.value} is ₱0.00. Nothing to distribute.`, 'error');
    return;
  }

  if (isAlreadyDistributed.value) {
    emit('add-toast', 'Already Distributed', `Profits for ${selectedMonth.value} have already been distributed.`, 'error');
    return;
  }

  const partnerDistributions = props.partners.map(p => ({
    partnerId: p.id,
    partnerName: p.name,
    percentage: p.sharePercentage,
    amount: monthFinancials.value.netProfit * (p.sharePercentage / 100)
  }));

  emit('post-distribution', {
    month: selectedMonth.value,
    revenue: monthFinancials.value.revenue,
    cogs: monthFinancials.value.cogs,
    expenses: monthFinancials.value.expenses,
    netProfit: monthFinancials.value.netProfit,
    distributedAmount: monthFinancials.value.netProfit,
    distributions: partnerDistributions
  });

  emit('add-toast', 'Profit Distributed', `Successfully distributed ${formatPHP(monthFinancials.value.netProfit)} among ${props.partners.length} partners.`, 'success');
};

const handleDelete = (id: string, name: string) => {
  emit('delete-partner', id);
};

const getDraft = (partnerId: string) => {
  if (!credentialDrafts.value[partnerId]) {
    const account = props.investorAccounts.find((item) => item.partnerId === partnerId);
    credentialDrafts.value[partnerId] = {
      username: account?.username || '',
      password: account?.password || '',
    };
  }

  return credentialDrafts.value[partnerId];
};

const handleCredentialInput = (partnerId: string, field: 'username' | 'password', value: string) => {
  credentialDrafts.value[partnerId] = {
    ...getDraft(partnerId),
    [field]: value,
  };
};

const handleSaveCredential = (partner: Partner) => {
  const draft = getDraft(partner.id);
  const username = draft.username.trim();
  const password = draft.password.trim();

  if (!username || !password) {
    emit('add-toast', 'Missing Login', 'Username and password are required for investor access.', 'error');
    return;
  }

  if (password.length < 4) {
    emit('add-toast', 'Weak Password', 'Investor password must be at least 4 characters.', 'error');
    return;
  }

  emit('save-investor-account', {
    partnerId: partner.id,
    username,
    password,
  });
};

const togglePasswordVisibility = (partnerId: string) => {
  visiblePasswords.value = {
    ...visiblePasswords.value,
    [partnerId]: !visiblePasswords.value[partnerId],
  };
};
</script>

<template>
  <div class="space-y-6" id="profit-distribution-view">
    <!-- Top Banner explaining how true net profit is shared -->
    <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6" id="distribution-intro">
      <div class="space-y-1.5 max-w-xl">
        <h3 class="text-xs font-bold text-slate-700 dark:text-zinc-350 uppercase tracking-widest font-display flex items-center gap-2">
          <Sparkles class="h-5 w-5 text-indigo-500" /> Partner Profit Distribution Ledger
        </h3>
        <p class="text-[11px] text-slate-400 dark:text-zinc-500 font-medium leading-relaxed">
          Define equity stakes for active business partners. The system automatically fetches month-end totals, subtracts COGS and logged expenses, and partitions the remaining Net Profit in real-time.
        </p>
      </div>

      <div class="bg-zinc-50 dark:bg-zinc-850 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs shrink-0 flex items-center gap-4 shadow-sm">
        <div class="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-lg">
          <Calculator class="h-5 w-5" />
        </div>
        <div>
          <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Allocation Verification</p>
          <div class="flex items-center gap-2">
            <span :class="['text-sm font-black uppercase tracking-tight', totalSharePercentage === 100 ? 'text-indigo-600' : 'text-amber-500']">
              {{ totalSharePercentage }}% Total Share
            </span>
            <span v-if="totalSharePercentage === 100" class="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">STABLE</span>
            <span v-else class="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle class="h-3 w-3" /> MUST BE 100%
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6" id="distribution-body">
      <!-- LEFT COLUMN: Shareholder Partners Settings (5 cols) -->
      <div class="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-5" id="shareholder-partners-settings">
        <div class="border-b border-slate-100 dark:border-zinc-800 pb-3">
          <h4 class="font-bold text-xs uppercase tracking-widest text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 font-display">
            <Users class="h-4 w-4 text-indigo-500" /> Shareholder Registry
          </h4>
          <p class="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Manage partner listings and active equity distribution weights</p>
        </div>

        <!-- Create Partner Form -->
        <form @submit.prevent="handleCreatePartner" class="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-xl space-y-3 text-xs border border-slate-100 dark:border-zinc-800">
          <p class="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Add New Stakeholder</p>
          <div class="grid grid-cols-12 gap-2">
            <input
              type="text"
              required
              placeholder="Partner full name"
              v-model="partnerName"
              class="col-span-12 sm:col-span-8 p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-850 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-semibold"
            />
            <div class="col-span-12 sm:col-span-4 relative">
              <input
                type="number"
                required
                min="1"
                max="100"
                placeholder="Share %"
                v-model="partnerPercentage"
                class="w-full p-2 pr-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-mono font-bold text-right focus:outline-none focus:border-indigo-500"
              />
              <span class="absolute right-2 top-2.5 text-zinc-400 font-bold text-[11px]">%</span>
            </div>
            <input
              type="text"
              required
              placeholder="Investor username"
              v-model="investorUsername"
              autocomplete="off"
              class="col-span-12 sm:col-span-6 p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-850 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-semibold"
            />
            <div class="col-span-12 sm:col-span-6 relative">
              <input
                :type="showNewInvestorPassword ? 'text' : 'password'"
                required
                placeholder="Investor password"
                v-model="investorPassword"
                autocomplete="new-password"
                class="w-full p-2 pr-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-850 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-semibold"
              />
              <button
                type="button"
                @click="showNewInvestorPassword = !showNewInvestorPassword"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-indigo-500 rounded-md transition-colors"
                :title="showNewInvestorPassword ? 'Hide password' : 'Show password'"
              >
                <EyeOff v-if="showNewInvestorPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>
          <button
            type="submit"
            class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus class="h-3.5 w-3.5" /> Register Partner
          </button>
        </form>

        <!-- Active Partners List -->
        <div class="space-y-3" id="registered-partners-list">
          <p class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Active Share Weights</p>
          <div v-if="partners.length === 0" class="py-8 text-center text-zinc-400 text-xs">
            No partners registered yet. Add them above!
          </div>
          <div v-else v-for="p in partners" :key="p.id" class="p-3 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs hover:border-zinc-300 transition-colors space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p class="font-bold text-slate-800 dark:text-zinc-200">{{ p.name }}</p>
                <p class="text-[10px] text-zinc-400 mt-0.5 font-semibold uppercase tracking-wide">Partner Stakeholder</p>
              </div>

              <div class="flex items-center gap-3">
                <div class="relative w-20">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    :value="p.sharePercentage"
                    @input="handleShareChange(p.id, Number(($event.target as HTMLInputElement).value))"
                    class="w-full p-1.5 pr-5 bg-zinc-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md font-mono font-bold text-right text-zinc-850 dark:text-zinc-100"
                  />
                  <span class="absolute right-1.5 top-1.5 text-zinc-400 text-[10px] font-bold">%</span>
                </div>

                <button
                  @click="handleDelete(p.id, p.name)"
                  class="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-rose-600 rounded-md transition-colors"
                  title="Remove Partner"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div class="rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800 p-3 space-y-2">
              <div class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                <KeyRound class="h-3.5 w-3.5 text-indigo-500" />
                Investor Login
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  :value="getDraft(p.id).username"
                  @input="handleCredentialInput(p.id, 'username', ($event.target as HTMLInputElement).value)"
                  placeholder="Username"
                  autocomplete="off"
                  class="sm:col-span-5 p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-850 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-semibold"
                />
                <div class="sm:col-span-5 relative">
                  <input
                    :type="visiblePasswords[p.id] ? 'text' : 'password'"
                    :value="getDraft(p.id).password"
                    @input="handleCredentialInput(p.id, 'password', ($event.target as HTMLInputElement).value)"
                    placeholder="Password"
                    autocomplete="new-password"
                    class="w-full p-2 pr-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-850 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                  <button
                    type="button"
                    @click="togglePasswordVisibility(p.id)"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-indigo-500 rounded-md transition-colors"
                    :title="visiblePasswords[p.id] ? 'Hide password' : 'Show password'"
                  >
                    <EyeOff v-if="visiblePasswords[p.id]" class="h-4 w-4" />
                    <Eye v-else class="h-4 w-4" />
                  </button>
                </div>
                <button
                  @click="handleSaveCredential(p)"
                  class="sm:col-span-2 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors"
                  title="Save investor login"
                >
                  <Save class="h-3.5 w-3.5" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Active Month Calculation & Distribution execution (7 cols) -->
      <div class="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-6" id="month-distribution-panel">
        <!-- Calendar Month Selector & Preview -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-zinc-800 pb-4 gap-3">
          <div>
            <h4 class="font-bold text-xs uppercase tracking-widest text-slate-700 dark:text-zinc-300 font-display">Post Net Profit Partitioning</h4>
            <p class="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Calculate and distribute net yield for selected monthly billing cycle</p>
          </div>
          
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Calendar class="h-3.5 w-3.5" /> Billing Cycle:
            </span>
            <input
              type="month"
              v-model="selectedMonth"
              class="p-1.5 bg-zinc-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-750 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <!-- Month Financial Breakdown Cards -->
        <div class="grid grid-cols-3 gap-3 text-xs" id="cycle-breakdown-cards">
          <div class="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
            <span class="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider mb-1">Month Revenue</span>
            <span class="text-sm font-bold text-zinc-800 dark:text-zinc-200 block mt-1">{{ formatPHP(monthFinancials.revenue) }}</span>
          </div>

          <div class="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
            <span class="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider mb-1">Month COGS</span>
            <span class="text-sm font-semibold text-zinc-500 block mt-1">{{ formatPHP(monthFinancials.cogs) }}</span>
          </div>

          <div class="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
            <span class="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider mb-1">Month Expenses</span>
            <span class="text-sm font-semibold text-zinc-500 block mt-1">{{ formatPHP(monthFinancials.expenses) }}</span>
          </div>
        </div>

        <!-- Net Profit Display -->
        <div class="bg-indigo-500/[0.03] border border-indigo-500/10 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Net Profit For Cycle</span>
            <h2 class="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-display tracking-tight">{{ formatPHP(monthFinancials.netProfit) }}</h2>
          </div>

          <button
            v-if="totalSharePercentage === 100 && partners.length > 0 && monthFinancials.netProfit > 0 && !isAlreadyDistributed"
            @click="handlePostDistribution"
            class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 transition-colors self-end sm:self-center shadow-sm"
          >
            <Coins class="h-4 w-4" /> Distribute Profit Now
          </button>

          <div v-else-if="isAlreadyDistributed" class="bg-indigo-100/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 border border-indigo-500/20">
            <Check class="h-4 w-4" /> Distributed
          </div>
        </div>

        <!-- Allocation Share Partition Table -->
        <div class="space-y-3" id="stakeholder-allocation-preview">
          <h5 class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Stakeholder Distribution Preview</h5>
          
          <div class="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
            <div v-if="partners.length === 0" class="p-4 text-center text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
              No registered partners to preview.
            </div>
            <div v-else v-for="p in partners" :key="p.id" class="p-3 flex justify-between items-center bg-zinc-50/20 dark:bg-zinc-850/10 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
              <div>
                <p class="font-bold text-slate-800 dark:text-zinc-200">{{ p.name }}</p>
                <p class="text-[10px] text-zinc-400 mt-0.5 font-semibold uppercase tracking-wide">Allocation weight: {{ p.sharePercentage }}%</p>
              </div>
              <span class="font-bold text-slate-900 dark:text-zinc-100 font-mono text-sm">
                {{ formatPHP(monthFinancials.netProfit * (p.sharePercentage / 100)) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Distribution History -->
        <div class="space-y-3" id="distribution-ledger-history">
          <h5 class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Layers class="h-3.5 w-3.5" /> Historical Distributions
          </h5>

          <div class="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800 text-xs shadow-sm">
            <div v-if="distributions.length === 0" class="p-4 text-center text-zinc-400">
              No historical distribution cycles logged yet.
            </div>
            <div v-else v-for="d in [...distributions].sort((a, b) => b.month.localeCompare(a.month))" :key="d.id" class="p-3.5 space-y-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50/10">
              <div class="flex justify-between items-center">
                <span class="font-bold text-slate-800 dark:text-zinc-200">{{ d.month }} Cycle</span>
                <span class="font-black text-indigo-600 dark:text-indigo-400 font-sans text-sm">{{ formatPHP(d.distributedAmount) }}</span>
              </div>

              <div class="flex flex-wrap gap-1.5 animate-fade-in" id="partner-pills">
                <span 
                  v-for="(item, idx) in d.distributions" 
                  :key="idx" 
                  class="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-750 px-2 py-1 rounded-md text-[10px] text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1"
                >
                  {{ item.partnerName }}: <span class="font-mono text-zinc-900 dark:text-zinc-100 font-bold font-sans">{{ formatPHP(item.amount) }}</span> ({{ item.percentage }}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
