import dotenv from 'dotenv';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config();

const databaseUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('A PostgreSQL connection string is required. Set POSTGRES_URL_NON_POOLING, POSTGRES_URL, POSTGRES_PRISMA_URL, or DATABASE_URL.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

const shouldUseSsl = (url: string): boolean => !url.includes('localhost') && !url.includes('127.0.0.1');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : false,
});

try {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = (await readFile(path.join(migrationsDir, file), 'utf8')).replace(/^\uFEFF/, '');
    await pool.query(sql);
    console.log(`Applied migration: ${file}`);
  }
} finally {
  await pool.end();
}
