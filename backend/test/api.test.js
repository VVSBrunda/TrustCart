// Run with: npm test   (starts the API on a random port with a throw-away data directory)
const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'trustcart-'));
process.env.PORT = '0';
process.env.ML_URL = process.env.ML_URL || 'http://127.0.0.1:59999'; // unreachable unless overridden
const { start } = require('../server');

let base;
let server;
test.before(async () => {
  server = start();
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const call = async (method, url, { token, body } = {}) => {
  const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
};
const login = async (email, password, role) => (await call('POST', '/api/auth/login', { body: { email, password, role } })).json;

// smallest valid JPEG header + padding: enough to pass the magic-byte check
const fakeJpeg = 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]).toString('base64');
const product = { title: 'Test Gadget 64GB', brand: 'TestCo', category: 'Electronics', price: 1999, description: 'A gadget', attributes: '64GB, black', image: fakeJpeg };

test('requires sign-in', async () => {
  assert.strictEqual((await call('GET', '/api/products')).status, 401);
});

test('dual login: wrong portal is rejected, right portal works', async () => {
  const wrong = await call('POST', '/api/auth/login', { body: { email: 'seller@trustcart.demo', password: 'Seller@123', role: 'customer' } });
  assert.strictEqual(wrong.status, 403);
  const ok = await login('customer@trustcart.demo', 'Customer@123', 'customer');
  assert.ok(ok.token);
  assert.strictEqual(ok.user.role, 'customer');
  assert.strictEqual((await call('POST', '/api/auth/login', { body: { email: 'customer@trustcart.demo', password: 'nope' } })).status, 401);
});

test('registration validates input and prevents duplicates', async () => {
  const body = { name: 'New Seller', email: 'new@shop.test', password: 'longenough1', role: 'seller' };
  assert.strictEqual((await call('POST', '/api/auth/register', { body })).status, 201);
  assert.strictEqual((await call('POST', '/api/auth/register', { body })).status, 409);
  assert.strictEqual((await call('POST', '/api/auth/register', { body: { ...body, email: 'x@y.test', password: 'short' } })).status, 400);
  assert.strictEqual((await call('POST', '/api/auth/register', { body: { ...body, email: 'x@y.test', role: 'admin' } })).status, 400);
});

test('customer can browse, filter and sees badges + seller info', async () => {
  const { token } = await login('customer@trustcart.demo', 'Customer@123');
  const all = (await call('GET', '/api/products', { token })).json.products;
  assert.ok(all.length >= 10);
  assert.ok(all[0].seller.name && all[0].analysis.badge);
  const edited = (await call('GET', '/api/products?badge=potentially_edited', { token })).json.products;
  assert.ok(edited.length >= 1 && edited.every((p) => p.analysis.badge === 'potentially_edited'));
  const q = (await call('GET', '/api/products?q=kettle', { token })).json.products;
  assert.strictEqual(q.length, 1);
});

test('price comparison matches similar products and ranks the target', async () => {
  const { token } = await login('customer@trustcart.demo', 'Customer@123');
  const phone = (await call('GET', '/api/products?q=128GB', { token })).json.products[0];
  const { json } = await call('GET', `/api/products/${phone.id}/compare`, { token });
  assert.ok(json.matches.length >= 3);
  assert.ok(json.matches.every((m) => m.match >= 0.45 && m.source && m.updatedAt));
  assert.ok(!json.matches.some((m) => /X3/.test(m.title)), 'a different model must not be matched');
  assert.ok(json.summary.yourRank >= 1 && json.summary.lowestPrice <= phone.price);
});

test('customers cannot use seller endpoints', async () => {
  const { token } = await login('customer@trustcart.demo', 'Customer@123');
  assert.strictEqual((await call('POST', '/api/products', { token, body: product })).status, 403);
  assert.strictEqual((await call('GET', '/api/seller/products', { token })).status, 403);
});

test('seller upload fails safe when the ML service is down (never claims "original")', async () => {
  const { token } = await login('seller@trustcart.demo', 'Seller@123');
  const bad = await call('POST', '/api/products', { token, body: { ...product, image: 'data:image/jpeg;base64,AAAA' } });
  assert.strictEqual(bad.status, 400);
  const res = await call('POST', '/api/products', { token, body: product });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.json.product.analysis.badge, 'needs_review');
  assert.strictEqual(res.json.product.analysis.status, 'unavailable');
  assert.ok(res.json.product.image.startsWith('/uploads/'));
});

test('appeal flow and ownership rules', async () => {
  const s1 = await login('seller@trustcart.demo', 'Seller@123');
  const s2 = await login('seller2@trustcart.demo', 'Seller@123');
  const mine = (await call('GET', '/api/seller/products', { token: s1.token })).json.products;
  const flagged = mine.find((p) => p.analysis.badge === 'potentially_edited');
  assert.ok(flagged);
  assert.strictEqual((await call('POST', `/api/products/${flagged.id}/appeal`, { token: s2.token, body: { message: 'not mine at all' } })).status, 403);
  assert.strictEqual((await call('POST', `/api/products/${flagged.id}/appeal`, { token: s1.token, body: { message: 'short' } })).status, 400);
  const ok = await call('POST', `/api/products/${flagged.id}/appeal`, { token: s1.token, body: { message: 'This is the original photo straight from my camera.' } });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.json.product.appeal.status, 'pending');
  assert.strictEqual((await call('POST', `/api/products/${flagged.id}/appeal`, { token: s1.token, body: { message: 'second appeal attempt here' } })).status, 409);
  const passed = mine.find((p) => p.analysis.badge === 'likely_original');
  assert.strictEqual((await call('POST', `/api/products/${passed.id}/appeal`, { token: s1.token, body: { message: 'appealing a passed item' } })).status, 400);
});

test('static serving blocks path traversal', async () => {
  const res = await fetch(base + '/uploads/..%2Fdb.json');
  assert.notStrictEqual(res.status, 200);
});
