import { useState } from 'react';
import { useAuth } from '../auth';
import { go } from '../router';

const DEMO = {
  customer: { email: 'customer@trustcart.demo', password: 'Customer@123' },
  seller: { email: 'seller@trustcart.demo', password: 'Seller@123' },
};

export default function Login({ params }) {
  const role = params.role === 'seller' ? 'seller' : 'customer';
  const { signIn } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const user = await signIn(mode, { ...form, role });
      go(user.role === 'seller' ? '/seller' : '/shop');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <form className="panel auth" onSubmit={submit} noValidate>
        <p className={`role-pill ${role}`}>{role} portal</p>
        <h1>{mode === 'login' ? `Sign in as ${role}` : `Create a ${role} account`}</h1>
        {mode === 'register' && (
          <label>{role === 'seller' ? 'Shop / seller name' : 'Your name'}
            <input value={form.name} onChange={set('name')} autoComplete="name" required />
          </label>
        )}
        <label>Email
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </label>
        <label>Password
          <input type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required />
          {mode === 'register' && <small className="muted">At least 8 characters.</small>}
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn block" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="switch">
          {mode === 'login' ? <>New here? <button type="button" className="link" onClick={() => { setMode('register'); setError(''); }}>Create an account</button></>
            : <>Already registered? <button type="button" className="link" onClick={() => { setMode('login'); setError(''); }}>Sign in</button></>}
        </p>
        <div className="demo">
          <span>Demo account</span>
          <button type="button" className="link" onClick={() => { setMode('login'); setForm({ ...form, ...DEMO[role] }); }}>Fill in {role} demo login</button>
        </div>
        <p className="switch"><a href={`#/login/${role === 'seller' ? 'customer' : 'seller'}`}>Switch to the {role === 'seller' ? 'customer' : 'seller'} portal</a></p>
      </form>
    </div>
  );
}
