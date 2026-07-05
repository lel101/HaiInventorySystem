import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('DATABASE_URL is not set. API database routes will fail until it is configured.');
}

const pool = new Pool({
  connectionString: databaseUrl,
});

app.use(express.json({ limit: '10mb' }));

const ensureSchema = async () => {
  await pool.query(`
    create table if not exists app_state (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
};

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Database error' });
  }
});

app.get('/api/state', async (_req, res) => {
  try {
    await ensureSchema();
    const result = await pool.query('select data, updated_at from app_state where id = $1', ['default']);
    res.json(result.rows[0] || { data: null, updated_at: null });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load app state' });
  }
});

app.put('/api/state', async (req, res) => {
  try {
    await ensureSchema();
    await pool.query(
      `
        insert into app_state (id, data, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (id)
        do update set data = excluded.data, updated_at = now()
      `,
      ['default', JSON.stringify(req.body)]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save app state' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Hai Store Inventory API listening on http://localhost:${port}`);
});
