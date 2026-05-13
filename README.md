# IDEIA-TEC

Hub de projetos pessoais — site estático, responsivo (mobile-first), pronto para Vercel.

## Projetos

- **Simulador de Financiamento** (`/financiamento/`) — compara bancos, parcelas e juros para financiar veículo (Tabela Price). CRUD de taxas via `localStorage`.
- **Projeto Motorhome — FIAT Doblò 2015** (`/motorhome/`) — documentação completa: layout, plantas SVG, sistema elétrico, hidráulico, gás, ventilação, materiais, orçamento e DETRAN.

## Estrutura

```
.
├── public/                ← raiz estática (servida pela Vercel)
│   ├── index.html        ← hub
│   ├── styles.css
│   ├── financiamento/
│   │   ├── index.html    ← simulador
│   │   ├── admin.html    ← CRUD (localStorage)
│   │   ├── app.js
│   │   ├── admin.js
│   │   └── styles.css
│   ├── motorhome/
│   │   ├── index.html    ← visão geral completa
│   │   ├── plantas.html  ← plantas SVG ampliadas
│   │   ├── mermaid.html  ← diagramas de fluxo
│   │   ├── styles.css
│   │   └── img/          ← SVGs (vista lateral, esquemas, plantas)
│   └── data/
│       └── taxas.json    ← banco padrão de taxas
├── server.js             ← dev server local (Express)
├── package.json
├── vercel.json           ← config de deploy
└── README.md
```

## Rodando localmente

```bash
npm install
npm run dev
```
Abre em `http://localhost:3030`.

Como tudo é estático, qualquer servidor HTTP serve. Alternativa sem Node:
```bash
cd public && python3 -m http.server 8080
```

## Deploy na Vercel

1. Faça login: `vercel login` (ou conecte o repositório no dashboard).
2. Na raiz do projeto: `vercel` (deploy preview) ou `vercel --prod` (produção).
3. Configurações automáticas:
   - **Output Directory:** `public`
   - **Build Command:** nenhum (site estático puro)
   - **Framework:** Other
4. `vercel.json` já habilita `cleanUrls` (URLs sem `.html`).

Persistência: o simulador roda 100% client-side. As taxas padrão vêm de `/data/taxas.json` e edições do admin ficam no `localStorage` do navegador (botão "Restaurar padrão" reverte).

## Decisões técnicas

- **Sem backend em produção:** Vercel é serverless e o filesystem é read-only entre invocações. Persistir CRUD num JSON exigiria Vercel KV/Postgres — opção descartada para manter o projeto simples e gratuito.
- **Mobile-first:** todas as tabelas viram cards em telas <700px (`data-label` + CSS); botões com touch target ≥44px; inputs com `font-size: 16px` para evitar zoom no iOS.
- **Sem build:** HTML/CSS/JS puros, sem framework. Mermaid via CDN (jsDelivr).
- **SVG inline e externo:** plantas e esquemas em SVG, escaláveis, com texto pesquisável.
