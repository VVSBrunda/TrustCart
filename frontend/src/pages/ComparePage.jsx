import { useEffect, useState } from 'react';
import { api, money } from '../api';
import { go } from '../router';
import PriceCompare from '../components/PriceCompare';
import TrustBadge from '../components/TrustBadge';

export default function ComparePage({ params }) {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api.products({ sort: 'newest' }).then((r) => setProducts(r.products)).catch((e) => setError(e.message)); }, []);
  const selected = products.find((p) => p.id === params.id);

  return (
    <>
      <div className="page-head"><div><h1>Price Compare</h1><p className="muted">Pick a product to see how its price compares with similar products - matched on title, brand and key attributes.</p></div></div>
      <label className="select-big">Product
        <select value={params.id || ''} onChange={(e) => go(e.target.value ? `/compare/${e.target.value}` : '/compare')}>
          <option value="">Select a product…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.title} - {money(p.price)}</option>)}
        </select>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      {selected ? (
        <section className="panel">
          <div className="compare-head">
            <img src={selected.image} alt="" />
            <div><h2>{selected.title}</h2><p className="muted">{selected.brand} · {selected.seller.name}</p><TrustBadge analysis={selected.analysis} size="sm" /></div>
            <a className="btn small ghost" href={`#/shop/product/${selected.id}`}>View product</a>
          </div>
          <PriceCompare product={selected} />
        </section>
      ) : <div className="empty"><p>Select a product above to compare prices.</p></div>}
    </>
  );
}
