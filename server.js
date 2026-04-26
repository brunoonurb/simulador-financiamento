const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3030;
const DB_PATH = path.join(__dirname, 'data', 'taxas.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(db) {
  db.atualizadoEm = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function nextId(bancos) {
  return bancos.reduce((max, b) => Math.max(max, b.id), 0) + 1;
}

// Tabela Price: PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)
function calcularParcela(valorFinanciado, taxaMensalPct, parcelas) {
  const i = taxaMensalPct / 100;
  if (i === 0) return valorFinanciado / parcelas;
  const fator = Math.pow(1 + i, parcelas);
  return valorFinanciado * (i * fator) / (fator - 1);
}

// ----- CRUD de taxas -----
app.get('/api/taxas', (req, res) => {
  res.json(readDB());
});

app.get('/api/taxas/:id', (req, res) => {
  const db = readDB();
  const banco = db.bancos.find(b => b.id === Number(req.params.id));
  if (!banco) return res.status(404).json({ erro: 'Banco não encontrado' });
  res.json(banco);
});

app.post('/api/taxas', (req, res) => {
  const { banco, taxaMensal, prazoMaximo, entradaMinima, observacao } = req.body;
  if (!banco || taxaMensal == null || !prazoMaximo || entradaMinima == null) {
    return res.status(400).json({ erro: 'Campos obrigatórios: banco, taxaMensal, prazoMaximo, entradaMinima' });
  }
  const db = readDB();
  const novo = {
    id: nextId(db.bancos),
    banco: String(banco),
    taxaMensal: Number(taxaMensal),
    prazoMaximo: Number(prazoMaximo),
    entradaMinima: Number(entradaMinima),
    observacao: observacao || ''
  };
  db.bancos.push(novo);
  writeDB(db);
  res.status(201).json(novo);
});

app.put('/api/taxas/:id', (req, res) => {
  const db = readDB();
  const idx = db.bancos.findIndex(b => b.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ erro: 'Banco não encontrado' });
  const atual = db.bancos[idx];
  const atualizado = {
    ...atual,
    banco: req.body.banco ?? atual.banco,
    taxaMensal: req.body.taxaMensal != null ? Number(req.body.taxaMensal) : atual.taxaMensal,
    prazoMaximo: req.body.prazoMaximo != null ? Number(req.body.prazoMaximo) : atual.prazoMaximo,
    entradaMinima: req.body.entradaMinima != null ? Number(req.body.entradaMinima) : atual.entradaMinima,
    observacao: req.body.observacao ?? atual.observacao
  };
  db.bancos[idx] = atualizado;
  writeDB(db);
  res.json(atualizado);
});

app.delete('/api/taxas/:id', (req, res) => {
  const db = readDB();
  const idx = db.bancos.findIndex(b => b.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ erro: 'Banco não encontrado' });
  const [removido] = db.bancos.splice(idx, 1);
  writeDB(db);
  res.json(removido);
});

// ----- Simulação -----
app.post('/api/simular', (req, res) => {
  const valorTotal = Number(req.body.valorTotal);
  const valorEntrada = Number(req.body.valorEntrada);
  const parcelas = Number(req.body.parcelas);

  if (!valorTotal || valorTotal <= 0) return res.status(400).json({ erro: 'Valor total inválido' });
  if (valorEntrada < 0 || valorEntrada >= valorTotal) return res.status(400).json({ erro: 'Valor de entrada inválido' });
  if (!parcelas || parcelas < 1) return res.status(400).json({ erro: 'Número de parcelas inválido' });

  const valorFinanciado = valorTotal - valorEntrada;
  const percEntrada = (valorEntrada / valorTotal) * 100;
  const db = readDB();

  const resultados = db.bancos.map(b => {
    const elegivel = parcelas <= b.prazoMaximo && percEntrada >= b.entradaMinima;
    const parcela = calcularParcela(valorFinanciado, b.taxaMensal, parcelas);
    const totalFinanciado = parcela * parcelas;
    const totalGeral = totalFinanciado + valorEntrada;
    const jurosPagos = totalFinanciado - valorFinanciado;
    return {
      id: b.id,
      banco: b.banco,
      taxaMensal: b.taxaMensal,
      prazoMaximo: b.prazoMaximo,
      entradaMinima: b.entradaMinima,
      observacao: b.observacao,
      elegivel,
      motivoInelegivel: !elegivel
        ? (parcelas > b.prazoMaximo ? `Prazo máximo é ${b.prazoMaximo}x` : `Entrada mínima é ${b.entradaMinima}%`)
        : null,
      parcela,
      totalFinanciado,
      totalGeral,
      jurosPagos
    };
  });

  const elegiveis = resultados.filter(r => r.elegivel).sort((a, b) => a.totalGeral - b.totalGeral);
  const melhor = elegiveis[0] || null;

  res.json({
    valorTotal,
    valorEntrada,
    valorFinanciado,
    percEntrada,
    parcelas,
    melhor,
    resultados: resultados.sort((a, b) => {
      if (a.elegivel !== b.elegivel) return a.elegivel ? -1 : 1;
      return a.totalGeral - b.totalGeral;
    })
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
