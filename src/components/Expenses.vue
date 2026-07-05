<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Plus, 
  Search, 
  Trash2, 
  FileText, 
  Calendar, 
  UploadCloud, 
  X, 
  Eye, 
  Building,
  Users,
  Zap,
  Wifi,
  Megaphone,
  Truck,
  HelpCircle
} from 'lucide-react';
import { Expense } from '../types';
import { formatPHP } from '../utils';

// Props & Emits
const props = defineProps<{
  expenses: Expense[];
}>();

const emit = defineEmits<{
  (e: 'add-expense', expense: Omit<Expense, 'id' | 'createdAt'>): void;
  (e: 'delete-expense', id: string): void;
  (e: 'add-toast', title: string, message: string, type: 'success' | 'error'): void;
}>();

const CATEGORIES = ['Rent', 'Salary', 'Electricity', 'Internet', 'Marketing', 'Transportation', 'Miscellaneous'] as const;

// Component State
const searchQuery = ref('');
const categoryFilter = ref('All');
const isAddModalOpen = ref(false);

// Form States
const category = ref<typeof CATEGORIES[number]>('Miscellaneous');
const amount = ref('');
const description = ref('');
const date = ref(new Date().toISOString().substring(0, 10));
const receiptImage = ref('');
const isReceiptDragging = ref(false);
const viewingReceiptUrl = ref<string | null>(null);

const fileInputRef = ref<HTMLInputElement | null>(null);

// Category helpers
const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case 'Rent': return Building;
    case 'Salary': return Users;
    case 'Electricity': return Zap;
    case 'Internet': return Wifi;
    case 'Marketing': return Megaphone;
    case 'Transportation': return Truck;
    default: return HelpCircle;
  }
};

const getCategoryBadgeColor = (cat: string) => {
  switch (cat) {
    case 'Rent': return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400';
    case 'Salary': return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400';
    case 'Electricity': return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500';
    case 'Internet': return 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400';
    case 'Marketing': return 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400';
    case 'Transportation': return 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400';
    default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300';
  }
};

// Image processing
const processImageFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    emit('add-toast', 'Invalid File Type', 'Please upload an image file (PNG, JPG, WEBP).', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    if (event.target?.result) {
      receiptImage.value = event.target.result as string;
      emit('add-toast', 'Receipt Uploaded', 'Successfully scanned and attached receipt image.', 'success');
    }
  };
  reader.readAsDataURL(file);
};

// Drag & drop
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isReceiptDragging.value = true;
};

const handleDragLeave = () => {
  isReceiptDragging.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isReceiptDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    processImageFile(file);
  }
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processImageFile(file);
  }
};

// Submit Expense
const handleSubmit = () => {
  const parsedAmount = Number(amount.value);
  if (!parsedAmount || parsedAmount <= 0) {
    emit('add-toast', 'Invalid Amount', 'Please provide a valid, positive expense amount.', 'error');
    return;
  }
  if (!description.value.trim()) {
    emit('add-toast', 'Description Required', 'Please detail the description of this expense.', 'error');
    return;
  }

  emit('add-expense', {
    category: category.value,
    amount: parsedAmount,
    description: description.value.trim(),
    date: date.value,
    receiptImage: receiptImage.value || undefined
  });

  // Reset Form
  isAddModalOpen.value = false;
  category.value = 'Miscellaneous';
  amount.value = '';
  description.value = '';
  date.value = new Date().toISOString().substring(0, 10);
  receiptImage.value = '';
};

// Filters and computations
const filteredExpenses = computed(() => {
  return props.expenses.filter(exp => {
    const matchesSearch = 
      exp.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesCategory = categoryFilter.value === 'All' || exp.category === categoryFilter.value;

    return matchesSearch && matchesCategory;
  });
});

