import { Product, Transaction, Expense, Partner, ProfitDistributionRecord, StockMovement } from './types';

// Philippine Peso currency formatter
export const formatPHP = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Generates dynamic dates relative to today
const getPastDate = (daysAgo: number, hourOffset = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hourOffset);
  return d.toISOString();
};

export const INITIAL_PRODUCTS: Product[] = [
  // {
  //   id: 'prod-1',
  //   sku: 'FTW-RCRT-42',
  //   barcode: '4801122334455',
  //   name: 'Vanguard Retro Court Sneakers (White/Navy)',
  //   description: 'Premium leather classic court sneakers with vintage styling and comfort insoles.',
  //   category: 'Footwear',
  //   brand: 'Vanguard',
  //   supplier: 'Aegis Footwear Corp',
  //   costPrice: 1850.00,
  //   sellingPrice: 2799.00,
  //   currentStock: 45,
  //   minimumStock: 10,
  //   image: '👟',
  //   status: 'In Stock',
  //   createdAt: getPastDate(45),
  // },
  // {
  //   id: 'prod-2',
  //   sku: 'APR-CCTN-MD',
  //   barcode: '4802233445566',
  //   name: 'Apex Classic Heavyweight Cotton Tee (Black, M)',
  //   description: 'Preshrunk 220 GSM 100% combed cotton basic t-shirt. Double-needle stitched.',
  //   category: 'Apparel',
  //   brand: 'Apex Apparel',
  //   supplier: 'Apex Garment Mfg',
  //   costPrice: 220.00,
  //   sellingPrice: 399.00,
  //   currentStock: 150,
  //   minimumStock: 30,
  //   image: '👕',
  //   status: 'In Stock',
  //   createdAt: getPastDate(45),
  // },
  // {
  //   id: 'prod-3',
  //   sku: 'HDW-DDNM-OS',
  //   barcode: '4803344556677',
  //   name: 'Distressed Denim Baseball Cap (Indigo)',
  //   description: 'Adjustable vintage washed denim cap with antique brass buckle strap.',
  //   category: 'Headwear',
  //   brand: 'Summit Headwear',
  //   supplier: 'Summit Caps Co.',
  //   costPrice: 140.00,
  //   sellingPrice: 299.00,
  //   currentStock: 85,
  //   minimumStock: 15,
  //   image: '🧢',
  //   status: 'In Stock',
  //   createdAt: getPastDate(45),
  // },
  // {
  //   id: 'prod-4',
  //   sku: 'FTW-TRUN-43',
  //   barcode: '4804455667788',
  //   name: 'AeroFlow Trailblazer Running Shoes',
  //   description: 'Lightweight breathable mesh running shoes with responsive nitrogen-infused foam.',
  //   category: 'Footwear',
  //   brand: 'AeroFlow',
  //   supplier: 'Aegis Footwear Corp',
  //   costPrice: 2100.00,
  //   sellingPrice: 3450.00,
  //   currentStock: 12,
  //   minimumStock: 15,
  //   image: '👟',
  //   status: 'Low Stock',
  //   createdAt: getPastDate(45),
  // },
  // {
  //   id: 'prod-5',
  //   sku: 'APR-GSHD-LG',
  //   barcode: '4805566778899',
  //   name: 'Apex Graphic Streetwear Hoodie (Charcoal, L)',
  //   description: 'Ultra-soft fleece lined graphic hoodie. Custom print back graphic.',
  //   category: 'Apparel',
  //   brand: 'Apex Apparel',
  //   supplier: 'Apex Garment Mfg',
  //   costPrice: 580.00,
  //   sellingPrice: 1199.00,
  //   currentStock: 8,
  //   minimumStock: 12,
  //   image: '🧥',
  //   status: 'Low Stock',
  //   createdAt: getPastDate(45),
  // },
  // {
  //   id: 'prod-6',
  //   sku: 'ACC-MPCB-OS',
  //   barcode: '4806677889900',
  //   name: 'Urban Explorer Canvas Backpack 20L',
  //   description: 'Water-resistant heavy-duty canvas bag with 15.6-inch laptop sleeve.',
  //   category: 'Accessories',
  //   brand: 'Summit Headwear',
  //   supplier: 'Summit Caps Co.',
  //   costPrice: 480.00,
  //   sellingPrice: 850.00,
  //   currentStock: 0,
  //   minimumStock: 8,
  //   image: '🎒',
  //   status: 'Out of Stock',
  //   createdAt: getPastDate(45),
  // },
  // {
  //   id: 'prod-7',
  //   sku: 'ACC-ACSX-3P',
  //   barcode: '4807788990011',
  //   name: 'Apex Cushion Athletic Crew Socks (3-Pack)',
  //   description: 'High-density cushion sports socks with arch compression support.',
  //   category: 'Accessories',
  //   brand: 'Apex Apparel',
  //   supplier: 'Apex Garment Mfg',
  //   costPrice: 110.00,
  //   sellingPrice: 220.00,
  //   currentStock: 95,
  //   minimumStock: 20,
  //   image: '🧦',
  //   status: 'In Stock',
  //   createdAt: getPastDate(45),
  // },
  // {
  //   id: 'prod-8',
  //   sku: 'HDW-SBCP-OS',
  //   barcode: '4808899001122',
  //   name: 'Classic Snapback Flat Brim Cap (Black)',
  //   description: '6-panel structured high profile snapback cap with wool-blend fabric.',
  //   category: 'Headwear',
  //   brand: 'Summit Headwear',
  //   supplier: 'Summit Caps Co.',
  //   costPrice: 180.00,
  //   sellingPrice: 350.00,
  //   currentStock: 60,
  //   minimumStock: 15,
  //   image: '🧢',
  //   status: 'In Stock',
  //   createdAt: getPastDate(45),
  // }
];

