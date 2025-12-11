const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'transactions.json');
const SHEETS_DIR = path.join(DATA_DIR, 'sheets');

function ensureDir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}


function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
  }
  if (!fs.existsSync(SHEETS_DIR)) {
    fs.mkdirSync(SHEETS_DIR, { recursive: true });
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


function readSheet(slug) {
  const safe = slug.replace(/[^a-z0-9_-]/g, '');
  if (!safe) return null;
  const file = path.join(SHEETS_DIR, safe + '.html');
  if (!fs.existsSync(file)) return null;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.error('Error reading sheet', slug, e);
    return null;
  }
}

function writeSheet(slug, html) {
  const safe = slug.replace(/[^a-z0-9_-]/g, '');
  if (!safe) return false;
  try {
    const file = path.join(SHEETS_DIR, safe + '.html');
    ensureDir(SHEETS_DIR);
    fs.writeFileSync(file, String(html || ''), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing sheet', slug, e);
    return false;
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



  if (pathname.startsWith('/api/sheets/')) {
    const slug = pathname.split('/').pop();
    if (!slug) {
      return sendJson(res, 400, { ok: false, error: 'Geen sheet opgegeven' });
    }

    if (req.method === 'GET') {
      const html = readSheet(slug);
      return sendJson(res, 200, { ok: true, html: html || null });
    }

    if (req.method === 'PUT') {
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
          const ok = writeSheet(slug, data.html || '');
          if (!ok) {
            return sendJson(res, 500, { ok: false, error: 'Kon sheet niet opslaan' });
          }
          return sendJson(res, 200, { ok: true });
        } catch (e) {
          console.error('Error parsing sheet body:', e);
          return sendJson(res, 400, { ok: false, error: 'Ongeldige JSON voor sheet' });
        }
      });
      return;
    }

    return sendJson(res, 405, { ok: false, error: 'Methode niet toegestaan' });
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
