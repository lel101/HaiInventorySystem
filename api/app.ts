import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { Pool, PoolClient } from 'pg';
import type {
  Expense,
  Partner,
  Product,
  ProfitDistributionRecord,
  StockMovement,
  Transaction,
} from '../src/types';

interface PersistedAppState {
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
  partners: Partner[];
  distributions: ProfitDistributionRecord[];
  stockMovements: StockMovement[];
  darkMode: boolean;
}

dotenv.config({ path: '.env.local' });
dotenv.config();

const databaseUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;
const databaseUrlSource = process.env.POSTGRES_URL_NON_POOLING
  ? 'POSTGRES_URL_NON_POOLING'
  : process.env.POSTGRES_URL
    ? 'POSTGRES_URL'
    : process.env.POSTGRES_PRISMA_URL
      ? 'POSTGRES_PRISMA_URL'
      : process.env.DATABASE_URL
        ? 'DATABASE_URL'
        : 'none';

if (!databaseUrl) {
  console.warn('No PostgreSQL connection string is set. API database routes will fail until it is configured.');
}

const shouldUseSsl = (url?: string): boolean => {
  if (!url) return false;
  return !url.includes('localhost') && !url.includes('127.0.0.1');
};

const normalizeDatabaseUrl = (url?: string): string | undefined => {
  if (!url || !shouldUseSsl(url)) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('sslmode', 'no-verify');
    return parsed.toString();
  } catch {
    return url;
  }
};

const normalizedDatabaseUrl = normalizeDatabaseUrl(databaseUrl);

const pool = new Pool({
  connectionString: normalizedDatabaseUrl,
  ssl: shouldUseSsl(normalizedDatabaseUrl) ? { rejectUnauthorized: false } : false,
});

const app = express();
const migrationsDir = path.join(process.cwd(), 'db', 'migrations');

app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  if (!req.url.startsWith('/api/')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  next();
});

const toNumber = (value: unknown): number => Number(value ?? 0);
const toIsoString = (value: unknown): string => new Date(value as string | Date).toISOString();
const toDateString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().substring(0, 10);
  return String(value || '').substring(0, 10);
};

const ensureSchema = async () => {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = (await readFile(path.join(migrationsDir, file), 'utf8')).replace(/^\uFEFF/, '');
    await pool.query(sql);
  }
};

const verifyPassword = (password: string, storedHash: string): boolean => {
  const [algorithm, iterationsValue, salt, expectedHash] = storedHash.split('$');
  if (algorithm !== 'pbkdf2_sha256' || !iterationsValue || !salt || !expectedHash) return false;

  const iterations = Number(iterationsValue);
  const actualHash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const getBearerToken = (authorization?: string): string | null => {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.substring('Bearer '.length).trim() || null;
};

const createSession = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `insert into admin_sessions (token, user_id, expires_at)
     values ($1, $2, now() + interval '7 days')`,
    [token, userId]
  );
  return token;
};

const isValidSession = async (token: string | null): Promise<boolean> => {
  if (!token) return false;

  const result = await pool.query(
    `select token from admin_sessions
     where token = $1 and expires_at > now()
     limit 1`,
    [token]
  );

  return result.rowCount > 0;
};