export const INITIAL_EXPENSES: Expense[] = [
  // {
  //   id: 'exp-1',
  //   category: 'Rent',
  //   amount: 15000.00,
  //   description: 'Monthly store venue lease (Avenue Commerce Center)',
  //   date: getPastDate(25),
  //   createdAt: getPastDate(25),
  // },
  // {
  //   id: 'exp-2',
  //   category: 'Salary',
  //   amount: 12000.00,
  //   description: 'Salary for store assistant staff (First Half of Month)',
  //   date: getPastDate(15),
  //   createdAt: getPastDate(15),
  // },
  // {
  //   id: 'exp-3',
  //   category: 'Electricity',
  //   amount: 4850.25,
  //   description: 'Meralco Electric Bill - June Billing Cycle',
  //   date: getPastDate(10),
  //   createdAt: getPastDate(10),
  // },
  // {
  //   id: 'exp-4',
  //   category: 'Internet',
  //   amount: 1899.00,
  //   description: 'PLDT Home Fibr Business internet plan',
  //   date: getPastDate(28),
  //   createdAt: getPastDate(28),
  // },
  // {
  //   id: 'exp-5',
  //   category: 'Miscellaneous',
  //   amount: 850.00,
  //   description: 'Plastic bags and cleaning materials pack',
  //   date: getPastDate(5),
  //   createdAt: getPastDate(5),
  // }
];

