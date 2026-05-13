/**
 * Servidor de desenvolvimento local.
 *
 * Em produção (Vercel), o site é 100% estático e servido a partir de /public.
 * Este servidor existe apenas para rodar localmente sem precisar instalar
 * outro http server.
 *
 * Uso:
 *   npm install
 *   npm run dev
 *   abrir http://localhost:3030
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3030;

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`\nIDEIA-TEC rodando em http://localhost:${PORT}`);
  console.log(`  • Hub:           http://localhost:${PORT}/`);
  console.log(`  • Financiamento: http://localhost:${PORT}/financiamento/`);
  console.log(`  • Motorhome:     http://localhost:${PORT}/motorhome/\n`);
});
