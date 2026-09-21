import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function SalesDashboard() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [data, setData] = useState(null);

  async function fetchSummary() {
    const res = await fetch('/api/sales-summary');
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const json = await res.json();
    setData(json);
    setAuthed(true);
  }

  useEffect(() => {
    fetchSummary().finally(() => setChecking(false));
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
      fetchSummary();
    } else {
      setLoginError('Wrong password — try again.');
    }
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div className="login-box">
        <Head><title>Sales — Fresas con Crema</title></Head>
        <h1>📊 Sales</h1>
        <form onSubmit={handleLogin}>
          <div className="field">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <button className="btn-primary" type="submit" style={{ width: '100%' }}>Log in</button>
        </form>
        {loginError && <p className="error">{loginError}</p>}
      </div>
    );
  }

  return (
    <div>
      <Head><title>Sales — Fresas con Crema</title></Head>
      <div className="hero">
        <h1>Sales</h1>
        <p>How the shop's been doing</p>
      </div>

      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="section">
          <Link href="/admin" style={{ color: 'var(--maroon)', fontWeight: 700, textDecoration: 'none' }}>
            ← Back to orders
          </Link>
        </div>

        {data && (
          <>
            <div className="section">
              <h2>Today</h2>
              <div className="order-card">
                <div className="row">
                  <span className="pickup">{data.today.orders} order{data.today.orders === 1 ? '' : 's'}</span>
                  <span className="total">${data.today.revenue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="section">
              <h2>Last 7 days</h2>
              <div className="order-card">
                <div className="row">
                  <span className="pickup">{data.week.orders} order{data.week.orders === 1 ? '' : 's'}</span>
                  <span className="total">${data.week.revenue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="section">
              <h2>Last 90 days</h2>
              <div className="order-card">
                <div className="row">
                  <span className="pickup">{data.allTime90d.orders} order{data.allTime90d.orders === 1 ? '' : 's'}</span>
                  <span className="total">${data.allTime90d.revenue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="section">
              <h2>Best-selling flavors <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--ink-soft)' }}>(last 90 days)</span></h2>
              {data.topFlavors.length === 0 && <p className="hint">No orders yet.</p>}
              {data.topFlavors.map((f, i) => (
                <div key={f.name} className="order-card" style={{ marginBottom: 8 }}>
                  <div className="row">
                    <span className="pickup">#{i + 1} {f.name}</span>
                    <span className="total">{f.count}x</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="section">
              <h2>Best-selling toppings <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--ink-soft)' }}>(last 90 days)</span></h2>
              {(!data.topToppings || data.topToppings.length === 0) && <p className="hint">No orders yet.</p>}
              {data.topToppings?.map((tp, i) => (
                <div key={tp.name} className="order-card" style={{ marginBottom: 8 }}>
                  <div className="row">
                    <span className="pickup">#{i + 1} {tp.name}</span>
                    <span className="total">{tp.count}x</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="section">
              <h2>Best-selling syrups <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--ink-soft)' }}>(last 90 days)</span></h2>
              {(!data.topSyrups || data.topSyrups.length === 0) && <p className="hint">No orders yet.</p>}
              {data.topSyrups?.map((s, i) => (
                <div key={s.name} className="order-card" style={{ marginBottom: 8 }}>
                  <div className="row">
                    <span className="pickup">#{i + 1} {s.name}</span>
                    <span className="total">{s.count}x</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="section">
              <h2>Busiest pickup times <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--ink-soft)' }}>(last 90 days)</span></h2>
              {data.topPickupTimes.length === 0 && <p className="hint">No orders yet.</p>}
              {data.topPickupTimes.map((p, i) => (
                <div key={p.time} className="order-card" style={{ marginBottom: 8 }}>
                  <div className="row">
                    <span className="pickup">#{i + 1} {p.time}</span>
                    <span className="total">{p.count}x</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
