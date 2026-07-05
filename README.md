<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/27407020-fcf0-4b88-97c5-8f167e7210c9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and set `DATABASE_URL`.
3. Create a local PostgreSQL database, then run the production migration:
   `npm run db:migrate`
4. Start the API server:
   `npm run dev:api`
5. Run the app in another terminal:
   `npm run dev`

Example local PostgreSQL connection:

```env
DATABASE_URL="postgres://postgres:postgres@localhost:5432/hai_store_inventory"
PORT=3001
```

You can also run the migration with psql:

```bash
psql "postgres://postgres:postgres@localhost:5432/hai_store_inventory" -f db/migrations/001_initial_production_schema.sql
```

In pgAdmin, open the same migration file in Query Tool and execute it. This creates real relational tables such as `products`, `transactions`, `transaction_items`, `expenses`, `partners`, and `profit_distributions`; it does not use the old `app_state` JSON table.

Default admin login is seeded into the `admin_users` table:

```text
Username: admin
Password: P@ssw0rd
```

Example Supabase local CLI connection:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
PORT=3001
```

## Deploy to Vercel

This project is configured for Vercel with [vercel.json](vercel.json):

- Vite frontend builds to `dist`.
- `/api/*` routes go to the Express API in [api/[...path].ts](api/[...path].ts).
- Browser refresh/deep links fall back to `index.html`.

Use a hosted PostgreSQL database for production. Your local `localhost` PostgreSQL database will not be reachable from Vercel.

1. Create a Supabase project.
2. Copy the Supabase PostgreSQL connection string.
3. In Vercel, confirm one of these environment variables exists: `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, or `DATABASE_URL`.
4. Run migrations against the Supabase database before using the app:

```bash
DATABASE_URL="your-supabase-postgres-connection-string" npm run db:migrate
```

On Windows PowerShell:

```powershell
$env:DATABASE_URL="your-supabase-postgres-connection-string"
npm run db:migrate
```

5. Deploy/import the Git repo in Vercel.

The app automatically prefers Vercel/Supabase Postgres variables in this order: `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, then `DATABASE_URL`.

If `/api/health` returns an error like `getaddrinfo ENOTFOUND base`, remove or fix the bad `DATABASE_URL` value in Vercel, then redeploy.

Vercel settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Default login after migration:

```text
Username: admin
Password: P@ssw0rd
```
