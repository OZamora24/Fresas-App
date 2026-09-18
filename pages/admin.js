import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { BASES, PRICES, TOPPINGS, SYRUPS, orderTotal, buildPickupTimes, baseIdFromName } from '../lib/menu';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const PICKUP_TIMES = buildPickupTimes();

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [orders, setOrders] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
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

  function openEdit(o) {
    setEditingId(o.id);
    setEditForm({
      base: baseIdFromName(o.base),
      cupSize: (o.cup_size || '12 oz').startsWith('24') ? '24' : '12',
      toppings: o.toppings || [],
      syrups: o.syrups || [],
      qty: o.qty || 1,
      pickup_time: o.pickup_time,
      customer_name: o.customer_name || '',
      customer_phone: o.customer_phone || '',
      notes: o.notes || '',
    });
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function toggleEditTopping(name) {
    setEditForm((f) => ({
      ...f,
      toppings: f.toppings.includes(name) ? f.toppings.filter((x) => x !== name) : [...f.toppings, name],
    }));
  }
  function toggleEditSyrup(name) {
    setEditForm((f) => ({
      ...f,
      syrups: f.syrups.includes(name) ? f.syrups.filter((x) => x !== name) : [...f.syrups, name],
    }));
  }

  async function saveEdit() {
    if (!editForm) return;
    setSavingEdit(true);
    const activeBase = BASES.find((b) => b.id === editForm.base);
    const newTotal = orderTotal(editForm.base, editForm.cupSize, editForm.toppings, editForm.qty);

    const payload = {
      id: editingId,
      base: activeBase.name,
      cup_size: `${editForm.cupSize} oz`,
      toppings: editForm.toppings,
      syrups: editForm.syrups,
      qty: editForm.qty,
      pickup_time: editForm.pickup_time,
      customer_name: editForm.customer_name,
      customer_phone: editForm.customer_phone,
      notes: editForm.notes,
      total: newTotal,
    };

    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setOrders((prev) => prev.map((o) => (o.id === editingId ? { ...o, ...payload } : o)));
    setSavingEdit(false);
    closeEdit();
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
              <div className="meta">{o.qty}x {o.base}{o.cup_size ? ` (${o.cup_size})` : ''}</div>
              <details className="order-details">
                <summary>View toppings &amp; syrup</summary>
                <div className="order-details-body">
                  <div><strong>Toppings:</strong> {o.toppings?.length ? o.toppings.join(', ') : 'None'}</div>
                  <div><strong>Syrup:</strong> {o.syrups?.length ? o.syrups.join(', ') : 'None'}</div>
                </div>
              </details>
              <div className="meta">
                {o.customer_name}{o.notes ? ` — ${o.notes}` : ''}
              </div>
              {o.customer_phone && (
                <div className="meta">
                  📞 <a href={`tel:${o.customer_phone}`} style={{ color: 'var(--maroon)', fontWeight: 700 }}>{o.customer_phone}</a>
                </div>
              )}
              <div className="meta">{new Date(o.created_at).toLocaleString()}</div>
              <div className="meta">
                {o.paid
                  ? `✅ Paid${o.payment_method === 'cash' ? ' (cash)' : ' (Zelle)'}`
                  : o.payment_method === 'cash'
                  ? '💵 Cash — pay at pickup'
                  : o.customer_confirmed_payment
                  ? '💸 Customer said they sent Zelle — not yet confirmed'
                  : '⏳ Payment not confirmed'}
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
                <button className="status-btn" onClick={() => openEdit(o)}>✏️ Edit order</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editForm && (
        <div className="overlay open" onClick={(e) => e.target === e.currentTarget && closeEdit()}>
          <div className="sheet">
            <h3>Edit order</h3>

            <div className="field">
              <label>Base</label>
              <select value={editForm.base} onChange={(e) => setEditForm((f) => ({ ...f, base: e.target.value }))}>
                {BASES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — ${PRICES[editForm.cupSize][b.id].toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Cup size</label>
              <select value={editForm.cupSize} onChange={(e) => setEditForm((f) => ({ ...f, cupSize: e.target.value }))}>
                <option value="12">12 oz</option>
                <option value="24">24 oz</option>
              </select>
            </div>

            <div className="field">
              <label>Toppings</label>
              <div className="chip-grid">
                {TOPPINGS.map((tp) => (
                  <label key={tp.name} className={`chip${editForm.toppings.includes(tp.name) ? ' checked' : ''}`}>
                    <input type="checkbox" style={{ display: 'none' }} checked={editForm.toppings.includes(tp.name)} onChange={() => toggleEditTopping(tp.name)} />
                    <span>{tp.name}</span>
                    {tp.alwaysExtra && <span className="badge">+$1</span>}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Syrup</label>
              <div className="chip-grid">
                {SYRUPS.map((s) => (
                  <label key={s} className={`chip${editForm.syrups.includes(s) ? ' checked' : ''}`}>
                    <input type="checkbox" style={{ display: 'none' }} checked={editForm.syrups.includes(s)} onChange={() => toggleEditSyrup(s)} />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Quantity</label>
              <div className="stepper">
                <button type="button" onClick={() => setEditForm((f) => ({ ...f, qty: Math.max(1, f.qty - 1) }))}>−</button>
                <span>{editForm.qty}</span>
                <button type="button" onClick={() => setEditForm((f) => ({ ...f, qty: Math.min(20, f.qty + 1) }))}>+</button>
              </div>
            </div>

            <div className="field">
              <label>Pickup time</label>
              <select value={editForm.pickup_time} onChange={(e) => setEditForm((f) => ({ ...f, pickup_time: e.target.value }))}>
                {PICKUP_TIMES.map((tm) => <option key={tm} value={tm}>{tm}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Name</label>
              <input type="text" value={editForm.customer_name} onChange={(e) => setEditForm((f) => ({ ...f, customer_name: e.target.value }))} />
            </div>

            <div className="field">
              <label>Phone</label>
              <input type="tel" value={editForm.customer_phone} onChange={(e) => setEditForm((f) => ({ ...f, customer_phone: e.target.value }))} />
            </div>

            <div className="field">
              <label>Notes</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="grand">
              <span>New total</span>
              <span>${orderTotal(editForm.base, editForm.cupSize, editForm.toppings, editForm.qty).toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <button className="btn-primary" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
              <button className="status-btn" onClick={closeEdit}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
