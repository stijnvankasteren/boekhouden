const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'transactions.json');

function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
  }
}

function readTransactions() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading transactions:', e);
    return [];
  }
}

function writeTransactions(list) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing transactions:', e);
  }
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function notFound(res) {
  res.statusCode = 404;
  res.end('Not found');
}

function serveStatic(req, res) {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, 'public', pathname);
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    return notFound(res);
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    let contentType = 'text/plain; charset=utf-8';
    if (pathname.endsWith('.html')) contentType = 'text/html; charset=utf-8';
    else if (pathname.endsWith('.css')) contentType = 'text/css; charset=utf-8';
    else if (pathname.endsWith('.js')) contentType = 'application/javascript; charset=utf-8';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function calculateSummary(list) {
  let income = 0;
  let expenses = 0;
  for (const tx of list) {
    if (tx.type === 'expense') expenses += tx.amount;
    else income += tx.amount;
  }
  return {
    totalIncome: income,
    totalExpenses: expenses,
    result: income - expenses,
  };
}

function handleApi(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/transactions' && req.method === 'GET') {
    const list = readTransactions();
    return sendJson(res, 200, {
      transactions: list,
      summary: calculateSummary(list),
    });
  }

  if (pathname === '/api/transactions' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString('utf8');
      if (body.length > 1e6) {
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const list = readTransactions();
        const now = new Date();
        const id = Date.now().toString();

        const tx = {
          id,
          date: data.date || now.toISOString().slice(0, 10),
          description: data.description || '',
          amount: Number(data.amount) || 0,
          type: data.type === 'expense' ? 'expense' : 'income',
          createdAt: now.toISOString(),
        };

        list.push(tx);
        writeTransactions(list);

        return sendJson(res, 201, {
          ok: true,
          transaction: tx,
          summary: calculateSummary(list),
        });
      } catch (e) {
        console.error('Error parsing POST body:', e);
        return sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      }
    });
    return;
  }

  if (pathname.startsWith('/api/transactions/') && req.method === 'DELETE') {
    const id = pathname.split('/').pop();
    const list = readTransactions();
    const newList = list.filter((t) => t.id !== id);
    writeTransactions(newList);
    return sendJson(res, 200, {
      ok: true,
      summary: calculateSummary(newList),
    });
  }

  return notFound(res);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    return handleApi(req, res);
  }
  return serveStatic(req, res);
});

initStorage();

server.listen(PORT, () => {
  console.log(`Boekhouding app running on http://0.0.0.0:${PORT}`);
});
