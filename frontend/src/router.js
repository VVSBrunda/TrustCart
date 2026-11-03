import { useEffect, useState } from 'react';

// Hash routing (#/path) keeps the app deployable on any static host / the bundled Node server.
const read = () => window.location.hash.replace(/^#/, '') || '/';

export function useRoute() {
  const [path, setPath] = useState(read());
  useEffect(() => {
    const on = () => { setPath(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export const go = (path) => { window.location.hash = path; };

// match('/shop/product/:id', '/shop/product/prd_1') -> { id: 'prd_1' } | null
export function match(pattern, path) {
  const a = pattern.split('/'); const b = path.split('?')[0].split('/');
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
