// Loads demo users + products. Runs automatically on first start; `npm run seed` resets everything.
const fs = require('fs');
const path = require('path');
const { db, save, newId, init, UPLOAD_DIR, DATA_DIR } = require('./lib/db');
const { hashPassword } = require('./lib/auth');
const { toBadge, toConfidence } = require('./lib/analysis');

const DEMO = {
  customer: { name: 'Priya Customer', email: 'customer@trustcart.demo', password: 'Customer@123', role: 'customer' },
  A: { name: 'Aarav Electronics', email: 'seller@trustcart.demo', password: 'Seller@123', role: 'seller' },
  B: { name: 'Meera Lifestyle & Home', email: 'seller2@trustcart.demo', password: 'Seller@123', role: 'seller' },
};

function seed({ reset = false } = {}) {
  if (reset) fs.rmSync(path.join(DATA_DIR, 'db.json'), { force: true });
  init();
  const d = db();
  if (d.users.length) return false;

  const ids = {};
  for (const [key, u] of Object.entries(DEMO)) {
    const user = { id: newId('usr'), name: u.name, email: u.email, role: u.role, passwordHash: hashPassword(u.password), createdAt: new Date().toISOString() };
    d.users.push(user);
    ids[key] = user.id;
  }

  const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', 'products.json'), 'utf8'));
  products.forEach((p, i) => {
    fs.copyFileSync(path.join(__dirname, 'seed', 'images', p.image), path.join(UPLOAD_DIR, p.image));
    const a = p.analysis;
    d.products.push({
      id: newId('prd'), sellerId: ids[p.sellerKey], title: p.title, brand: p.brand, category: p.category,
      price: p.price, description: p.description, attributes: p.attributes, image: '/uploads/' + p.image,
      createdAt: new Date(Date.now() - i * 3600_000 * 5).toISOString(),
      analysis: { status: 'ok', score: a.score, badge: toBadge(a.score), confidence: toConfidence(a.score),
        signals: a.signals, model: a.model, analyzedAt: new Date().toISOString() },
      appeal: null,
    });
  });
  save();
  return true;
}

module.exports = { seed, DEMO };

if (require.main === module) {
  seed({ reset: process.argv.includes('--reset') });
  console.log('Seeded demo data. Demo logins:');
  for (const u of Object.values(DEMO)) console.log(`  ${u.role.padEnd(8)} ${u.email}  /  ${u.password}`);
}
