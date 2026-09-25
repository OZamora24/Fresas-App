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
  const [oneSignalReady, setOneSignalReady] = useState(false);
  const [pushError, setPushError] = useState('');
  const [needsHomeScreen, setNeedsHomeScreen] = useState(false);
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
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoFormOpen, setPromoFormOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [promoForm, setPromoForm] = useState({ code: '', discount_type: 'percent', discount_amount: '', expires_at: '', active: true });
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoFormError, setPromoFormError] = useState('');
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyForm, setNotifyForm] = useState({ title: '', message: '' });
  const [sendingNotify, setSendingNotify] = useState(false);
  const [notifyResult, setNotifyResult] = useState(null);
  const [newClosedDate, setNewClosedDate] = useState('');
  const pollRef = useRef(null);

  async function fetchSettings() {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const json = await res.json();
      setSettings(json.settings);
    }
  }

  async function fetchPhotos() {
    const res = await fetch('/api/photos');
    if (res.ok) {
      const json = await res.json();
      setPhotos(json.photos || []);
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

  async function fetchPromoCodes() {
    const res = await fetch('/api/promo-codes');
    if (res.ok) {
      const json = await res.json();
      setPromoCodes(json.promoCodes || []);
    }
  }

  useEffect(() => {
    fetchOrders().finally(() => setChecking(false));
    fetchSettings();
    fetchPhotos();
    fetchPromoCodes();

    // iOS/iPadOS only supports web push for a site that's been "Added to
    // Home Screen" and opened from there — a regular Safari/Chrome tab on
    // iPhone/iPad can never get push permission, by Apple's own design.
    // Detect that case so we can explain it clearly instead of showing a
    // generic timeout error.
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIOSDevice && !isStandalone) {
      setNeedsHomeScreen(true);
    }
  }, []);

  // Safety net: if OneSignal hasn't finished loading within 8 seconds
  // (blocked by an ad blocker, network issue, etc.), stop showing
  // "Loading notifications…" forever and say so instead.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!oneSignalReady && !needsHomeScreen) {
        setPushError("Notifications are taking too long to load — this can happen if an ad blocker or browser privacy setting is blocking it. Try disabling any ad blocker for this site, or try a different browser.");
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [oneSignalReady, needsHomeScreen]);

  useEffect(() => {
    if (!authed) return;
    pollRef.current = setInterval(fetchOrders, 5000);
    return () => clearInterval(pollRef.current);
  }, [authed]);

  // Keep the edit-order pickup time in sync with the pickup date: weekday
  // and weekend hours can differ, so a time that was valid for the order's
  // original date (e.g. "5:00 PM") isn't necessarily valid once the admin
  // switches the date to a Saturday. Without this, the <select> keeps
  // showing the old time even though it's no longer one of the options
  // generated for the new date, which is exactly the "stuck at 5pm" bug.
  useEffect(() => {
    if (!editForm) return;
    const times = buildPickupTimes(editForm.pickup_date, settings);
    if (times.length > 0 && !times.includes(editForm.pickup_time)) {
      setEditForm((f) => (f ? { ...f, pickup_time: times[0] } : f));
    }
  }, [editForm?.pickup_date, settings]); // eslint-disable-line react-hooks/exhaustive-deps

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
      isMultiCup: Array.isArray(o.items) && o.items.length > 0,
      items: o.items || null,
      originalTotal: Number(o.total) || 0,
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
    const newTotal = editForm.isMultiCup ? editForm.originalTotal : orderTotal(editForm.base, editForm.cupSize, editForm.toppings, editForm.qty);

    const payload = editForm.isMultiCup
      ? {
          id: editingId,
          pickup_date: editForm.pickup_date,
          pickup_time: editForm.pickup_time,
          customer_name: editForm.customer_name,
          customer_phone: editForm.customer_phone,
          notes: editForm.notes,
        }
      : {
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
    setPushError('');
    if (!window.OneSignal) {
      setPushError("Still setting up notifications — give it a second and try again.");
      return;
    }
    try {
      await window.OneSignal.Notifications.requestPermission();
      await window.OneSignal.User.addTag('role', 'admin');
      // requestPermission() can resolve even if the browser prompt was
      // dismissed or previously denied — check the actual permission
      // state rather than assuming it worked.
      if (window.OneSignal.Notifications.permission) {
        setPushEnabled(true);
      } else {
        setPushError("Notifications weren't allowed. Check your browser's site settings (🔒 icon in the address bar) and allow notifications for this site, then try again.");
      }
    } catch (e) {
      setPushError('Something went wrong turning on notifications — please try again.');
    }
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setPhotoError('');
    setUploadingPhoto(true);
    try {
      for (const file of files) {
        if (file.size > 4 * 1024 * 1024) {
          setPhotoError(`${file.name} is over 4MB — please use a smaller photo.`);
          continue;
        }
        const dataBase64 = await readFileAsBase64(file);
        const res = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, dataBase64, contentType: file.type }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setPhotoError(body.message || body.error || `Could not upload ${file.name}.`);
        }
      }
      await fetchPhotos();
    } catch (e) {
      setPhotoError('Could not upload photo(s) — please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function deletePhoto(path) {
    const ok = window.confirm('Delete this photo? This cannot be undone.');
    if (!ok) return;
    await fetch('/api/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    setPhotos((prev) => prev.filter((p) => p.path !== path));
  }

  function openNewPromo() {
    setEditingPromoId(null);
    setPromoForm({ code: '', discount_type: 'percent', discount_amount: '', expires_at: '', active: true });
    setPromoFormError('');
    setPromoFormOpen(true);
  }

  function openEditPromo(pc) {
    setEditingPromoId(pc.id);
    setPromoForm({
      code: pc.code,
      discount_type: pc.discount_type,
      discount_amount: String(pc.discount_amount),
      expires_at: pc.expires_at ? pc.expires_at.slice(0, 10) : '',
      active: pc.active,
    });
    setPromoFormError('');
    setPromoFormOpen(true);
  }

  async function savePromoCode() {
    setPromoFormError('');
    const code = promoForm.code.trim().toUpperCase();
    const amount = parseFloat(promoForm.discount_amount);
    if (!code) { setPromoFormError('Enter a code.'); return; }
    if (!amount || amount <= 0) { setPromoFormError('Enter a discount amount.'); return; }
    if (promoForm.discount_type === 'percent' && amount > 100) { setPromoFormError('Percent off cannot be more than 100.'); return; }

    setSavingPromo(true);
    const payload = {
      code,
      discount_type: promoForm.discount_type,
      discount_amount: amount,
      expires_at: promoForm.expires_at ? new Date(`${promoForm.expires_at}T23:59:59`).toISOString() : null,
      active: promoForm.active,
    };
    const res = await fetch('/api/promo-codes', {
      method: editingPromoId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPromoId ? { id: editingPromoId, ...payload } : payload),
    });
    if (res.ok) {
      await fetchPromoCodes();
      setPromoFormOpen(false);
    } else {
      const body = await res.json().catch(() => ({}));
      setPromoFormError(body.error || 'Could not save promo code.');
    }
    setSavingPromo(false);
  }

  async function togglePromoActive(pc) {
    await fetch('/api/promo-codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pc.id, active: !pc.active }),
    });
    fetchPromoCodes();
  }

  async function deletePromoCode(pc) {
    const ok = window.confirm(`Delete promo code ${pc.code}? This cannot be undone.`);
    if (!ok) return;
    await fetch('/api/promo-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pc.id }),
    });
    setPromoCodes((prev) => prev.filter((x) => x.id !== pc.id));
  }

  function openNotifyForm(prefill) {
    setNotifyForm(prefill || { title: '', message: '' });
    setNotifyResult(null);
    setNotifyOpen(true);
  }

  function openNotifyForPromo(pc) {
    const discount = pc.discount_type === 'percent'
      ? `${pc.discount_amount}% off`
      : `$${Number(pc.discount_amount).toFixed(2)} off`;
    openNotifyForm({
      title: 'New promo code! 🍓',
      message: `Use code ${pc.code} for ${discount} your next order.`,
    });
  }

  async function sendCustomerNotification() {
    const title = notifyForm.title.trim();
    const message = notifyForm.message.trim();
    if (!title || !message) {
      setNotifyResult({ ok: false, text: 'Enter a title and message.' });
      return;
    }
    setSendingNotify(true);
    setNotifyResult(null);
    try {
      const res = await fetch('/api/notify-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotifyResult({ ok: false, text: json.error || 'Could not send notification.' });
      } else {
        const count = json.recipients ?? 0;
        setNotifyResult({
          ok: true,
          text: count > 0 ? `Sent to ${count} subscriber${count === 1 ? '' : 's'}.` : 'Sent — but no one is subscribed yet.',
        });
        setNotifyForm({ title: '', message: '' });
      }
    } catch (e) {
      setNotifyResult({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setSendingNotify(false);
    }
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div className="login-box">
        <Head>
          <title>Admin — Fresas con Crema</title>
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="theme-color" content="#7C1B2C" />
        </Head>
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
      <Head>
          <title>Admin — Fresas con Crema</title>
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="theme-color" content="#7C1B2C" />
        </Head>
      {ONESIGNAL_APP_ID && (
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
          onLoad={() => {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async (OneSignal) => {
              try {
                await OneSignal.init({ appId: ONESIGNAL_APP_ID });
                window.OneSignal = OneSignal;
                setOneSignalReady(true);
                // If notifications were already granted in an earlier visit,
                // reflect that immediately instead of showing the button again.
                if (OneSignal.Notifications.permission) setPushEnabled(true);
              } catch (e) {
                console.error('OneSignal init failed', e);
                setPushError('Could not set up notifications (setup error) — try refreshing the page.');
              }
            });
          }}
          onError={() => {
            setPushError('Could not load the notifications service — check your internet connection or try refreshing.');
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
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
                Closed days
              </label>
              <p className="hint" style={{ marginTop: 0 }}>
                Know in advance you'll be closed a day — a trip, a holiday? Add the date here. Customers won't be able to pick it for pickup, and the home page shows "Closed" that day automatically — you don't have to remember to flip the shop switch.
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <input
                  type="date"
                  value={newClosedDate}
                  min={todayDateKey()}
                  onChange={(e) => setNewClosedDate(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="status-btn"
                  disabled={!newClosedDate || savingSettings}
                  onClick={() => {
                    const current = settings.closed_dates || [];
                    if (!current.includes(newClosedDate)) {
                      saveSettings({ closed_dates: [...current, newClosedDate].sort() });
                    }
                    setNewClosedDate('');
                  }}
                >
                  + Add
                </button>
              </div>
              {(settings.closed_dates || []).length === 0 ? (
                <p className="hint" style={{ margin: 0 }}>No closed days scheduled.</p>
              ) : (
                <div className="chip-grid">
                  {(settings.closed_dates || []).slice().sort().map((d) => (
                    <span key={d} className="chip" style={{ cursor: 'default' }}>
                      {formatDateKey(d)}
                      <button
                        type="button"
                        onClick={() => saveSettings({ closed_dates: (settings.closed_dates || []).filter((x) => x !== d) })}
                        disabled={savingSettings}
                        aria-label={`Remove ${d}`}
                        style={{ background: 'none', border: 'none', color: 'var(--maroon)', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <details className="order-card availability-dropdown" style={{ marginTop: 10 }}>
              <summary style={{ fontWeight: 700 }}>
                Flavor availability
              </summary>
              <div className="chip-grid" style={{ marginTop: 10 }}>
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
            </details>

            <details className="order-card availability-dropdown" style={{ marginTop: 10 }}>
              <summary style={{ fontWeight: 700 }}>
                Topping availability
              </summary>
              <div className="chip-grid" style={{ marginTop: 10 }}>
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
            </details>

            <details className="order-card availability-dropdown" style={{ marginTop: 10 }}>
              <summary style={{ fontWeight: 700 }}>
                Syrup availability
              </summary>
              <div className="chip-grid" style={{ marginTop: 10 }}>
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
            </details>

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

        <div className="section">
          <h2>Promo codes</h2>
          <p className="hint">Create a code and turn it on — customers enter it on the order page for an automatic discount.</p>
          <p className="hint" style={{ marginTop: -8 }}>
            Turning a code on doesn't notify anyone by itself — use "Notify customers" on a code below, or the general button underneath the list, to actually push it out to whoever opted into "Get notified about deals."
          </p>

          {promoCodes.map((pc) => {
            const isExpired = pc.expires_at && new Date(pc.expires_at).getTime() < Date.now();
            const statusLabel = isExpired ? 'Expired' : pc.active ? 'Active' : 'Off';
            const statusClass = isExpired || !pc.active ? 'inactive' : 'active';
            return (
              <div key={pc.id} className={`order-card${pc.active && !isExpired ? '' : ' done'}`}>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: 'var(--maroon)' }}>
                      {pc.code}
                    </div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>
                      {pc.discount_type === 'percent' ? `${pc.discount_amount}% off` : `$${Number(pc.discount_amount).toFixed(2)} off`}
                    </div>
                    <div className="meta">
                      Used {pc.times_used || 0} time{pc.times_used === 1 ? '' : 's'} · {pc.expires_at ? `${isExpired ? 'expired' : 'expires'} ${new Date(pc.expires_at).toLocaleDateString()}` : 'no expiration'}
                    </div>
                  </div>
                  <span className={`promo-status-pill ${statusClass}`}>{statusLabel}</span>
                </div>
                <div className="promo-actions">
                  <button className="status-btn" onClick={() => openEditPromo(pc)}>Edit</button>
                  {!isExpired && (
                    <button className="status-btn" onClick={() => togglePromoActive(pc)}>
                      {pc.active ? 'Turn off' : 'Turn on'}
                    </button>
                  )}
                  {pc.active && !isExpired && (
                    <button className="status-btn" onClick={() => openNotifyForPromo(pc)}>📣 Notify customers</button>
                  )}
                  <button className="status-btn" onClick={() => deletePromoCode(pc)}>Delete</button>
                </div>
              </div>
            );
          })}

          {promoCodes.length === 0 && !promoFormOpen && (
            <p className="hint">No promo codes yet.</p>
          )}

          {!promoFormOpen ? (
            <button className="btn-primary" onClick={openNewPromo}>+ Add a new promo code</button>
          ) : (
            <div className="order-card" style={{ borderColor: 'var(--pink)', background: 'var(--pink-pale)' }}>
              <div className="field">
                <label>Code</label>
                <input
                  type="text"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. FALL15"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Discount type</label>
                  <select
                    value={promoForm.discount_type}
                    onChange={(e) => setPromoForm((f) => ({ ...f, discount_type: e.target.value }))}
                  >
                    <option value="percent">Percent off (%)</option>
                    <option value="fixed">Dollar amount off ($)</option>
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Amount</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={promoForm.discount_amount}
                    onChange={(e) => setPromoForm((f) => ({ ...f, discount_amount: e.target.value }))}
                    placeholder={promoForm.discount_type === 'percent' ? '10' : '5'}
                  />
                </div>
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Expiration date (optional)</label>
                <input
                  type="date"
                  value={promoForm.expires_at}
                  onChange={(e) => setPromoForm((f) => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, cursor: 'pointer', marginBottom: 4 }}>
                <input
                  type="checkbox"
                  style={{ width: 18, height: 18 }}
                  checked={promoForm.active}
                  onChange={(e) => setPromoForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Active right away
              </label>
              {promoFormError && <p className="login-box error" style={{ margin: '8px 0' }}>{promoFormError}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button className="btn-primary" onClick={savePromoCode} disabled={savingPromo} style={{ flex: 1 }}>
                  {savingPromo ? 'Saving…' : 'Save promo code'}
                </button>
                <button className="status-btn" onClick={() => setPromoFormOpen(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            {!notifyOpen ? (
              <button className="status-btn" onClick={() => openNotifyForm()}>📣 Send a notification to subscribers</button>
            ) : (
              <div className="order-card" style={{ borderColor: 'var(--pink)', background: 'var(--pink-pale)' }}>
                <p className="hint" style={{ marginTop: 0 }}>
                  Goes out to everyone who tapped "Turn on notifications" on the order confirmation screen — not to every customer.
                </p>
                <div className="field">
                  <label>Title</label>
                  <input
                    type="text"
                    value={notifyForm.title}
                    onChange={(e) => setNotifyForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. New promo code! 🍓"
                  />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>Message</label>
                  <textarea
                    value={notifyForm.message}
                    onChange={(e) => setNotifyForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="e.g. Use code LAUNCH15 for 15% off your next order."
                    rows={3}
                  />
                </div>
                {notifyResult && (
                  <p className={notifyResult.ok ? 'hint' : 'login-box error'} style={{ margin: '8px 0' }}>
                    {notifyResult.text}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button className="btn-primary" onClick={sendCustomerNotification} disabled={sendingNotify} style={{ flex: 1 }}>
                    {sendingNotify ? 'Sending…' : 'Send notification'}
                  </button>
                  <button className="status-btn" onClick={() => setNotifyOpen(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <h2>Site photos</h2>
          <p className="hint">These show up on the public Photos page. Max 4MB per photo.</p>
          <div className="order-card">
            <label className="btn-primary" style={{ display: 'inline-block', cursor: 'pointer' }}>
              {uploadingPhoto ? 'Uploading…' : '📷 Upload photo(s)'}
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                disabled={uploadingPhoto}
                onChange={(e) => { handlePhotoFiles(e.target.files); e.target.value = ''; }}
              />
            </label>
            {photoError && <p className="error" style={{ marginTop: 10 }}>{photoError}</p>}
            {photos.length === 0 ? (
              <p className="hint" style={{ marginTop: 14, marginBottom: 0 }}>No photos uploaded yet.</p>
            ) : (
              <div className="admin-photo-grid">
                {photos.map((p) => (
                  <div key={p.path} className="admin-photo-tile">
                    <img src={p.url} alt="" />
                    <button type="button" className="del-btn" onClick={() => deletePhoto(p.path)} title="Delete">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!pushEnabled && (
          <div className="section">
            {needsHomeScreen ? (
              <div className="order-card">
                <p style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--maroon)' }}>
                  📲 One extra step on iPhone/iPad
                </p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
                  Apple only allows notifications for sites added to your Home Screen. Tap the Share button
                  in Safari, choose <strong>"Add to Home Screen"</strong>, then open Admin from that new icon
                  instead of Safari — you'll be able to enable notifications from there.
                </p>
              </div>
            ) : (
              <>
                <button className="btn-primary" onClick={enablePush} disabled={!oneSignalReady}>
                  🔔 {oneSignalReady ? 'Enable push notifications on this device' : 'Loading notifications…'}
                </button>
                {pushError && <p className="error" style={{ marginTop: 8 }}>{pushError}</p>}
              </>
            )}
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
              {o.order_number && (
                <div style={{ fontWeight: 800, color: 'var(--maroon)', fontSize: '1.05rem', marginBottom: 6 }}>
                  #{o.order_number}{o.customer_name ? ` — ${o.customer_name}` : ''}
                </div>
              )}
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
              {Array.isArray(o.items) && o.items.length > 0 ? (
                <>
                  <div className="meta">{o.items.length} cup{o.items.length === 1 ? '' : 's'} in this order</div>
                  <div className="order-details-body order-details-body-static">
                    {o.items.map((item, i) => (
                      <div key={i} style={{ marginBottom: i < o.items.length - 1 ? 10 : 0, paddingBottom: i < o.items.length - 1 ? 10 : 0, borderBottom: i < o.items.length - 1 ? '1px dashed var(--line)' : 'none' }}>
                        <div><strong>{item.qty}x {item.base}</strong>{item.cup_size ? ` (${item.cup_size})` : ''}</div>
                        {(item.base === 'Banana Pudding' || item.base === 'Gansito') && (
                          <div><strong>Rim:</strong> {item.include_rim === false ? '🚫 No rim' : '✅ Yes'}</div>
                        )}
                        <div><strong>Toppings:</strong></div>
                        {item.toppings?.length
                          ? item.toppings.map((t) => <div key={t}>- {t}</div>)
                          : <div>- None</div>}
                        <div><strong>Syrup:</strong></div>
                        {item.syrups?.length
                          ? item.syrups.map((s) => <div key={s}>- {s}</div>)
                          : <div>- None</div>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="meta">{o.qty}x {o.base}{o.cup_size ? ` (${o.cup_size})` : ''}</div>
                  <div className="order-details-body order-details-body-static">
                    {(o.base === 'Banana Pudding' || o.base === 'Gansito') && (
                      <div><strong>Rim:</strong> {o.include_rim === false ? '🚫 No rim' : '✅ Yes'}</div>
                    )}
                    <div><strong>Toppings:</strong></div>
                    {o.toppings?.length
                      ? o.toppings.map((t) => <div key={t}>- {t}</div>)
                      : <div>- None</div>}
                    <div><strong>Syrup:</strong></div>
                    {o.syrups?.length
                      ? o.syrups.map((s) => <div key={s}>- {s}</div>)
                      : <div>- None</div>}
                  </div>
                </>
              )}
              {o.notes && (
                <div className="meta">{o.notes}</div>
              )}
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

            {editForm.isMultiCup ? (
              <div className="field">
                <label>Cups in this order</label>
                <div className="order-details-body order-details-body-static" style={{ marginTop: 0 }}>
                  {editForm.items.map((item, i) => (
                    <div key={i} style={{ marginBottom: i < editForm.items.length - 1 ? 8 : 0 }}>
                      <div><strong>{item.qty}x {item.base}</strong>{item.cup_size ? ` (${item.cup_size})` : ''}</div>
                      <div>Toppings: {item.toppings?.length ? item.toppings.join(', ') : 'None'} · Syrup: {item.syrups?.length ? item.syrups.join(', ') : 'None'}</div>
                    </div>
                  ))}
                </div>
                <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
                  This order has multiple different cups — editing cup details isn't supported here yet. You can still update pickup time, customer info, and notes below. To change what's in the order, it's easiest to have the customer place a new one and delete this one.
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}

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