const sortedExpenses = computed(() => {
  return [...filteredExpenses.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

const totalExpenseAmount = computed(() => {
  return filteredExpenses.value.reduce((sum, exp) => sum + exp.amount, 0);
});

const handleDelete = (id: string) => {
  if (window.confirm('Are you sure you want to delete this expense record?')) {
    emit('delete-expense', id);
  }
};
</script>

<template>
  <div class="space-y-6" id="expenses-view">
    <!-- Header card with summary & stats -->
    <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm" id="expenses-header">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 class="text-xs font-bold text-slate-700 dark:text-zinc-350 uppercase tracking-widest font-display">Business Expenses Ledger</h3>
          <p class="text-[11px] text-slate-400 dark:text-zinc-500 font-medium mt-1">Log, audit, and track operational overhead to analyze true net margins</p>
        </div>
        <div class="flex items-center gap-6">
          <div class="text-right">
            <p class="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Total Operational Expenses</p>
            <h2 class="text-2xl font-black text-rose-600 font-display tracking-tight">{{ formatPHP(totalExpenseAmount) }}</h2>
          </div>
          <button
            @click="isAddModalOpen = true"
            class="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-all shadow-sm active:scale-98"
          >
            <Plus class="h-4 w-4" /> Add Expense
          </button>
        </div>
      </div>
    </div>

    <!-- Main Ledger Section -->
    <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm" id="expenses-ledger">
      <!-- Filters and search -->
      <div class="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div class="relative w-full sm:w-80">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <Search class="h-4 w-4" />
          </span>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search expenses, descriptions..."
            class="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div class="w-full sm:w-auto flex justify-end">
          <select
            v-model="categoryFilter"
            class="text-xs bg-zinc-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 rounded-lg py-2 px-3 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 font-semibold"
          >
            <option value="All">All Expense Categories</option>
            <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
      </div>

      <!-- Expenses List Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-[#F8FAFC] dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800/60 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
              <th class="p-4">Date</th>
              <th class="p-4">Expense Category</th>
              <th class="p-4">Description / Notes</th>
              <th class="p-4">Receipt</th>
              <th class="p-4 text-right">Amount</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/50">
            <tr v-if="sortedExpenses.length === 0">
              <td colspan="6" class="p-12 text-center text-zinc-400">
                <div class="flex flex-col items-center gap-2">
                  <FileText class="h-8 w-8 text-zinc-300" />
                  <span class="font-bold uppercase tracking-wider text-[10px]">No expenses registered yet</span>
                </div>
              </td>
            </tr>
            <tr v-else v-for="exp in sortedExpenses" :key="exp.id" class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
              <!-- Date -->
              <td class="p-4 text-slate-500 font-semibold">
                <div class="flex items-center gap-1.5">
                  <Calendar class="h-3.5 w-3.5 text-zinc-400" />
                  <span>{{ new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</span>
                </div>
              </td>

              <!-- Category -->
              <td class="p-4">
                <span :class="['px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 w-fit', getCategoryBadgeColor(exp.category)]">
                  <component :is="getCategoryIcon(exp.category)" class="h-3.5 w-3.5" />
                  {{ exp.category }}
                </span>
              </td>

              <!-- Description -->
              <td class="p-4 font-semibold text-slate-800 dark:text-zinc-200 max-w-xs truncate" :title="exp.description">
                {{ exp.description }}
              </td>

              <!-- Receipt -->
              <td class="p-4">
                <button
                  v-if="exp.receiptImage"
                  @click="viewingReceiptUrl = exp.receiptImage"
                  class="text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 text-[11px]"
                >
                  <Eye class="h-3.5 w-3.5" /> View Receipt
                </button>
                <span v-else class="text-zinc-400 text-[11px] font-bold uppercase tracking-wider">— No Attachment</span>
              </td>

              <!-- Amount -->
              <td class="p-4 text-right font-bold text-slate-900 dark:text-zinc-100 text-sm">
                {{ formatPHP(exp.amount) }}
              </td>

              <!-- Operations -->
              <td class="p-4 text-right">
                <button
                  @click="handleDelete(exp.id)"
                  class="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-rose-600 rounded-md transition-colors"
                  title="Delete Record"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL: Add Expense -->
    <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" id="add-expense-modal">
      <div class="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">Log Business Expense</h3>
          <button 
            @click="isAddModalOpen = false"
            class="text-zinc-400 hover:text-zinc-600 p-1"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-4 space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <!-- Category -->
            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Category *</label>
              <select
                v-model="category"
                class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-bold"
              >
                <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <!-- Amount -->
            <div>
              <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Cost (PHP) *</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-2.5 font-bold text-zinc-400 font-sans">₱</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="e.g. 5250"
                  v-model="amount"
                  class="w-full pl-6 pr-2 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none font-bold"
                />
              </div>
            </div>
          </div>

          <!-- Date -->
          <div>
            <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Date of Expense *</label>
            <input
              type="date"
              required
              v-model="date"
              class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-bold"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Particulars *</label>
            <input
              type="text"
              required
              v-model="description"
              placeholder="e.g. Rent for the storefront, Marketing ad placements"
              class="w-full p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-medium"
            />
          </div>

          <!-- Drag & Drop Receipt attachment -->
          <div>
            <label class="block font-bold text-slate-600 dark:text-zinc-300 mb-1 uppercase tracking-wide">Receipt Attachment</label>
            
            <div v-if="receiptImage" class="relative border border-slate-200 dark:border-zinc-700 rounded-lg p-2 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <img 
                  :src="receiptImage" 
                  alt="Receipt preview" 
                  class="w-12 h-12 object-cover rounded-md border border-slate-200" 
                />
                <div>
                  <p class="font-bold text-zinc-700 dark:text-zinc-300">receipt_attached.png</p>
                  <p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">Scanned and attached</p>
                </div>
              </div>
              <button
                type="button"
                @click="receiptImage = ''"
                class="p-1 bg-rose-50 dark:bg-rose-950/20 text-rose-50 rounded-full hover:bg-rose-100"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
            <div
              v-else
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @drop="handleDrop"
              @click="fileInputRef?.click()"
              :class="['border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all',
                isReceiptDragging 
                  ? 'border-rose-500 bg-rose-50/20' 
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-rose-500/50'
              ]"
            >
              <UploadCloud class="h-8 w-8 text-zinc-400" />
              <p class="text-center font-bold text-zinc-600 dark:text-zinc-300">Drop receipt here, or browse files</p>
              <p class="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">PNG, JPG, WEBP up to 5MB</p>
              
              <input 
                type="file" 
                ref="fileInputRef" 
                @change="handleFileSelect" 
                accept="image/*" 
                class="hidden" 
              />
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              @click="isAddModalOpen = false"
              class="flex-1 py-2 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 font-bold uppercase tracking-wider text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold uppercase tracking-wider text-[10px]"
            >
              Log Expense
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- LIGHTBOX: Viewing Receipt image -->
    <div 
      v-if="viewingReceiptUrl"
      @click="viewingReceiptUrl = null"
      class="fixed inset-0 z-55 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
    >
      <div class="relative max-w-2xl max-h-[85vh] bg-zinc-900 p-2 rounded-xl border border-zinc-800 shadow-2xl" @click.stop>
        <button
          @click="viewingReceiptUrl = null"
          class="absolute -top-3 -right-3 bg-white text-black p-1.5 rounded-full shadow-lg"
        >
          <X class="h-4 w-4" />
        </button>
        <img 
          :src="viewingReceiptUrl" 
          alt="Receipt Attachment Lightbox" 
          class="max-w-full max-h-[80vh] object-contain rounded-lg" 
        />
        <p class="text-center text-[10px] text-zinc-400 mt-2 font-mono uppercase tracking-widest font-semibold">Click outside receipt to close</p>
      </div>
    </div>
  </div>
</template>
