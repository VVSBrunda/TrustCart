import { useEffect, useState } from 'react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

export default function SellerDashboard() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.sellerProducts().then((r) => setList(r.products)).catch((e) => setError(e.message)); }, []);

  const count = (b) => list.filter((p) => p.analysis.badge === b).length;
  return (
    <>
      <div className="page-head">
        <div><h1>My products</h1><p className="muted">Upload a product and Trust Cart checks its image automatically.</p></div>
        <a className="btn" href="#/seller/upload">+ Upload product</a>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!list && !error && <p className="muted">Loading…</p>}
      {list && (
        <>
          <div className="stats">
            <div><span>Products</span><strong>{list.length}</strong></div>
            <div className="ok"><span>Passed</span><strong>{count('likely_original')}</strong></div>
            <div className="warn"><span>Review needed</span><strong>{count('needs_review')}</strong></div>
            <div className="bad"><span>Potentially edited</span><strong>{count('potentially_edited')}</strong></div>
            <div><span>Appeals pending</span><strong>{list.filter((p) => p.appeal?.status === 'pending').length}</strong></div>
          </div>
          {list.length === 0
            ? <div className="empty"><h2>No products yet</h2><p><a href="#/seller/upload">Upload your first product</a> to get an image-authenticity badge.</p></div>
            : <div className="grid">{list.map((p) => <ProductCard key={p.id} product={p} href={`#/seller/product/${p.id}`} />)}</div>}
        </>
      )}
    </>
  );
}
