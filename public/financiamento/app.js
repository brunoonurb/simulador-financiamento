const formatBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPct = (v) => `${v.toFixed(2)}%`;

const STORAGE_KEY = 'financiamento_taxas_v1';
const DEFAULT_DB_URL = '/data/taxas.json';

async function loadDB() {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try { return JSON.parse(local); } catch { /* fallback */ }
  }
  const res = await fetch(DEFAULT_DB_URL);
  return await res.json();
}

function calcularParcela(valorFinanciado, taxaMensalPct, parcelas) {
  const i = taxaMensalPct / 100;
  if (i === 0) return valorFinanciado / parcelas;
  const fator = Math.pow(1 + i, parcelas);
  return valorFinanciado * (i * fator) / (fator - 1);
}

function simular({ valorTotal, valorEntrada, parcelas }, db) {
  const valorFinanciado = valorTotal - valorEntrada;
  const percEntrada = (valorEntrada / valorTotal) * 100;

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

  return {
    valorTotal, valorEntrada, valorFinanciado, percEntrada, parcelas, melhor,
    resultados: resultados.sort((a, b) => {
      if (a.elegivel !== b.elegivel) return a.elegivel ? -1 : 1;
      return a.totalGeral - b.totalGeral;
    })
  };
}

const form = document.getElementById('form-simulacao');
const resultadoEl = document.getElementById('resultado');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const valorTotal = parseFloat(document.getElementById('valorTotal').value);
  const valorEntrada = parseFloat(document.getElementById('valorEntrada').value);
  const parcelas = parseInt(document.getElementById('parcelas').value, 10);

  if (valorEntrada >= valorTotal) {
    alert('A entrada deve ser menor que o valor total do veículo.');
    return;
  }

  try {
    const db = await loadDB();
    const data = simular({ valorTotal, valorEntrada, parcelas }, db);
    renderizar(data);
  } catch (err) {
    resultadoEl.innerHTML = `<div class="card"><div class="alerta">${err.message}</div></div>`;
  }
});

function renderizar(data) {
  const { valorFinanciado, percEntrada, melhor, resultados } = data;

  let html = `
    <div class="card">
      <h2>Resumo</h2>
      <div class="form-grid">
        <div><label>Valor financiado</label><strong>${formatBRL(valorFinanciado)}</strong></div>
        <div><label>Entrada</label><strong>${formatPct(percEntrada)}</strong></div>
        <div><label>Parcelas</label><strong>${data.parcelas}x</strong></div>
      </div>
    </div>
  `;

  if (melhor) {
    html += `
      <div class="melhor-banco">
        <h3>🏆 Banco mais barato</h3>
        <div class="nome">${melhor.banco}</div>
        <div class="grid">
          <div class="item"><div class="label">Parcela</div><div class="value">${formatBRL(melhor.parcela)}</div></div>
          <div class="item"><div class="label">Total a pagar</div><div class="value">${formatBRL(melhor.totalGeral)}</div></div>
          <div class="item"><div class="label">Juros pagos</div><div class="value">${formatBRL(melhor.jurosPagos)}</div></div>
          <div class="item"><div class="label">Taxa</div><div class="value">${formatPct(melhor.taxaMensal)} a.m.</div></div>
        </div>
      </div>
    `;
  } else {
    html += `<div class="card"><div class="alerta">Nenhum banco aprovou esta simulação. Aumente a entrada ou reduza as parcelas.</div></div>`;
  }

  html += `
    <div class="card">
      <h2>Comparação entre bancos</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Banco</th>
              <th>Taxa a.m.</th>
              <th>Parcela</th>
              <th>Total a pagar</th>
              <th>Juros</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${resultados.map(r => {
              const isMelhor = melhor && r.id === melhor.id;
              const cls = !r.elegivel ? 'inelegivel' : (isMelhor ? 'melhor' : '');
              const status = !r.elegivel
                ? `<span class="badge badge-erro">${r.motivoInelegivel}</span>`
                : (isMelhor
                    ? `<span class="badge badge-melhor">Melhor opção</span>`
                    : `<span class="badge badge-ok">Aprovado</span>`);
              return `
                <tr class="${cls}">
                  <td data-label="Banco"><strong>${r.banco}</strong>${r.observacao ? `<br><small style="color:#6b7280">${r.observacao}</small>` : ''}</td>
                  <td data-label="Taxa a.m.">${formatPct(r.taxaMensal)}</td>
                  <td data-label="Parcela">${formatBRL(r.parcela)}</td>
                  <td data-label="Total a pagar">${formatBRL(r.totalGeral)}</td>
                  <td data-label="Juros">${formatBRL(r.jurosPagos)}</td>
                  <td data-label="Status">${status}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  resultadoEl.innerHTML = html;
  resultadoEl.scrollIntoView({ behavior: 'smooth' });
}
