const STORAGE_KEY = 'financiamento_taxas_v1';
const DEFAULT_DB_URL = '/data/taxas.json';

const form = document.getElementById('form-banco');
const tbody = document.getElementById('tbody-bancos');
const formTitulo = document.getElementById('form-titulo');
const btnCancelar = document.getElementById('btn-cancelar');
const btnSalvar = document.getElementById('btn-salvar');
const btnReset = document.getElementById('btn-reset');

const campos = ['bancoId', 'banco', 'taxaMensal', 'prazoMaximo', 'entradaMinima', 'observacao'];
const get = (id) => document.getElementById(id);

async function loadDB() {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try { return JSON.parse(local); } catch { /* fallback */ }
  }
  const res = await fetch(DEFAULT_DB_URL);
  return await res.json();
}

function saveDB(db) {
  db.atualizadoEm = new Date().toISOString().slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function nextId(bancos) {
  return bancos.reduce((max, b) => Math.max(max, b.id), 0) + 1;
}

async function carregar() {
  const db = await loadDB();
  if (!db.bancos.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Nenhum banco cadastrado</td></tr>`;
    return;
  }
  tbody.innerHTML = db.bancos
    .sort((a, b) => a.taxaMensal - b.taxaMensal)
    .map(b => `
      <tr>
        <td data-label="Banco"><strong>${b.banco}</strong></td>
        <td data-label="Taxa a.m.">${b.taxaMensal.toFixed(2)}%</td>
        <td data-label="Prazo máx.">${b.prazoMaximo}x</td>
        <td data-label="Entrada mín.">${b.entradaMinima}%</td>
        <td data-label="Observação">${b.observacao || '—'}</td>
        <td data-label="Ações" class="actions">
          <button class="btn-secondary" data-id="${b.id}" data-action="editar">Editar</button>
          <button class="btn-danger" data-id="${b.id}" data-nome="${b.banco.replace(/"/g, '&quot;')}" data-action="excluir">Excluir</button>
        </td>
      </tr>
    `).join('');
}

function resetForm() {
  campos.forEach(c => get(c).value = '');
  formTitulo.textContent = 'Adicionar banco';
  btnSalvar.textContent = 'Salvar';
  btnCancelar.style.display = 'none';
}

async function editar(id) {
  const db = await loadDB();
  const b = db.bancos.find(x => x.id === id);
  if (!b) return alert('Banco não encontrado');
  get('bancoId').value = b.id;
  get('banco').value = b.banco;
  get('taxaMensal').value = b.taxaMensal;
  get('prazoMaximo').value = b.prazoMaximo;
  get('entradaMinima').value = b.entradaMinima;
  get('observacao').value = b.observacao || '';
  formTitulo.textContent = `Editando: ${b.banco}`;
  btnSalvar.textContent = 'Atualizar';
  btnCancelar.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluir(id, nome) {
  if (!confirm(`Excluir o banco "${nome}"?`)) return;
  const db = await loadDB();
  db.bancos = db.bancos.filter(b => b.id !== id);
  saveDB(db);
  carregar();
}

tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === 'editar') editar(id);
  if (btn.dataset.action === 'excluir') excluir(id, btn.dataset.nome);
});

btnCancelar.addEventListener('click', resetForm);

if (btnReset) {
  btnReset.addEventListener('click', () => {
    if (!confirm('Restaurar a lista de bancos para o padrão? Suas alterações locais serão perdidas.')) return;
    localStorage.removeItem(STORAGE_KEY);
    carregar();
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = get('bancoId').value;
  const payload = {
    banco: get('banco').value.trim(),
    taxaMensal: parseFloat(get('taxaMensal').value),
    prazoMaximo: parseInt(get('prazoMaximo').value, 10),
    entradaMinima: parseFloat(get('entradaMinima').value),
    observacao: get('observacao').value.trim()
  };
  if (!payload.banco || isNaN(payload.taxaMensal) || isNaN(payload.prazoMaximo) || isNaN(payload.entradaMinima)) {
    return alert('Preencha todos os campos obrigatórios.');
  }

  const db = await loadDB();
  if (id) {
    const idx = db.bancos.findIndex(b => b.id === Number(id));
    if (idx === -1) return alert('Banco não encontrado');
    db.bancos[idx] = { ...db.bancos[idx], ...payload };
  } else {
    db.bancos.push({ id: nextId(db.bancos), ...payload });
  }
  saveDB(db);
  resetForm();
  carregar();
});

carregar();