const loadRelationalState = async (client: PoolClient): Promise<PersistedAppState> => {
  const [
    productsResult,
    stockMovementsResult,
    transactionsResult,
    transactionItemsResult,
    expensesResult,
    partnersResult,
    distributionsResult,
    distributionItemsResult,
    settingsResult,
  ] = await Promise.all([
    client.query('select * from products order by created_at desc'),
    client.query('select * from stock_movements order by created_at desc'),
    client.query('select * from transactions order by created_at desc'),
    client.query('select * from transaction_items order by id asc'),
    client.query('select * from expenses order by date desc, created_at desc'),
    client.query('select * from partners order by name asc'),
    client.query('select * from profit_distributions order by month desc, created_at desc'),
    client.query('select * from profit_distribution_items order by id asc'),
    client.query('select key, value from app_settings'),
  ]);

  const transactionItemsById = new Map<string, Transaction['items']>();
  for (const row of transactionItemsResult.rows) {
    const items = transactionItemsById.get(row.transaction_id) || [];
    items.push({
      productId: row.product_id,
      name: row.name,
      sku: row.sku,
      costPrice: toNumber(row.cost_price),
      sellingPrice: toNumber(row.selling_price),
      quantity: toNumber(row.quantity),
      discount: toNumber(row.discount),
      totalPrice: toNumber(row.total_price),
    });
    transactionItemsById.set(row.transaction_id, items);
  }

  const distributionItemsById = new Map<string, ProfitDistributionRecord['distributions']>();
  for (const row of distributionItemsResult.rows) {
    const items = distributionItemsById.get(row.distribution_id) || [];
    items.push({
      partnerId: row.partner_id,
      partnerName: row.partner_name,
      percentage: toNumber(row.percentage),
      amount: toNumber(row.amount),
    });
    distributionItemsById.set(row.distribution_id, items);
  }

  const settings = new Map<string, string>(settingsResult.rows.map((row) => [row.key, row.value]));

  return {
    products: productsResult.rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      description: row.description,
      category: row.category,
      brand: row.brand,
      supplier: row.supplier,
      costPrice: toNumber(row.cost_price),
      sellingPrice: toNumber(row.selling_price),
      currentStock: toNumber(row.current_stock),
      minimumStock: toNumber(row.minimum_stock),
      image: row.image,
      status: row.status,
      createdAt: toIsoString(row.created_at),
    })),
    transactions: transactionsResult.rows.map((row) => ({
      id: row.id,
      invoiceNo: row.invoice_no,
      items: transactionItemsById.get(row.id) || [],
      subtotal: toNumber(row.subtotal),
      discountAmount: toNumber(row.discount_amount),
      total: toNumber(row.total),
      costOfGoodsSold: toNumber(row.cost_of_goods_sold),
      profit: toNumber(row.profit),
      paymentMethod: row.payment_method,
      customerName: row.customer_name || undefined,
      createdAt: toIsoString(row.created_at),
    })),
    expenses: expensesResult.rows.map((row) => ({
      id: row.id,
      category: row.category,
      amount: toNumber(row.amount),
      description: row.description,
      date: toDateString(row.date),
      receiptImage: row.receipt_image || undefined,
      createdAt: toIsoString(row.created_at),
    })),
    partners: partnersResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      sharePercentage: toNumber(row.share_percentage),
    })),
    distributions: distributionsResult.rows.map((row) => ({
      id: row.id,
      month: row.month,
      revenue: toNumber(row.revenue),
      cogs: toNumber(row.cogs),
      expenses: toNumber(row.expenses),
      netProfit: toNumber(row.net_profit),
      distributedAmount: toNumber(row.distributed_amount),
      distributions: distributionItemsById.get(row.id) || [],
      createdAt: toIsoString(row.created_at),
    })),
    stockMovements: stockMovementsResult.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      type: row.type,
      quantity: toNumber(row.quantity),
      previousStock: toNumber(row.previous_stock),
      newStock: toNumber(row.new_stock),
      reason: row.reason,
      createdAt: toIsoString(row.created_at),
    })),
    darkMode: settings.get('dark_mode') === 'true',
  };
};

