import { useEffect, useState } from 'react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import Disclaimer from '../components/Disclaimer';

const CATS = ['Electronics', 'Fashion', 'Home'];

export default function Products() {
  const [f, setF] = useState({ q: '', category: '', badge: '', sort: 'newest' });
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const t = setTimeout(() => { api.products(f).then((r) => { setList(r.products); setError(''); }).catch((e) => setError(e.message)); }, 200);
    return () => clearTimeout(t);
  }, [f]);

  return (
    <>
      <div className="page-head">
        <div><h1>Products</h1><p className="muted">Every listing shows the result of its AI image check.</p></div>
      </div>
      <Disclaimer compact />
      <div className="filters" role="search">
        <input type="search" placeholder="Search products, brands…" aria-label="Search products" value={f.q} onChange={set('q')} />
        <select aria-label="Category" value={f.category} onChange={set('category')}>
          <option value="">All categories</option>{CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Image check result" value={f.badge} onChange={set('badge')}>
          <option value="">Any image check</option>
          <option value="likely_original">Passed</option>
          <option value="needs_review">Review needed</option>
          <option value="potentially_edited">Potentially edited</option>
        </select>
        <select aria-label="Sort" value={f.sort} onChange={set('sort')}>
          <option value="newest">Newest</option><option value="trust">Highest authenticity</option>
          <option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
        </select>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!list && !error && <p className="muted">Loading products…</p>}
      {list && list.length === 0 && <div className="empty"><h2>No products match</h2><p>Try a different search or filter.</p></div>}
      {list && <div className="grid">{list.map((p) => <ProductCard key={p.id} product={p} href={`#/shop/product/${p.id}`} />)}</div>}
    </>
  );
}
