import { useEffect, useState } from 'react';
import { api, money } from '../api';
import { useAuth } from '../auth';
import { go } from '../router';
import TrustBadge from '../components/TrustBadge';
import ScoreMeter from '../components/ScoreMeter';
import SignalList from '../components/SignalList';
import Disclaimer from '../components/Disclaimer';
import PriceCompare from '../components/PriceCompare';

export default function ProductDetail({ params }) {
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [appeal, setAppeal] = useState('');
  const [busy, setBusy] = useState(false);
  const isOwner = user.role === 'seller' && p && p.seller.id === user.id;
  const back = user.role === 'seller' ? '/seller' : '/shop';

  useEffect(() => { api.product(params.id).then((r) => setP(r.product)).catch((e) => setError(e.message)); }, [params.id]);

  const act = async (fn, okMsg) => {
    setBusy(true); setMsg(''); setError('');
    try { const r = await fn(); if (r?.product) setP(r.product); setMsg(okMsg); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (error && !p) return <div className="empty"><h2>{error}</h2><a href={'#' + back}>Back</a></div>;
  if (!p) return <p className="muted">Loading…</p>;
  const a = p.analysis;

  return (
    <>
      <p><a href={'#' + back}>← Back to {user.role === 'seller' ? 'my products' : 'products'}</a></p>
      <div className="detail">
        <div className="detail-img"><img src={p.image} alt={p.title} /></div>
        <div>
          <p className="muted">{p.category} · {p.brand}</p>
          <h1>{p.title}</h1>
          <p className="price big">{money(p.price)}</p>
          <p className="muted">Sold by <strong>{p.seller.name}</strong></p>
          <div className="spaced"><TrustBadge analysis={a} size="lg" showSub /></div>
          {p.appeal?.status === 'pending' && <p className="notice">An appeal for this image check is pending review.</p>}
          <p>{p.description}</p>
          {p.attributes.length > 0 && <ul className="chips">{p.attributes.map((x) => <li key={x}>{x}</li>)}</ul>}
        </div>
      </div>

      <section className="panel">
        <h2>Image authenticity check</h2>
        <div className="two-col">
          <div><ScoreMeter analysis={a} /></div>
          <div><h3>Why this badge?</h3><SignalList analysis={a} /></div>
        </div>
        <Disclaimer />
        {isOwner && (
          <div className="owner-tools">
            <h3>Seller tools</h3>
            <div className="row">
              <button className="btn small ghost" disabled={busy} onClick={() => act(() => api.recheck(p.id), 'Image check re-run.')}>Re-run image check</button>
              <button className="btn small danger" disabled={busy} onClick={() => { if (confirm('Delete this product?')) api.remove(p.id).then(() => go('/seller')).catch((e) => setError(e.message)); }}>Delete product</button>
            </div>
            {a.badge !== 'likely_original' && !p.appeal && (
              <form onSubmit={(e) => { e.preventDefault(); act(() => api.appeal(p.id, appeal), 'Appeal submitted.'); }}>
                <label>Think this result is wrong? Appeal it.
                  <textarea rows="3" value={appeal} onChange={(e) => setAppeal(e.target.value)} placeholder="e.g. This is the unedited photo straight from my camera; the metadata can be provided on request." minLength={10} maxLength={500} required />
                </label>
                <button className="btn small" disabled={busy}>Submit appeal</button>
              </form>
            )}
            {p.appeal && <p className="muted small-text">Appeal ({p.appeal.status}): “{p.appeal.message}”</p>}
          </div>
        )}
        {msg && <p className="success" role="status">{msg}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="panel">
        <h2>{isOwner ? 'How your price compares' : 'Price comparison'}</h2>
        <PriceCompare product={p} />
      </section>
    </>
  );
}
