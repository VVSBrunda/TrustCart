// Trust Cart backend: auth, product catalogue, AI image-check orchestration, price comparison.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { db, save, newId, init, UPLOAD_DIR } = require('./lib/db');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('./lib/auth');
const { Router, HttpError } = require('./lib/router');
const { validateRegister, validateProduct, decodeImage, CATEGORIES } = require('./lib/validate');
const { analyzeImage, ML_URL, THRESHOLDS } = require('./lib/analysis');
const { compare } = require('./lib/compare');
const { seed } = require('./seed');

const PORT = Number(process.env.PORT || 4000);
const DIST = path.join(__dirname, '..', 'frontend', 'dist');
const router = new Router();

// ---------- helpers ----------
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const sellerName = (id) => (db().users.find((u) => u.id === id) || {}).name || 'Unknown seller';

function productView(p) {
  const a = p.analysis;
  return {
    id: p.id, title: p.title, brand: p.brand, category: p.category, price: p.price, description: p.description,
    attributes: p.attributes, image: p.image, createdAt: p.createdAt,
    seller: { id: p.sellerId, name: sellerName(p.sellerId) },
    analysis: { status: a.status, score: a.score, badge: a.badge, confidence: a.confidence, signals: a.signals,
      model: a.model, analyzedAt: a.analyzedAt, note: a.note || null },
    appeal: p.appeal,
  };
}

function findProduct(id) {
  const p = db().products.find((x) => x.id === id);
  if (!p) throw new HttpError(404, 'Product not found');
  return p;
}
function ownProduct(ctx) {
  const p = findProduct(ctx.params.id);
  if (p.sellerId !== ctx.user.id) throw new HttpError(403, 'You can only manage your own products');
  return p;
}

// very small in-memory brute-force guard for login
const failures = new Map();
function checkLoginRate(key) {
  const f = failures.get(key);
  if (f && f.count >= 8 && Date.now() - f.first < 15 * 60_000) throw new HttpError(429, 'Too many failed attempts. Try again later.');
}
function noteFailure(key) {
  const f = failures.get(key);
  if (!f || Date.now() - f.first > 15 * 60_000) failures.set(key, { count: 1, first: Date.now() });
  else f.count++;
}

// ---------- auth ----------
router.add('POST', '/api/auth/register', (ctx) => {
  const v = validateRegister(ctx.body);
  if (db().users.some((u) => u.email === v.email)) throw new HttpError(409, 'An account with this email already exists');
  const user = { id: newId('usr'), name: v.name, email: v.email, role: v.role, passwordHash: hashPassword(v.password), createdAt: new Date().toISOString() };
  db().users.push(user);
  save();
  return { status: 201, body: { token: signToken(user), user: publicUser(user) } };
});

router.add('POST', '/api/auth/login', (ctx) => {
  const email = String(ctx.body.email || '').trim().toLowerCase();
  const key = ctx.ip + '|' + email;
  checkLoginRate(key);
  const user = db().users.find((u) => u.email === email);
  // Same error for unknown email / wrong password / wrong portal.
  if (!user || !verifyPassword(String(ctx.body.password || ''), user.passwordHash)) {
    noteFailure(key);
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (ctx.body.role && ctx.body.role !== user.role) throw new HttpError(403, `This account is a ${user.role} account. Use the ${user.role} sign-in.`);
  failures.delete(key);
  return { token: signToken(user), user: publicUser(user) };
});

router.add('GET', '/api/auth/me', { auth: true }, (ctx) => ({ user: publicUser(ctx.user) }));

// ---------- catalogue ----------
router.add('GET', '/api/meta', { auth: true }, () => ({
  categories: CATEGORIES,
  badgeThresholds: THRESHOLDS,
}));

router.add('GET', '/api/products', { auth: true }, (ctx) => {
  const { q = '', category = '', badge = '', sort = 'newest' } = ctx.query;
  const needle = q.toLowerCase();
  let list = db().products.filter((p) =>
    (!needle || `${p.title} ${p.brand} ${p.category} ${p.attributes.join(' ')}`.toLowerCase().includes(needle)) &&
    (!category || p.category === category) &&
    (!badge || p.analysis.badge === badge));
  const sorters = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    trust: (a, b) => (b.analysis.score ?? -1) - (a.analysis.score ?? -1),
  };
  list = list.sort(sorters[sort] || sorters.newest);
  return { products: list.map(productView) };
});

router.add('GET', '/api/products/:id', { auth: true }, (ctx) => ({ product: productView(findProduct(ctx.params.id)) }));

router.add('GET', '/api/products/:id/compare', { auth: true }, (ctx) => {
  const target = findProduct(ctx.params.id);
  return compare(target, db().products);
});

