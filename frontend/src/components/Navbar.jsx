import { useAuth } from '../auth';
import { go } from '../router';

export const Logo = () => (
  <span className="logo">
    <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0f766e" /><path d="M18 33l9 9 19-20" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    Trust&nbsp;Cart
  </span>
);

export default function Navbar({ path }) {
  const { user, signOut } = useAuth();
  const link = (href, label) => (
    <a href={'#' + href} className={path === href || (href !== '/' && path.startsWith(href + '/')) ? 'active' : ''}>{label}</a>
  );
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a href={user ? (user.role === 'seller' ? '#/seller' : '#/shop') : '#/'} aria-label="Trust Cart home"><Logo /></a>
        <nav aria-label="Main">
          {user?.role === 'customer' && <>{link('/shop', 'Products')}{link('/compare', 'Price Compare')}</>}
          {user?.role === 'seller' && <>{link('/seller', 'My products')}{link('/seller/upload', 'Upload product')}</>}
          {link('/about', 'About')}
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              <span className="who"><span className={`role-pill ${user.role}`}>{user.role}</span> {user.name}</span>
              <button className="btn small ghost" onClick={() => { signOut(); go('/'); }}>Sign out</button>
            </>
          ) : (
            <a className="btn small" href="#/">Sign in</a>
          )}
        </div>
      </div>
    </header>
  );
}
