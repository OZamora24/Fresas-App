import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminReviews() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const res = await fetch('/api/reviews?all=1');
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const json = await res.json();
    setReviews(json.reviews || []);
    setAuthed(true);
  }

  useEffect(() => {
    load().finally(() => setChecking(false));
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setPassword('');
      load();
    } else {
      setLoginError('Wrong password — try again.');
    }
  }

  async function act(method, id, approved) {
    setBusyId(id);
    await fetch('/api/reviews', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approved }),
    });
    await load();
    setBusyId(null);
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div className="login-box">
        <Head><title>Reviews — Fresas con Crema</title></Head>
        <h1>⭐ Reviews</h1>
        <form onSubmit={handleLogin}>
          <div className="field">
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          <button className="btn-primary" type="submit" style={{ width: '100%' }}>Log in</button>
        </form>
        {loginError && <p className="error">{loginError}</p>}
      </div>
    );
  }

  const pending = reviews.filter((r) => !r.approved);
  const shown = reviews.filter((r) => r.approved);

  const card = (r) => (
    <div key={r.id} className="order-card">
      <div className="row">
        <span className="pickup">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
        <span className="meta" style={{ margin: 0 }}>{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
      <p style={{ margin: '8px 0 4px' }}>{r.comment}</p>
      <div className="meta" style={{ marginTop: 0 }}>— {r.name || 'A customer'}</div>
      <div className="promo-actions">
        {r.approved ? (
          <button className="pill-btn" disabled={busyId === r.id} onClick={() => act('PATCH', r.id, false)}>Hide</button>
        ) : (
          <button className="pill-btn primary" disabled={busyId === r.id} onClick={() => act('PATCH', r.id, true)}>Approve</button>
        )}
        <button className="pill-btn" disabled={busyId === r.id} onClick={() => { if (window.confirm('Delete this review for good?')) act('DELETE', r.id); }}>Delete</button>
      </div>
    </div>
  );

  return (
    <div>
      <Head><title>Reviews — Fresas con Crema</title></Head>
      <div className="hero">
        <h1>Reviews</h1>
        <p>Approve what shows on the site</p>
      </div>
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="section">
          <Link href="/admin" style={{ color: 'var(--maroon)', fontWeight: 700, textDecoration: 'none' }}>← Back to orders</Link>
        </div>
        <div className="section">
          <h2>Waiting for approval ({pending.length})</h2>
          {pending.length === 0 && <p className="hint">Nothing waiting.</p>}
          {pending.map(card)}
        </div>
        <div className="section">
          <h2>Showing on the site ({shown.length})</h2>
          {shown.length === 0 && <p className="hint">No approved reviews yet.</p>}
          {shown.map(card)}
        </div>
      </div>
    </div>
  );
}
