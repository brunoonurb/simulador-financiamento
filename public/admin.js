const form = document.getElementById('form-banco');
const tbody = document.getElementById('tbody-bancos');
const formTitulo = document.getElementById('form-titulo');
const btnCancelar = document.getElementById('btn-cancelar');
const btnSalvar = document.getElementById('btn-salvar');

const campos = ['bancoId', 'banco', 'taxaMensal', 'prazoMaximo', 'entradaMinima', 'observacao'];
const get = (id) => document.getElementById(id);

async function carregar() {
  const res = await fetch('/api/taxas');
  const db = await res.json();
  if (!db.bancos.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Nenhum banco cadastrado</td></tr>`;
    return;
  }
  tbody.innerHTML = db.bancos
    .sort((a, b) => a.taxaMensal - b.taxaMensal)
    .map(b => `
      <tr>
        <td><strong>${b.banco}</strong></td>
        <td>${b.taxaMensal.toFixed(2)}%</td>
        <td>${b.prazoMaximo}x</td>
        <td>${b.entradaMinima}%</td>
        <td>${b.observacao || '—'}</td>
        <td class="actions">
          <button class="btn-secondary" onclick="editar(${b.id})">Editar</button>
          <button class="btn-danger" onclick="excluir(${b.id}, '${b.banco.replace(/'/g, "\\'")}')">Excluir</button>
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

window.editar = async (id) => {
  const res = await fetch(`/api/taxas/${id}`);
  if (!res.ok) return alert('Banco não encontrado');
  const b = await res.json();
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
};

window.excluir = async (id, nome) => {
  if (!confirm(`Excluir o banco "${nome}"?`)) return;
  const res = await fetch(`/api/taxas/${id}`, { method: 'DELETE' });
  if (!res.ok) return alert('Erro ao excluir');
  carregar();
};

btnCancelar.addEventListener('click', resetForm);

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

  const url = id ? `/api/taxas/${id}` : '/api/taxas';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    return alert(err.erro || 'Erro ao salvar');
  }
  resetForm();
  carregar();
});

carregar();
