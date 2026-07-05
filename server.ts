import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './api/app';

const port = Number(process.env.PORT || 3001);
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
