import { useRef, useState } from 'react';
import { api } from '../api';
import TrustBadge from '../components/TrustBadge';
import ScoreMeter from '../components/ScoreMeter';
import SignalList from '../components/SignalList';
import Disclaimer from '../components/Disclaimer';

const CATS = ['Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Books', 'Other'];
const EMPTY = { title: '', brand: '', category: 'Electronics', price: '', description: '', attributes: '' };

export default function UploadProduct() {
  const [f, setF] = useState(EMPTY);
  const [img, setImg] = useState(null); // { dataUrl, name }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileRef = useRef();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function pick(file) {
    setError('');
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError('Please choose a JPEG, PNG or WebP image.');
    if (file.size > 5 * 1024 * 1024) return setError('Image must be smaller than 5 MB.');
    const reader = new FileReader();
    reader.onload = () => setImg({ dataUrl: reader.result, name: file.name });
    reader.readAsDataURL(file);
  }

  async function submit(e) {
    e.preventDefault();
    if (!img) return setError('Please add a product image.');
    setBusy(true); setError('');
    try { const r = await api.createProduct({ ...f, price: Number(f.price), image: img.dataUrl }); setResult(r.product); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (result) {
    const a = result.analysis;
    return (
      <section className="panel result">
        <h1>Product uploaded</h1>
        <div className="detail small">
          <img src={result.image} alt={result.title} />
          <div>
            <h2>{result.title}</h2>
            <TrustBadge analysis={a} size="lg" showSub />
            <p className="muted">This badge now appears on your listing.</p>
          </div>
        </div>
        <div className="two-col"><ScoreMeter analysis={a} /><div><h3>What the AI looked at</h3><SignalList analysis={a} /></div></div>
        <Disclaimer />
        {a.badge !== 'likely_original' && <p className="notice">Not the result you expected? Open the product and use <strong>Appeal</strong> or <strong>Re-run image check</strong>.</p>}
        <div className="row">
          <a className="btn" href={`#/seller/product/${result.id}`}>View listing</a>
          <button className="btn ghost" onClick={() => { setResult(null); setImg(null); setF(EMPTY); }}>Upload another</button>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="page-head"><div><h1>Upload product</h1><p className="muted">Pipeline: upload → pre-processing → AI analysis → authenticity score → badge.</p></div></div>
      <form className="panel form-grid" onSubmit={submit}>
        <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
          {img ? <img src={img.dataUrl} alt="Preview of the product" /> : <p>Drag &amp; drop the original product photo here</p>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files[0])} aria-label="Product image" />
          <button type="button" className="btn small ghost" onClick={() => fileRef.current.click()}>{img ? 'Change image' : 'Choose image'}</button>
          <small className="muted">JPEG / PNG / WebP, up to 5 MB. Upload the original file - re-saved or screenshot images lose the information the check relies on.</small>
        </div>
        <div className="fields">
          <label>Product title<input value={f.title} onChange={set('title')} maxLength={120} required /></label>
          <div className="row2">
            <label>Brand<input value={f.brand} onChange={set('brand')} maxLength={60} required /></label>
            <label>Category<select value={f.category} onChange={set('category')}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Price (₹)<input type="number" min="1" step="1" value={f.price} onChange={set('price')} required /></label>
          </div>
          <label>Key attributes <small className="muted">(comma separated - used to match similar products)</small>
            <input value={f.attributes} onChange={set('attributes')} placeholder="128GB, 6.5 inch display, black" /></label>
          <label>Description<textarea rows="3" value={f.description} onChange={set('description')} maxLength={1000} /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Analysing image…' : 'Upload & check image'}</button>
          {busy && <p className="muted" role="status">Pre-processing → extracting features → scoring. This usually takes a few seconds.</p>}
        </div>
      </form>
    </>
  );
}
