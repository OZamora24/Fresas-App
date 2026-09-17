import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [orders, setOrders] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const pollRef = useRef(null);

  async function fetchOrders() {
    const res = await fetch('/api/orders');
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setOrders(data.orders || []);
    setAuthed(true);
  }

  useEffect(() => {
    fetchOrders().finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    pollRef.current = setInterval(fetchOrders, 5000);
    return () => clearInterval(pollRef.current);
  }, [authed]);

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
      fetchOrders();
    } else {
      setLoginError('Wrong password — try again.');
    }
  }

  async function markStatus(id, status) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
  }

  async function markPaid(id, paid) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paid } : o)));
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, paid }),
    });
  }

  async function enablePush() {
    if (!window.OneSignal) return;
    await window.OneSignal.Notifications.requestPermission();
    await window.OneSignal.User.addTag('role', 'admin');
    setPushEnabled(true);
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div className="login-box">
        <Head><title>Admin — Fresas con Crema</title></Head>
        <h1>🍓 Admin</h1>
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
      <Head><title>Admin — Fresas con Crema</title></Head>
      {ONESIGNAL_APP_ID && (
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
          onLoad={() => {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async (OneSignal) => {
              await OneSignal.init({ appId: ONESIGNAL_APP_ID });
              window.OneSignal = OneSignal;
            });
          }}
        />
      )}

      <div className="hero">
        <h1>Admin</h1>
        <p>Live orders · refreshes every few seconds</p>
      </div>

      <div className="wrap">
        {!pushEnabled && (
          <div className="section">
            <button className="btn-primary" onClick={enablePush}>
              🔔 Enable push notifications on this device
            </button>
          </div>
        )}

        <div className="section">
          <h2>Orders ({orders.filter((o) => o.status !== 'done').length} open)</h2>
          {orders.length === 0 && <p className="hint">No orders yet.</p>}
          {orders.map((o) => (
            <div key={o.id} className={`order-card${o.status === 'done' ? ' done' : ''}`}>
              <div className="row">
                <span className="pickup">Pickup {o.pickup_time}</span>
                <span className="total">${Number(o.total).toFixed(2)}</span>
              </div>
              <div className="meta">
                {o.qty}x {o.base}
                {o.toppings?.length ? ` · Toppings: ${o.toppings.join(', ')}` : ''}
                {o.syrups?.length ? ` · Syrup: ${o.syrups.join(', ')}` : ''}
              </div>
              <div className="meta">
                {o.customer_name}{o.notes ? ` — ${o.notes}` : ''}
              </div>
              <div className="meta">{new Date(o.created_at).toLocaleString()}</div>
              <div className="meta">
                {o.paid ? '✅ Paid' : o.customer_confirmed_payment ? '💸 Customer said they sent it — not yet confirmed' : '⏳ Payment not confirmed'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {o.status !== 'done' ? (
                  <button className="status-btn" onClick={() => markStatus(o.id, 'done')}>Mark ready / done</button>
                ) : (
                  <button className="status-btn" onClick={() => markStatus(o.id, 'new')}>Reopen</button>
                )}
                {!o.paid ? (
                  <button className="status-btn" onClick={() => markPaid(o.id, true)}>Mark as paid</button>
                ) : (
                  <button className="status-btn" onClick={() => markPaid(o.id, false)}>Undo paid</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
