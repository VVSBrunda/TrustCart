import { money } from '../api';
import TrustBadge from './TrustBadge';

export default function ProductCard({ product, href }) {
  return (
    <a className="card product-card" href={href}>
      <div className="thumb"><img src={product.image} alt={product.title} loading="lazy" /></div>
      <div className="card-body">
        <TrustBadge analysis={product.analysis} size="sm" />
        <h3>{product.title}</h3>
        <p className="muted">{product.brand} · {product.seller.name}</p>
        <p className="price">{money(product.price)}</p>
        {product.appeal?.status === 'pending' && <span className="tag">Appeal pending</span>}
      </div>
    </a>
  );
}