const replaceRelationalState = async (client: PoolClient, state: PersistedAppState) => {
  await client.query('begin');
  try {
    await client.query('delete from profit_distribution_items');
    await client.query('delete from profit_distributions');
    await client.query('delete from transaction_items');
    await client.query('delete from transactions');
    await client.query('delete from stock_movements');
    await client.query('delete from expenses');
    await client.query('delete from partners');
    await client.query('delete from products');

    for (const product of state.products || []) {
      await client.query(
        `insert into products (
          id, sku, barcode, name, description, category, brand, supplier, cost_price,
          selling_price, current_stock, minimum_stock, image, status, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          product.id,
          product.sku,
          product.barcode || '',
          product.name,
          product.description || '',
          product.category,
          product.brand || '',
          product.supplier || '',
          product.costPrice,
          product.sellingPrice,
          product.currentStock,
          product.minimumStock,
          product.image || '',
          product.status,
          product.createdAt,
        ]
      );
    }

    for (const movement of state.stockMovements || []) {
      await client.query(
        `insert into stock_movements (
          id, product_id, product_name, type, quantity, previous_stock, new_stock, reason, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          movement.id,
          movement.productId,
          movement.productName,
          movement.type,
          movement.quantity,
          movement.previousStock,
          movement.newStock,
          movement.reason,
          movement.createdAt,
        ]
      );
    }

    for (const transaction of state.transactions || []) {
      await client.query(
        `insert into transactions (
          id, invoice_no, subtotal, discount_amount, total, cost_of_goods_sold,
          profit, payment_method, customer_name, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          transaction.id,
          transaction.invoiceNo,
          transaction.subtotal,
          transaction.discountAmount,
          transaction.total,
          transaction.costOfGoodsSold,
          transaction.profit,
          transaction.paymentMethod,
          transaction.customerName || null,
          transaction.createdAt,
        ]
      );

      for (const item of transaction.items || []) {
        await client.query(
          `insert into transaction_items (
            transaction_id, product_id, name, sku, cost_price, selling_price, quantity, discount, total_price
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            transaction.id,
            item.productId,
            item.name,
            item.sku,
            item.costPrice,
            item.sellingPrice,
            item.quantity,
            item.discount,
            item.totalPrice,
          ]
        );
      }
    }

    for (const expense of state.expenses || []) {
      await client.query(
        `insert into expenses (
          id, category, amount, description, date, receipt_image, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          expense.id,
          expense.category,
          expense.amount,
          expense.description,
          expense.date,
          expense.receiptImage || null,
          expense.createdAt,
        ]
      );
    }

    for (const partner of state.partners || []) {
      await client.query(
        'insert into partners (id, name, share_percentage) values ($1, $2, $3)',
        [partner.id, partner.name, partner.sharePercentage]
      );
    }

    for (const distribution of state.distributions || []) {
      await client.query(
        `insert into profit_distributions (
          id, month, revenue, cogs, expenses, net_profit, distributed_amount, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          distribution.id,
          distribution.month,
          distribution.revenue,
          distribution.cogs,
          distribution.expenses,
          distribution.netProfit,
          distribution.distributedAmount,
          distribution.createdAt,
        ]
      );

      for (const item of distribution.distributions || []) {
        await client.query(
          `insert into profit_distribution_items (
            distribution_id, partner_id, partner_name, percentage, amount
          ) values ($1, $2, $3, $4, $5)`,
          [distribution.id, item.partnerId, item.partnerName, item.percentage, item.amount]
        );
      }
    }

    await client.query(
      `insert into app_settings (key, value, updated_at)
       values ('dark_mode', $1, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [String(!!state.darkMode)]
    );

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
};

app.get('/api/health', async (_req, res) => {
  try {
    await ensureSchema();
    await pool.query('select 1');
    res.json({ ok: true, databaseUrlSource });
  } catch (error) {
    res.status(500).json({
      ok: false,
      databaseUrlSource,
      error: error instanceof Error ? error.message : 'Database error',
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await ensureSchema();

    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    const result = await pool.query(
      'select id, password_hash from admin_users where username = $1 limit 1',
      [username]
    );
    const user = result.rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = await createSession(user.id);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to login' });
  }
});

app.get('/api/auth/session', async (req, res) => {
  try {
    await ensureSchema();
    const token = getBearerToken(req.headers.authorization);
    res.json({ authenticated: await isValidSession(token) });
  } catch (error) {
    res.status(500).json({ authenticated: false, error: error instanceof Error ? error.message : 'Failed to check session' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    await ensureSchema();
    const token = getBearerToken(req.headers.authorization);
    if (token) {
      await pool.query('delete from admin_sessions where token = $1', [token]);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to logout' });
  }
});

app.get('/api/state', async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureSchema();
    if (!await isValidSession(getBearerToken(req.headers.authorization))) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const data = await loadRelationalState(client);
    res.json({ data, updated_at: null });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load database state' });
  } finally {
    client.release();
  }
});

app.put('/api/state', async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureSchema();
    if (!await isValidSession(getBearerToken(req.headers.authorization))) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    await replaceRelationalState(client, req.body as PersistedAppState);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save database state' });
  } finally {
    client.release();
  }
});

export default app;
