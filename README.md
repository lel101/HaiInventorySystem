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
3. Create a local PostgreSQL database, then run [db/schema.sql](db/schema.sql).
4. Start the API server:
   `npm run dev:api`
5. Run the app in another terminal:
   `npm run dev`

Example local PostgreSQL connection:

```env
DATABASE_URL="postgres://postgres:postgres@localhost:5432/hai_store_inventory"
PORT=3001
```

Example Supabase local CLI connection:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
PORT=3001
```
