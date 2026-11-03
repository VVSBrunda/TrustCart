import { useEffect } from 'react';
import { useAuth } from './auth';
import { useRoute, match, go } from './router';
import Navbar from './components/Navbar';
import Entry from './pages/Entry';
import Login from './pages/Login';
import About from './pages/About';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import ComparePage from './pages/ComparePage';
import SellerDashboard from './pages/SellerDashboard';
import UploadProduct from './pages/UploadProduct';

// Route table. `role` = which portal may open it (undefined = public).
const ROUTES = [
  { pattern: '/', page: Entry },
  { pattern: '/about', page: About },
  { pattern: '/login/:role', page: Login },
  { pattern: '/shop', page: Products, role: 'customer' },
  { pattern: '/shop/product/:id', page: ProductDetail, role: 'customer' },
  { pattern: '/compare', page: ComparePage, role: 'customer' },
  { pattern: '/compare/:id', page: ComparePage, role: 'customer' },
  { pattern: '/seller', page: SellerDashboard, role: 'seller' },
  { pattern: '/seller/upload', page: UploadProduct, role: 'seller' },
  { pattern: '/seller/product/:id', page: ProductDetail, role: 'seller' },
];

export default function App() {
  const path = useRoute();
  const { user, ready } = useAuth();

  let found = null;
  for (const r of ROUTES) { const params = match(r.pattern, path); if (params) { found = { ...r, params }; break; } }

  // Route guards: send people to the right portal.
  useEffect(() => {
    if (!ready || !found) return;
    if (found.role && !user) go(`/login/${found.role}`);
    else if (found.role && user && user.role !== found.role) go(user.role === 'seller' ? '/seller' : '/shop');
  }, [ready, found?.pattern, user]);

  if (!ready) return <div className="center-note">Loading…</div>;
  const allowed = found && (!found.role || (user && user.role === found.role));
  const Page = found ? found.page : null;

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Navbar path={path} />
      <main id="main" tabIndex={-1} className="container">
        {!found && <div className="empty"><h2>Page not found</h2><p><a href="#/">Back to Trust Cart</a></p></div>}
        {allowed && <Page key={path} params={found.params} />}
      </main>
      <footer className="footer">
        <div className="container">
          <strong>Trust Cart</strong> · E-commerce + AI Verification + Price Transparency
          <p>AI image checks are indicators, not absolute proof. Prices in this prototype come from a mock comparison dataset.</p>
        </div>
      </footer>
    </>
  );
}
