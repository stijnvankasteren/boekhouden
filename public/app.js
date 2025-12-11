let currentView = 'dashboard';
let lastData = {
  transactions: [],
  summary: { totalIncome: 0, totalExpenses: 0, result: 0 },
};

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
    currency: 'EUR',
  }).format(amount || 0);
}

function updateSummary(summary) {
  const incomeEl = document.getElementById('totalIncome');
  const expensesEl = document.getElementById('totalExpenses');
  const resultEl = document.getElementById('result');

  incomeEl.textContent = formatCurrency(summary.totalIncome);
  expensesEl.textContent = formatCurrency(summary.totalExpenses);
  resultEl.textContent = formatCurrency(summary.result);

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
    cell.textContent = 'Nog geen data voor dit tabblad';
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
    typeCell.className =
      tx.type === 'expense' ? 'tx-type-expense' : 'tx-type-income';
    row.appendChild(typeCell);

    const amountCell = document.createElement('td');
    amountCell.textContent = formatCurrency(tx.amount);
    amountCell.style.textAlign = 'right';
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
        method: 'DELETE',
      });
      await reload();
    });
    actionCell.appendChild(btn);
    row.appendChild(actionCell);

    tbody.appendChild(row);
  }
}

function setSheetContent(view) {
  const container = document.getElementById('sheetContent');
  if (!container) return;
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-' + view);
  if (tpl && tpl.content) {
    container.appendChild(tpl.content.cloneNode(true));
  }
}

function applyView() {
  const titleEls = document.querySelectorAll('.panel-header h2');
  const captionEls = document.querySelectorAll('.panel-caption');

  const rightTitle = titleEls[1] || titleEls[0];
  const rightCaption = captionEls[1] || captionEls[0];

  let txs = lastData.transactions;

  switch (currentView) {
    case 'dashboard':
      rightTitle.textContent = 'Transacties 2025';
      rightCaption.textContent = 'Overzicht van alle mutaties (Dashboard).';
      break;
    case 'factuur':
      rightTitle.textContent = 'Factuur';
      rightCaption.textContent =
        'Factuurfunctionaliteit is nog niet geïmplementeerd in deze simpele versie.';
      txs = [];
      break;
    case 'income':
      rightTitle.textContent = 'Verkopen & Inkomsten';
      rightCaption.textContent = 'Alle inkomsten-transacties in 2025.';
      txs = txs.filter((t) => t.type !== 'expense');
      break;
    case 'expense':
      rightTitle.textContent = 'Inkopen & Uitgaven';
      rightCaption.textContent = 'Alle uitgaven-transacties in 2025.';
      txs = txs.filter((t) => t.type === 'expense');
      break;
    case 'categories':
      rightTitle.textContent = 'Categorieën';
      rightCaption.textContent =
        'Categoriebeheer is nog niet geïmplementeerd in deze simpele versie.';
      txs = [];
      break;
    case 'accounts':
      rightTitle.textContent = 'Rekeningen';
      rightCaption.textContent =
        'Rekeningenoverzicht is nog niet geïmplementeerd in deze simpele versie.';
      txs = [];
      break;
    case 'beginbalans':
      rightTitle.textContent = 'Beginbalans';
      rightCaption.textContent =
        'Beginbalans is nog niet geïmplementeerd in deze simpele versie.';
      txs = [];
      break;
    case 'relations':
      rightTitle.textContent = 'Relaties';
      rightCaption.textContent =
        'Relatiebeheer is nog niet geïmplementeerd in deze simpele versie.';
      txs = [];
      break;
    case 'wvbalans':
      rightTitle.textContent = 'Winst & Verlies / Balans';
      rightCaption.textContent =
        'Samenvattende rapportages volgen nog in een toekomstige versie.';
      txs = [];
      break;
    case 'btw':
      rightTitle.textContent = 'Btw-aangifte';
      rightCaption.textContent =
        'Btw-overzichten volgen nog in een toekomstige versie.';
      txs = [];
      break;
    case 'settings':
      rightTitle.textContent = 'Instellingen';
      rightCaption.textContent =
        'Instellingen zijn nog niet geïmplementeerd in deze simpele versie.';
      txs = [];
      break;
    case 'disclaimer':
      rightTitle.textContent = 'Disclaimer';
      rightCaption.textContent =
        'Dit is een hulpmiddel en geen officiële boekhoudsoftware.';
      txs = [];
      break;
    default:
      rightTitle.textContent = 'Transacties 2025';
      rightCaption.textContent = 'Overzicht van alle mutaties.';
      break;
  }

  renderTable(txs);
  setSheetContent(currentView);
}

function setActiveNav(view) {
  currentView = view;
  document.querySelectorAll('.top-nav .nav-link').forEach((btn) => {
    if (btn.dataset.view === view) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  applyView();
}

async function reload() {
  try {
    const data = await fetchData();
    lastData = {
      transactions: data.transactions || [],
      summary:
        data.summary || { totalIncome: 0, totalExpenses: 0, result: 0 },
    };
    applyView();
    updateSummary(lastData.summary);
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
      body: JSON.stringify({ date, description, amount, type }),
    });

    if (!res.ok) {
      throw new Error('Fout bij opslaan');
    }

    await reload();

    msg.textContent = 'Transactie opgeslagen';
    msg.className = 'message ok';

    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('date').valueAsDate = new Date();
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

  document.querySelectorAll('.top-nav .nav-link').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const view = btn.dataset.view || 'dashboard';
      setActiveNav(view);
    });
  });

  reload();
});
