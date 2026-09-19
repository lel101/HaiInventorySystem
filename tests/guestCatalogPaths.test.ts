import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveGuestCatalogPath } from '../api/app.ts';

test('guest catalog resolves to the project public file in local development', () => {
  delete process.env.VERCEL;
  delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  delete process.env.NETLIFY;

  const path = resolveGuestCatalogPath();

  assert.match(path, /public\\catalog\.json$|public\/catalog\.json$/);
  assert.ok(path.includes('HaiInventorySystem'));
});

test('guest catalog resolves to temp storage in serverless runtimes', () => {
  process.env.VERCEL = '1';

  const path = resolveGuestCatalogPath();

  assert.match(path, /tmp|Temp|temp/i);
  assert.match(path, /catalog\.json$/);
  assert.ok(path.includes('hai-inventory'));

  delete process.env.VERCEL;
});
