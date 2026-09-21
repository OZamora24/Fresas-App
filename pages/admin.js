import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import Link from 'next/link';
import { BASES, PRICES, TOPPINGS, SYRUPS, orderTotal, buildPickupTimes, baseIdFromName, formatDateKey, todayDateKey, maxPreorderDateKey } from '../lib/menu';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

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
  const [exportRange, setExportRange] = useState('all');
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const pollRef = useRef(null);

  async function fetchSettings() {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const json = await res.json();
      setSettings(json.settings);
    }
  }

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
    fetchSettings();
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

  async function saveSettings(updates) {
    setSavingSettings(true);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const json = await res.json();
      setSettings(json.settings);
    }
    setSavingSettings(false);
  }

  function openEdit(o) {
    setEditingId(o.id);
    setEditForm({
      base: baseIdFromName(o.base),
      cupSize: (o.cup_size || '12 oz').startsWith('24') ? '24' : '12',
      toppings: o.toppings || [],
      syrups: o.syrups || [],
      qty: o.qty || 1,
      pickup_date: o.pickup_date || todayDateKey(),
      pickup_time: o.pickup_time,
      customer_name: o.customer_name || '',
      customer_phone: o.customer_phone || '',
      notes: o.notes || '',
      includeRim: o.include_rim !== false,
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
      pickup_date: editForm.pickup_date,
      pickup_time: editForm.pickup_time,
      customer_name: editForm.customer_name,
      customer_phone: editForm.customer_phone,
      notes: editForm.notes,
      total: newTotal,
      include_rim: editForm.includeRim,
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

  async function exportOrders() {
    setExporting(true);
    try {
      const params = new URLSearchParams();

      if (exportRange === '7days') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        params.set('start', start.toISOString());
      } else if (exportRange === '30days') {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        params.set('start', start.toISOString());
      } else if (exportRange === 'custom') {
        if (exportStart) params.set('start', new Date(exportStart).toISOString());
        if (exportEnd) {
          const endDate = new Date(exportEnd);
          endDate.setHours(23, 59, 59, 999);
          params.set('end', endDate.toISOString());
        }
      }

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `fresas-orders-${dateStamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Could not export orders — please try again.');
    } finally {
      setExporting(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    const ok = window.confirm(
      `Delete ${selectedIds.length} order${selectedIds.length > 1 ? 's' : ''}? This cannot be undone.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setOrders((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
      setSelectedIds([]);
    } catch (e) {
      alert('Could not delete the selected order(s) — please try again.');
    } finally {
      setDeleting(false);
    }
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
        {settings && (
          <div className="section">
            <h2>Shop status</h2>
            <div className="order-card">
              <div className="row" style={{ marginBottom: settings.is_open ? 0 : 10 }}>
                <span className="pickup">{settings.is_open ? '🟢 Open for orders' : '🔴 Closed'}</span>
                <button
                  className="status-btn"
                  onClick={() => saveSettings({ is_open: !settings.is_open, ...(settings.is_open ? {} : { reopens_at: null }) })}
                  disabled={savingSettings}
                >
                  {settings.is_open ? 'Close shop' : 'Reopen shop'}
                </button>
              </div>
              {!settings.is_open && (
                <>
                  <div className="field" style={{ marginTop: 10, marginBottom: 10 }}>
                    <label>Message customers see</label>
                    <input
                      type="text"
                      defaultValue={settings.closed_message}
                      placeholder="We're closed right now — check back soon!"
                      onBlur={(e) => saveSettings({ closed_message: e.target.value })}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>We'll be back (optional — shown to customers)</label>
                    <input
                      type="datetime-local"
                      defaultValue={settings.reopens_at ? new Date(settings.reopens_at).toISOString().slice(0, 16) : ''}
                      onChange={(e) => {
                        const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                        saveSettings({ reopens_at: val });
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="order-card" style={{ marginTop: 10 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
                Max orders per 15-min pickup slot
              </label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  max="50"
                  defaultValue={settings.slot_limit}
                  style={{ width: 90, padding: '10px 12px', borderRadius: 10, border: '2px solid var(--line)', background: 'var(--card-bg)', color: 'var(--ink)' }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (val > 0) saveSettings({ slot_limit: val });
                  }}
                />
                <span className="hint" style={{ margin: 0 }}>orders max per time slot</span>
              </div>
            </div>

            <div className="order-card" style={{ marginTop: 10 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 10 }}>
                Store hours (pickup window)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Mon–Fri start</label>
                  <input
                    type="time"
                    defaultValue={settings.hours_weekday_start}
                    onBlur={(e) => saveSettings({ hours_weekday_start: e.target.value })}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Mon–Fri end</label>
                  <input
                    type="time"
                    defaultValue={settings.hours_weekday_end}
                    onBlur={(e) => saveSettings({ hours_weekday_end: e.target.value })}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Sat–Sun start</label>
                  <input
                    type="time"
                    defaultValue={settings.hours_weekend_start}
                    onBlur={(e) => saveSettings({ hours_weekend_start: e.target.value })}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Sat–Sun end</label>
                  <input
                    type="time"
                    defaultValue={settings.hours_weekend_end}
                    onBlur={(e) => saveSettings({ hours_weekend_end: e.target.value })}
                  />
                </div>
              </div>
              <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>Pickup times customers can pick from are generated from these — weekday and weekend hours can differ.</p>
            </div>

            <div className="order-card" style={{ marginTop: 10 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 10 }}>
                Flavor availability
              </label>
              <div className="chip-grid">
                {BASES.map((b) => {
                  const isSoldOut = (settings.sold_out_flavors || []).includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`chip${isSoldOut ? ' checked' : ''}`}
                      style={isSoldOut ? { borderColor: 'var(--maroon)', background: 'var(--pink-pale)' } : {}}
                      onClick={() => {
                        const current = settings.sold_out_flavors || [];
                        const next = isSoldOut ? current.filter((x) => x !== b.id) : [...current, b.id];
                        saveSettings({ sold_out_flavors: next });
                      }}
                      disabled={savingSettings}
                    >
                      {isSoldOut ? '🚫 ' : '✅ '}{b.name}
                    </button>
                  );
                })}
              </div>
              <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>Tap a flavor to mark it sold out — customers won't be able to select it.</p>
            </div>

            <div className="order-card" style={{ marginTop: 10 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 10 }}>
                Topping availability
              </label>
              <div className="chip-grid">
                {TOPPINGS.map((tp) => {
                  const isSoldOut = (settings.sold_out_toppings || []).includes(tp.name);
                  return (
                    <button
                      key={tp.name}
                      type="button"
                      className={`chip${isSoldOut ? ' checked' : ''}`}
                      style={isSoldOut ? { borderColor: 'var(--maroon)', background: 'var(--pink-pale)' } : {}}
                      onClick={() => {
                        const current = settings.sold_out_toppings || [];
                        const next = isSoldOut ? current.filter((x) => x !== tp.name) : [...current, tp.name];
                        saveSettings({ sold_out_toppings: next });
                      }}
                      disabled={savingSettings}
                    >
                      {isSoldOut ? '🚫 ' : '✅ '}{tp.name}
                    </button>
                  );
                })}
              </div>
              <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>Tap a topping to mark it sold out.</p>
            </div>

            <div className="order-card" style={{ marginTop: 10 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 10 }}>
                Syrup availability
              </label>
              <div className="chip-grid">
                {SYRUPS.map((s) => {
                  const isSoldOut = (settings.sold_out_syrups || []).includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`chip${isSoldOut ? ' checked' : ''}`}
                      style={isSoldOut ? { borderColor: 'var(--maroon)', background: 'var(--pink-pale)' } : {}}
                      onClick={() => {
                        const current = settings.sold_out_syrups || [];
                        const next = isSoldOut ? current.filter((x) => x !== s) : [...current, s];
                        saveSettings({ sold_out_syrups: next });
                      }}
                      disabled={savingSettings}
                    >
                      {isSoldOut ? '🚫 ' : '✅ '}{s}
                    </button>
                  );
                })}
              </div>
              <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>Tap a syrup to mark it sold out.</p>
            </div>

            <div className="order-card" style={{ marginTop: 10 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 10 }}>
                Catering availability
              </label>
              <div className="chip-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => {
                  const isOn = (settings.catering_days || []).includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`chip${isOn ? ' checked' : ''}`}
                      onClick={() => {
                        const current = settings.catering_days || [];
                        const next = isOn ? current.filter((x) => x !== i) : [...current, i];
                        saveSettings({ catering_days: next });
                      }}
                      disabled={savingSettings}
                    >
                      {isOn ? '🎉 ' : ''}{label}
                    </button>
                  );
                })}
              </div>
              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label>Message shown to customers</label>
                <input
                  type="text"
                  defaultValue={settings.catering_info}
                  placeholder="e.g. Available for parties of 10+ — text us to arrange details!"
                  onBlur={(e) => saveSettings({ catering_info: e.target.value })}
                />
              </div>
              <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>Tap the days you're available for catering. Leave all off to hide the catering section from customers.</p>
            </div>
          </div>
        )}

        <div className="section">
          <Link href="/admin/sales" style={{ color: 'var(--maroon)', fontWeight: 700, textDecoration: 'none' }}>
            📊 View sales dashboard →
          </Link>
        </div>

        {!pushEnabled && (
          <div className="section">
            <button className="btn-primary" onClick={enablePush}>
              🔔 Enable push notifications on this device
            </button>
          </div>
        )}

        <div className="section">
          <h2>Export order history</h2>
          <div className="field">
            <select value={exportRange} onChange={(e) => setExportRange(e.target.value)}>
              <option value="all">All orders ever</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="custom">Custom date range</option>
            </select>
          </div>
          {exportRange === 'custom' && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
                <label>From</label>
                <input type="date" value={exportStart} onChange={(e) => setExportStart(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
                <label>To</label>
                <input type="date" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} />
              </div>
            </div>
          )}
          <button className="btn-primary" onClick={exportOrders} disabled={exporting}>
            {exporting ? 'Preparing…' : '⬇️ Export Excel file'}
          </button>
        </div>

        <div className="section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <h2>Orders ({orders.filter((o) => o.status !== 'done').length} open)</h2>
            {selectedIds.length > 0 && (
              <button className="status-btn" style={{ color: '#fff', background: 'var(--maroon)', borderColor: 'var(--maroon)' }} onClick={deleteSelected} disabled={deleting}>
                {deleting ? 'Deleting…' : `🗑️ Delete selected (${selectedIds.length})`}
              </button>
            )}
          </div>
          {orders.length === 0 && <p className="hint">No orders yet.</p>}
          {orders.map((o) => (
            <div key={o.id} className={`order-card${o.status === 'done' ? ' done' : ''}`}>
              <div className="row">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    style={{ width: 18, height: 18, accentColor: 'var(--maroon)' }}
                    checked={selectedIds.includes(o.id)}
                    onChange={() => toggleSelect(o.id)}
                  />
                  <span className="pickup">Pickup {formatDateKey(o.pickup_date || todayDateKey())}, {o.pickup_time}</span>
                </label>
                <span className="total">${Number(o.total).toFixed(2)}</span>
              </div>
              <div className="meta">{o.qty}x {o.base}{o.cup_size ? ` (${o.cup_size})` : ''}</div>
              <details className="order-details">
                <summary>View toppings &amp; syrup</summary>
                <div className="order-details-body">
                  {(o.base === 'Banana Pudding' || o.base === 'Gansito') && (
                    <div><strong>Rim:</strong> {o.include_rim === false ? '🚫 No rim' : '✅ Yes'}</div>
                  )}
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
              {o.status === 'done' && o.customer_phone && (
                <div className="meta">📲 Ready text sent ({o.language === 'es' ? 'Español' : 'English'})</div>
              )}
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

            {(editForm.base === 'bananapudding' || editForm.base === 'gansito') && (
              <div className="field">
                <label>Rim</label>
                <div className="chip-grid">
                  <button
                    type="button"
                    className={`chip${editForm.includeRim ? ' checked' : ''}`}
                    onClick={() => setEditForm((f) => ({ ...f, includeRim: true }))}
                  >
                    ✅ Yes
                  </button>
                  <button
                    type="button"
                    className={`chip${!editForm.includeRim ? ' checked' : ''}`}
                    onClick={() => setEditForm((f) => ({ ...f, includeRim: false }))}
                  >
                    🚫 No rim
                  </button>
                </div>
              </div>
            )}

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
              <label>Pickup date</label>
              <input
                type="date"
                value={editForm.pickup_date}
                min={todayDateKey()}
                max={maxPreorderDateKey()}
                onChange={(e) => setEditForm((f) => ({ ...f, pickup_date: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Pickup time</label>
              <select value={editForm.pickup_time} onChange={(e) => setEditForm((f) => ({ ...f, pickup_time: e.target.value }))}>
                {buildPickupTimes(editForm.pickup_date, settings).map((tm) => <option key={tm} value={tm}>{tm}</option>)}
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
