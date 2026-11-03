import { useEffect, useState } from 'react';
import { api, money } from '../api';

const VERDICTS = {
  best: ['ok', 'Lowest price among similar products'],
  good: ['ok', 'Priced below the average of similar products'],
  fair: ['', 'Priced in line with similar products'],
  high: ['warn', 'Priced above the average of similar products'],
  no_data: ['', 'No similar products found to compare'],
};

export default function PriceCompare({ product }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setData(null); api.compare(product.id).then(setData).catch((e) => setError(e.message)); }, [product.id]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!data) return <p className="muted">Finding similar products…</p>;
  const { summary, matches } = data;
  const [vcls, vtext] = VERDICTS[summary.verdict];
  const lowest = matches.length ? Math.min(...matches.map((m) => m.price)) : null;

  return (
    <div className="compare">
      <div className="stats">
        <div><span>This listing</span><strong>{money(product.price)}</strong></div>
        <div><span>Lowest similar</span><strong>{money(summary.lowestPrice)}</strong></div>
        <div><span>Average</span><strong>{money(summary.averagePrice)}</strong></div>
        <div><span>Price rank</span><strong>{summary.yourRank} of {summary.listingsCompared}</strong></div>
      </div>
      <p className={`verdict ${vcls}`}>{vtext}</p>
      {matches.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption className="sr">Similar products and their prices</caption>
            <thead><tr><th>Product</th><th>Source</th><th>Match</th><th className="num">Price</th><th className="num">vs. this listing</th><th>Price date</th></tr></thead>
            <tbody>
              {matches.map((m, i) => (
                <tr key={i}>
                  <td>{m.kind === 'catalogue' ? <a href={`#/shop/product/${m.productId}`}>{m.title}</a> : m.title}
                    {m.price === lowest && summary.lowestPrice === lowest && <span className="tag good">Best value</span>}</td>
                  <td>{m.source}</td>
                  <td>{Math.round(m.match * 100)}%</td>
                  <td className="num">{money(m.price)}</td>
                  <td className={`num ${m.diff < 0 ? 'neg' : m.diff > 0 ? 'pos' : ''}`}>{m.diff === 0 ? 'same' : `${m.diff > 0 ? '+' : '−'}${money(Math.abs(m.diff))} (${m.diffPct > 0 ? '+' : ''}${m.diffPct}%)`}</td>
                  <td>{new Date(m.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small-text">Matches use title, brand, category and key attributes, so different models are not mixed in. {data.note}</p>
    </div>
  );
}
