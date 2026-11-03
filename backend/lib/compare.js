// Price comparison: finds *similar* products (title, brand, category, attributes) in the internal
// catalogue and in a market-price feed, then reports best-value context.
// The feed here is a mock dataset (seed/market_prices.json); a production system would use
// authorised APIs / partner feeds and show source + timestamp (which this module already returns).
const fs = require('fs');
const path = require('path');

const STOP = new Set(['the', 'and', 'for', 'with', 'of', 'a', 'an', 'in', 'to']);
const tokens = (s) =>
  new Set(String(s || '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ').split(' ').filter((t) => t && !STOP.has(t)));

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// Tokens that contain digits (x5, 128gb, 1.8l ...) identify a model / spec. If two products both
// have them and they disagree, the products are probably *not* the same thing.
const specTokens = (title) => new Set([...tokens(title)].filter((t) => /\d/.test(t)));

function similarity(a, b) {
  const title = jaccard(tokens(a.title), tokens(b.title));
  const brand = a.brand && b.brand && a.brand.toLowerCase() === b.brand.toLowerCase() ? 1 : 0;
  const category = a.category === b.category ? 1 : 0;
  const attrs = jaccard(tokens((a.attributes || []).join(' ')), tokens((b.attributes || []).join(' ')));
  let score = 0.45 * title + 0.2 * brand + 0.1 * category + 0.25 * attrs;
  const sa = specTokens(a.title), sb = specTokens(b.title);
  if (sa.size && sb.size) score *= 1 - 0.35 * (1 - jaccard(sa, sb));
  return score;
}

let market = null;
function marketFeed() {
  if (!market) {
    const f = path.join(__dirname, '..', 'seed', 'market_prices.json');
    market = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
  }
  return market;
}

const MIN_MATCH = 0.45;

function compare(target, catalogue) {
  const candidates = [];
  for (const p of catalogue) {
    if (p.id === target.id) continue;
    candidates.push({ source: 'Trust Cart', kind: 'catalogue', productId: p.id, title: p.title, brand: p.brand,
      price: p.price, updatedAt: p.createdAt, match: similarity(target, p) });
  }
  for (const m of marketFeed()) {
    candidates.push({ source: m.store, kind: 'market', title: m.title, brand: m.brand, price: m.price,
      updatedAt: m.updatedAt, match: similarity(target, m) });
  }
  const matches = candidates
    .filter((c) => c.match >= MIN_MATCH)
    .map((c) => ({ ...c, match: Math.round(c.match * 100) / 100, diff: c.price - target.price,
      diffPct: Math.round(((c.price - target.price) / target.price) * 1000) / 10 }))
    .sort((a, b) => a.price - b.price);

  const all = [{ price: target.price }, ...matches];
  const best = Math.min(...all.map((x) => x.price));
  const avg = Math.round(all.reduce((s, x) => s + x.price, 0) / all.length);
  const rank = [...all].sort((a, b) => a.price - b.price).findIndex((x) => x.price === target.price) + 1;
  let verdict = 'fair';
  if (matches.length === 0) verdict = 'no_data';
  else if (target.price <= best) verdict = 'best';
  else if (target.price <= avg * 0.97) verdict = 'good';
  else if (target.price > avg * 1.08) verdict = 'high';

  return {
    matches,
    summary: { listingsCompared: all.length, lowestPrice: best, averagePrice: avg, yourRank: rank, verdict },
    note: 'Prices come from a mock comparison dataset for this prototype. A production system would show the live source and time of each price.',
  };
}

module.exports = { compare, similarity };