export const INITIAL_PARTNERS: Partner[] = [
  // { id: 'part-1', name: 'Maria Santos (Operations)', sharePercentage: 70 },
  // { id: 'part-2', name: 'Juan Dela Cruz (Silent Partner)', sharePercentage: 15 },
  // { id: 'part-3', name: 'Elena Gomez (Silent Partner)', sharePercentage: 15 }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // {
  //   id: 'tx-1',
  //   invoiceNo: 'INV-2026-0001',
  //   items: [
  //     { productId: 'prod-1', name: 'Vanguard Retro Court Sneakers (White/Navy)', sku: 'FTW-RCRT-42', costPrice: 1850.00, sellingPrice: 2799.00, quantity: 1, discount: 0, totalPrice: 2799.00 },
  //     { productId: 'prod-3', name: 'Distressed Denim Baseball Cap (Indigo)', sku: 'HDW-DDNM-OS', costPrice: 140.00, sellingPrice: 299.00, quantity: 2, discount: 0, totalPrice: 598.00 }
  //   ],
  //   subtotal: 3397.00,
  //   discountAmount: 0,
  //   total: 3397.00,
  //   costOfGoodsSold: 2130.00,
  //   profit: 1267.00,
  //   paymentMethod: 'Cash',
  //   createdAt: getPastDate(12, 2),
  // },
  // {
  //   id: 'tx-2',
  //   invoiceNo: 'INV-2026-0002',
  //   items: [
  //     { productId: 'prod-2', name: 'Apex Classic Heavyweight Cotton Tee (Black, M)', sku: 'APR-CCTN-MD', costPrice: 220.00, sellingPrice: 399.00, quantity: 2, discount: 0, totalPrice: 798.00 },
  //     { productId: 'prod-8', name: 'Classic Snapback Flat Brim Cap (Black)', sku: 'HDW-SBCP-OS', costPrice: 180.00, sellingPrice: 350.00, quantity: 1, discount: 0, totalPrice: 350.00 }
  //   ],
  //   subtotal: 1148.00,
  //   discountAmount: 50.00,
  //   total: 1098.00,
  //   costOfGoodsSold: 620.00,
  //   profit: 478.00,
  //   paymentMethod: 'GCash',
  //   customerName: 'Ariel Roxas',
  //   createdAt: getPastDate(8, 4),
  // },
  // {
  //   id: 'tx-3',
  //   invoiceNo: 'INV-2026-0003',
  //   items: [
  //     { productId: 'prod-7', name: 'Apex Cushion Athletic Crew Socks (3-Pack)', sku: 'ACC-ACSX-3P', costPrice: 110.00, sellingPrice: 220.00, quantity: 3, discount: 0, totalPrice: 660.00 }
  //   ],
  //   subtotal: 660.00,
  //   discountAmount: 60.00,
  //   total: 600.00,
  //   costOfGoodsSold: 330.00,
  //   profit: 270.00,
  //   paymentMethod: 'Maya',
  //   createdAt: getPastDate(4, 1),
  // },
  // {
  //   id: 'tx-4',
  //   invoiceNo: 'INV-2026-0004',
  //   items: [
  //     { productId: 'prod-1', name: 'Vanguard Retro Court Sneakers (White/Navy)', sku: 'FTW-RCRT-42', costPrice: 1850.00, sellingPrice: 2799.00, quantity: 5, discount: 0, totalPrice: 13995.00 },
  //     { productId: 'prod-3', name: 'Distressed Denim Baseball Cap (Indigo)', sku: 'HDW-DDNM-OS', costPrice: 140.00, sellingPrice: 299.00, quantity: 10, discount: 0, totalPrice: 2990.00 }
  //   ],
  //   subtotal: 16985.00,
  //   discountAmount: 985.00,
  //   total: 16000.00,
  //   costOfGoodsSold: 10650.00,
  //   profit: 5350.00,
  //   paymentMethod: 'Bank Transfer',
  //   customerName: 'Victoria Hotel Inc.',
  //   createdAt: getPastDate(2, 6),
  // },
  // {
  //   id: 'tx-5',
  //   invoiceNo: 'INV-2026-0005',
  //   items: [
  //     { productId: 'prod-2', name: 'Apex Classic Heavyweight Cotton Tee (Black, M)', sku: 'APR-CCTN-MD', costPrice: 220.00, sellingPrice: 399.00, quantity: 3, discount: 0, totalPrice: 1197.00 }
  //   ],
  //   subtotal: 1197.00,
  //   discountAmount: 0,
  //   total: 1197.00,
  //   costOfGoodsSold: 660.00,
  //   profit: 537.00,
  //   paymentMethod: 'Cash',
  //   createdAt: getPastDate(0, 3), // Today
  // }
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  // {
  //   id: 'mv-1',
  //   productId: 'prod-6',
  //   productName: 'Urban Explorer Canvas Backpack 20L',
  //   type: 'Out',
  //   quantity: 12,
  //   previousStock: 12,
  //   newStock: 0,
  //   reason: 'Sold via POS / In-Store Purchase',
  //   createdAt: getPastDate(10),
  // },
  // {
  //   id: 'mv-2',
  //   productId: 'prod-4',
  //   productName: 'AeroFlow Trailblazer Running Shoes',
  //   type: 'Adjustment',
  //   quantity: -5,
  //   previousStock: 17,
  //   newStock: 12,
  //   reason: 'Damaged item during shelf restocking',
  //   createdAt: getPastDate(15),
  // },
  // {
  //   id: 'mv-3',
  //   productId: 'prod-2',
  //   productName: 'Apex Classic Heavyweight Cotton Tee (Black, M)',
  //   type: 'In',
  //   quantity: 100,
  //   previousStock: 50,
  //   newStock: 150,
  //   reason: 'Restock batch delivery from Apex Garments',
  //   createdAt: getPastDate(20),
  // }
];

export const INITIAL_DISTRIBUTIONS: ProfitDistributionRecord[] = [
  // {
  //   id: 'dist-1',
  //   month: '2026-05',
  //   revenue: 45280.00,
  //   cogs: 32150.00,
  //   expenses: 10450.00,
  //   netProfit: 2680.00,
  //   distributedAmount: 2680.00,
  //   distributions: [
  //     { partnerId: 'part-1', partnerName: 'Maria Santos (Operations)', percentage: 70, amount: 1876.00 },
  //     { partnerId: 'part-2', partnerName: 'Juan Dela Cruz (Silent Partner)', percentage: 15, amount: 402.00 },
  //     { partnerId: 'part-3', partnerName: 'Elena Gomez (Silent Partner)', percentage: 15, amount: 402.00 }
  //   ],
  //   createdAt: getPastDate(30),
  // }
];

// CSV Helpers
export const exportToCSV = (headers: string[], rows: string[][], filename: string) => {
  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split('\n');
  return lines
    .map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    })
    .filter(row => row.length > 0 && row.some(cell => cell !== ''));
};

// Generates dynamic Barcode & SKU based on input details
export const generateSKU = (category: string, name: string): string => {
  const catPrefix = (category || 'GEN').substring(0, 3).toUpperCase();
  const cleanName = (name || 'PROD').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  const randNum = Math.floor(100 + Math.random() * 900);
  return `${catPrefix}-${cleanName}-${randNum}`;
};

export const generateBarcode = (): string => {
  let code = '480'; // Philippine country prefix
  for (let i = 0; i < 10; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
};