// ---------- seller portal ----------
router.add('GET', '/api/seller/products', { auth: true, role: 'seller' }, (ctx) => ({
  products: db().products.filter((p) => p.sellerId === ctx.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(productView),
}));

router.add('POST', '/api/products', { auth: true, role: 'seller' }, async (ctx) => {
  const fields = validateProduct(ctx.body);
  const { buffer, ext } = decodeImage(ctx.body.image);
  const analysis = await analyzeImage(buffer);           // upload -> AI analysis -> badge
  const file = crypto.randomBytes(12).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buffer);
  const product = { id: newId('prd'), sellerId: ctx.user.id, ...fields, image: '/uploads/' + file,
    createdAt: new Date().toISOString(), analysis, appeal: null };
  db().products.push(product);
  save();
  return { status: 201, body: { product: productView(product) } };
});

router.add('POST', '/api/products/:id/recheck', { auth: true, role: 'seller' }, async (ctx) => {
  const p = ownProduct(ctx);
  const buf = fs.readFileSync(path.join(UPLOAD_DIR, path.basename(p.image)));
  p.analysis = await analyzeImage(buf);
  save();
  return { product: productView(p) };
});

router.add('POST', '/api/products/:id/appeal', { auth: true, role: 'seller' }, (ctx) => {
  const p = ownProduct(ctx);
  if (p.analysis.badge === 'likely_original') throw new HttpError(400, 'Only products that are not marked "Likely Original" can be appealed');
  if (p.appeal && p.appeal.status === 'pending') throw new HttpError(409, 'An appeal is already pending for this product');
  const message = String(ctx.body.message || '').trim();
  if (message.length < 10 || message.length > 500) throw new HttpError(400, 'Please explain your appeal in 10-500 characters');
  p.appeal = { status: 'pending', message, createdAt: new Date().toISOString() };
  save();
  return { product: productView(p) };
});

router.add('DELETE', '/api/products/:id', { auth: true, role: 'seller' }, (ctx) => {
  const p = ownProduct(ctx);
  const d = db();
  d.products = d.products.filter((x) => x.id !== p.id);
  if (!d.products.some((x) => x.image === p.image)) fs.rmSync(path.join(UPLOAD_DIR, path.basename(p.image)), { force: true });
  save();
  return { status: 204 };
});

// ---------- health ----------
router.add('GET', '/api/health', async () => {
  let ml = { status: 'down' };
  try {
    const r = await fetch(`${ML_URL}/health`, { signal: AbortSignal.timeout(1500) });
    ml = await r.json();
  } catch { /* leave as down */ }
  return { status: 'ok', ml };
});

// ---------- http plumbing ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.map': 'application/json' };

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'",
};

function sendJson(res, status, body) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS });
  res.end(data);
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Request body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function serveFile(res, root, rel, cache) {
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root + path.sep) && file !== root) return false;   // path traversal guard
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': cache, ...SEC_HEADERS });
  fs.createReadStream(file).pipe(res);
  return true;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return sendJson(res, 400, { error: 'Bad request' }); }

  if (pathname.startsWith('/api/')) {
    try {
      const { route, params, pathMatched } = router.match(req.method, pathname);
      if (!route) return sendJson(res, pathMatched ? 405 : 404, { error: pathMatched ? 'Method not allowed' : 'Not found' });
      const ctx = { req, params, query: Object.fromEntries(url.searchParams), ip: req.socket.remoteAddress, body: {}, user: null };
      if (route.opts.auth) {
        const payload = verifyToken((req.headers.authorization || '').replace(/^Bearer /, ''));
        const user = payload && db().users.find((u) => u.id === payload.sub);
        if (!user) throw new HttpError(401, 'Please sign in');
        if (route.opts.role && user.role !== route.opts.role) throw new HttpError(403, `This action is for ${route.opts.role} accounts`);
        ctx.user = user;
      }
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) ctx.body = await readBody(req);
      const out = await route.handler(ctx);
      if (out && typeof out.status === 'number') return sendJson(res, out.status, out.body);   // { status, body }
      return sendJson(res, 200, out);
    } catch (err) {
      if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
      console.error(err);
      return sendJson(res, 500, { error: 'Something went wrong' });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed' });
  if (pathname.startsWith('/uploads/')) {
    if (serveFile(res, UPLOAD_DIR, pathname.slice('/uploads/'.length), 'public, max-age=86400')) return;
    return sendJson(res, 404, { error: 'Not found' });
  }
  // Built frontend (single-page app, hash routing -> always fall back to index.html)
  if (fs.existsSync(path.join(DIST, 'index.html'))) {
    if (pathname !== '/' && serveFile(res, DIST, pathname.slice(1), 'public, max-age=3600')) return;
    serveFile(res, DIST, 'index.html', 'no-cache');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Trust Cart API is running. Build the frontend (cd frontend && npm install && npm run build) or run it with `npm run dev`.');
}

function start() {
  init();
  if (seed()) console.log('First run: demo data loaded (see README for demo logins).');
  const server = http.createServer((req, res) => { handle(req, res).catch((e) => { console.error(e); sendJson(res, 500, { error: 'Something went wrong' }); }); });
  server.listen(PORT, () => console.log(`Trust Cart backend listening on http://localhost:${PORT}  (ML service: ${ML_URL})`));
  return server;
}

if (require.main === module) start();
module.exports = { start, handle };
