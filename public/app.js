async function fetchData() {
  const res = await fetch('/api/transactions');
  if (!res.ok) {
    throw new Error('Fout bij laden van data');
  }
  return res.json();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

function updateSummary(summary) {
  const incomeEl = document.getElementById('totalIncome');
  const expensesEl = document.getElementById('totalExpenses');
  const resultEl = document.getElementById('result');

  incomeEl.textContent = formatCurrency(summary.totalIncome || 0);
  expensesEl.textContent = formatCurrency(summary.totalExpenses || 0);
  resultEl.textContent = formatCurrency(summary.result || 0);

  resultEl.classList.remove('positive', 'negative', 'neutral');
  if (summary.result > 0) resultEl.classList.add('positive');
  else if (summary.result < 0) resultEl.classList.add('negative');
  else resultEl.classList.add('neutral');
}

function renderTable(transactions) {
  const tbody = document.getElementById('txTableBody');
  tbody.innerHTML = '';

  if (!transactions.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'Nog geen transacties';
    cell.style.textAlign = 'center';
    cell.style.color = '#6b7280';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  for (const tx of transactions) {
    const row = document.createElement('tr');

    const dateCell = document.createElement('td');
    dateCell.textContent = tx.date;
    row.appendChild(dateCell);

    const descCell = document.createElement('td');
    descCell.textContent = tx.description;
    row.appendChild(descCell);

    const typeCell = document.createElement('td');
    typeCell.textContent = tx.type === 'expense' ? 'Uitgave' : 'Inkomst';
    typeCell.className = tx.type === 'expense' ? 'tx-type-expense' : 'tx-type-income';
    row.appendChild(typeCell);

    const amountCell = document.createElement('td');
    amountCell.textContent = formatCurrency(tx.amount);
    row.appendChild(amountCell);

    const actionCell = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = 'Verwijderen';
    btn.style.background = '#ef4444';
    btn.style.fontSize = '0.75rem';
    btn.style.padding = '0.25rem 0.5rem';
    btn.addEventListener('click', async () => {
      if (!confirm('Transactie verwijderen?')) return;
      await fetch('/api/transactions/' + encodeURIComponent(tx.id), {
        method: 'DELETE'
      });
      await reload();
    });
    actionCell.appendChild(btn);
    row.appendChild(actionCell);

    tbody.appendChild(row);
  }
}

async function reload() {
  try {
    const data = await fetchData();
    renderTable(data.transactions || []);
    updateSummary(data.summary || { totalIncome: 0, totalExpenses: 0, result: 0 });
  } catch (err) {
    console.error(err);
    const msg = document.getElementById('formMessage');
    msg.textContent = 'Fout bij laden van data';
    msg.className = 'message error';
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const date = document.getElementById('date').value;
  const description = document.getElementById('description').value;
  const amount = document.getElementById('amount').value;
  const type = document.getElementById('type').value;

  const msg = document.getElementById('formMessage');
  msg.textContent = '';
  msg.className = 'message';

  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, description, amount, type })
    });

    if (!res.ok) {
      throw new Error('Fout bij opslaan');
    }

    const data = await res.json();
    msg.textContent = 'Transactie opgeslagen';
    msg.className = 'message ok';

    // Reset form
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';

    document.getElementById('date').valueAsDate = new Date();

    renderTable(data.transaction ? (await fetchData()).transactions : []);
    updateSummary(data.summary || { totalIncome: 0, totalExpenses: 0, result: 0 });
  } catch (err) {
    console.error(err);
    msg.textContent = 'Fout bij opslaan van transactie';
    msg.className = 'message error';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const todayInput = document.getElementById('date');
  if (todayInput) {
    todayInput.valueAsDate = new Date();
  }
  document.getElementById('txForm').addEventListener('submit', onSubmit);
  reload();
});
