const formatBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPct = (v) => `${v.toFixed(2)}%`;

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
    const res = await fetch('/api/simular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valorTotal, valorEntrada, parcelas })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.erro || 'Erro na simulação');
    }
    const data = await res.json();
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
      <div style="overflow-x:auto">
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
                  <td><strong>${r.banco}</strong>${r.observacao ? `<br><small style="color:#6b7280">${r.observacao}</small>` : ''}</td>
                  <td>${formatPct(r.taxaMensal)}</td>
                  <td>${formatBRL(r.parcela)}</td>
                  <td>${formatBRL(r.totalGeral)}</td>
                  <td>${formatBRL(r.jurosPagos)}</td>
                  <td>${status}</td>
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
