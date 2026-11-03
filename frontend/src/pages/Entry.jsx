import { useEffect } from 'react';
import { useAuth } from '../auth';
import { go } from '../router';
import { Logo } from '../components/Navbar';

export default function Entry() {
  const { user } = useAuth();
  useEffect(() => { if (user) go(user.role === 'seller' ? '/seller' : '/shop'); }, [user]);

  return (
    <>
      <section className="hero">
        <h1>Shop with <span>evidence</span>, not guesswork.</h1>
        <p className="lead">Trust Cart is a trust-centered marketplace. Every product photo gets an AI authenticity check, shown as a simple badge, next to price context from similar products.</p>
        <div className="portals" role="group" aria-label="Choose how to sign in">
          <a className="portal" href="#/login/customer">
            <span className="portal-icon" aria-hidden="true">🛍️</span>
            <h2>Sign in as Customer</h2>
            <p>Browse products, see image-check badges and compare prices before you buy.</p>
            <span className="btn">Customer portal →</span>
          </a>
          <a className="portal seller" href="#/login/seller">
            <span className="portal-icon" aria-hidden="true">🏪</span>
            <h2>Sign in as Seller</h2>
            <p>Upload products, get an instant AI image check and earn a trust badge.</p>
            <span className="btn dark">Seller portal →</span>
          </a>
        </div>
        <div className="trust-layer" aria-hidden="true"><span>Customer</span><i /><strong><Logo /> trust layer</strong><i /><span>Seller</span></div>
      </section>

      <section className="steps">
        <h2>How Trust Cart builds trust</h2>
        <ol>
          <li><strong>Seller uploads</strong><span>A product with its photo.</span></li>
          <li><strong>AI image check</strong><span>The photo is analysed for signs of editing.</span></li>
          <li><strong>Trust badge</strong><span>The result becomes a clear badge on the listing.</span></li>
          <li><strong>Price compare</strong><span>Customers see how the price stacks up.</span></li>
        </ol>
        <p className="muted">Badges are AI assessments, not proof. <a href="#/about">Learn how it works and where it can be wrong →</a></p>
      </section>
    </>
  );
}
