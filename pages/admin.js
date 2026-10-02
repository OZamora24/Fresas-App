import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import Link from 'next/link';
import { BASES, PRICES, TOPPINGS, SYRUPS, orderTotal, buildPickupTimes, baseIdFromName, formatDateKey, todayDateKey, maxPreorderDateKey, MAX_EXTRA_TOPPING_QTY, FREE_CUP_DEAL_CODE } from '../lib/menu';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

// Dashboard sections Orlando can reorder with the up/down arrows, top to
// bottom by default. The Orders queue below them is intentionally left out
// — it always stays last and never gets arrows.
const SECTION_KEYS = ['shopStatus', 'salesLink', 'promoCodes', 'sitePhotos', 'exportHistory'];
const SECTION_ORDER_STORAGE_KEY = 'fresasAdminSectionOrder';

// An "always extra" topping (Cheesecake, Ice Cream) can appear more than
// once in a `toppings` array — one entry per unit the customer added with
// the +/- stepper on the order page (see pages/order.js). This turns that
// into [{ name, count }] pairs so the kitchen-facing order view can show
// "Cheesecake ×2" instead of printing "Cheesecake" twice in a row.
function groupToppingCounts(list) {
  const order = [];
  const counts = new Map();
  (list || []).forEach((name) => {
    if (!counts.has(name)) { counts.set(name, 0); order.push(name); }
    counts.set(name, counts.get(name) + 1);
  });
  return order.map((name) => ({ name, count: counts.get(name) }));
}

function toppingsSummaryText(list) {
  return groupToppingCounts(list)
    .map(({ name, count }) => (count > 1 ? `${name} ×${count}` : name))
    .join(', ');
}

const SEEN_ORDERS_KEY = 'fresasAdminSeenOrders';

// "5:30 PM" -> minutes since midnight, for sorting pickup times.
function pickupMinutes(label) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label || '');
  if (!m) return 0;
  const h = (parseInt(m[1], 10) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return h * 60 + parseInt(m[2], 10);
}

// YYYY-MM-DD key moved by `days` (used for the "Yesterday" label).
function shiftDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Second line of a compact Completed row: what they got, pickup time, and
// "Cash" when a cash order was never marked paid.
function doneRowSummary(o) {
  const what = Array.isArray(o.items) && o.items.length > 1
    ? `${o.items.reduce((n, i) => n + (i.qty || 1), 0)} cups`
    : Array.isArray(o.items) && o.items.length === 1
      ? `${o.items[0].qty}x ${o.items[0].base}${o.items[0].cup_size ? ` (${o.items[0].cup_size})` : ''}`
      : `${o.qty}x ${o.base}${o.cup_size ? ` (${o.cup_size})` : ''}`;
  const cashNote = !o.paid && o.payment_method === 'cash' ? ' · Cash' : '';
  return `${what} · ${o.pickup_time}${cashNote}`;
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersTab, setOrdersTab] = useState('open'); // 'open' | 'done'
  const [expandedDoneId, setExpandedDoneId] = useState(null); // which Completed row is tapped open
  const [seenOrderIds, setSeenOrderIds] = useState(null); // null until loaded from localStorage
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
  const [confirmingDelete, setConfirmingDelete] = useState(false); // delete bar is asking "are you sure?"
  const [deleteError, setDeleteError] = useState('');
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
  // Sales snapshot shown inline in the "Sales" drawer row — fetched lazily
  // (only the first time that row is opened) rather than on every admin
  // page load, since it's a heavier query than the rest of this page needs.
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState('');
  // Which order the reorderable dashboard sections render in — persisted to
  // this browser's localStorage (not the shop_settings table), so it's
  // per-device rather than synced across every phone/computer Orlando uses.
  const [sectionOrder, setSectionOrder] = useState(SECTION_KEYS);
  const closedDateInputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SECTION_ORDER_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      // Only trust a saved order if it's the exact same set of sections we
      // know about today — guards against a stale list from before a
      // section was added or removed.
      if (Array.isArray(parsed) && parsed.length === SECTION_KEYS.length && SECTION_KEYS.every((k) => parsed.includes(k))) {
        setSectionOrder(parsed);
      }
    } catch (e) {
      // ignore — falls back to the default order
    }
  }, []);

  function moveSection(key, direction) {
    setSectionOrder((prev) => {
      const idx = prev.indexOf(key);
      const swapWith = idx + direction;
      if (idx === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      try {
        window.localStorage.setItem(SECTION_ORDER_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        // ignore — reordering still works for this visit even if it can't be saved
      }
      return next;
    });
  }

  // Small up/down arrow pair for a section header. Disabled at whichever
  // end of the list that section is currently at. These now sit inside each
  // drawer row's <summary> (see the Manage shop drawer below) — a click
  // anywhere in a <summary> normally toggles its <details> open/closed, so
  // both buttons stop that default/propagation to reorder without also
  // collapsing or expanding the row.
  function SectionArrows({ sectionKey }) {
    const idx = sectionOrder.indexOf(sectionKey);
    return (
      <span className="section-reorder-controls">
        <button
          type="button"
          className="reorder-btn"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveSection(sectionKey, -1); }}
          disabled={idx <= 0}
          aria-label="Move section up"
          title="Move up"
        >
          ▲
        </button>
        <button
          type="button"
          className="reorder-btn"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveSection(sectionKey, 1); }}
          disabled={idx === -1 || idx >= sectionOrder.length - 1}
          aria-label="Move section down"
          title="Move down"
        >
          ▼
        </button>
      </span>
    );
  }

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

  async function fetchSalesSummary() {
    setSalesLoading(true);
    setSalesError('');
    try {
      const res = await fetch('/api/sales-summary');
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setSalesSummary(json);
    } catch (e) {
      setSalesError('Could not load sales data right now.');
    } finally {
      setSalesLoading(false);
    }
  }

  // Only fetch once, the first time the Sales row is expanded — <details>
  // fires onToggle on every open AND close, so this guards on
  // e.target.open plus "haven't loaded yet" rather than re-fetching every
  // time it's reopened during the same visit.
  function handleSalesToggle(e) {
    if (e.target.open && !salesSummary && !salesLoading) {
      fetchSalesSummary();
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

  // Safety net: if OneSignal hasn't finished loading within 20 seconds,
  // stop showing "Loading notifications…" forever and say so instead. This
  // only shows on a device/browser where push hasn't already been enabled
  // (see the `!pushEnabled` check around the button below) — most likely
  // cause in practice is a weak/cellular connection being slow to fetch
  // the OneSignal script, not necessarily an ad blocker. 20s (up from an
  // earlier 8s) gives slow mobile connections room to finish before this
  // fires as a false alarm.
  //
  // Restart that 20s clock every time the page becomes visible again,
  // instead of letting it run continuously from mount. Orlando hit this on
  // his phone's installed Home Screen app: he tapped "Export Excel file"
  // moments after opening /admin, which hands the page off to iOS's native
  // Save-to-Files sheet — and iOS pauses JS execution in the background
  // while that sheet is up, but real wall-clock time keeps passing. If the
  // OneSignal SDK was still loading at that moment, the 20s timer kept
  // counting that backgrounded time, so by the time he returned to the
  // page it had already run out and showed the "taking a while" error —
  // even though the SDK had barely had a real chance to load in the
  // foreground. A manual refresh "fixed" it only because it restarted the
  // whole 20s window uninterrupted. Resetting the timer on every
  // visibilitychange back to 'visible' means the message only ever appears
  // after 20 real seconds of the page actually being on screen.
  useEffect(() => {
    if (oneSignalReady || needsHomeScreen) return undefined;
    function fire() {
      setPushError("Notifications are taking a while to load — usually just a slow or weak connection, but it can also be an ad blocker or browser privacy setting. Try again in a moment, switch to Wi-Fi if you're on cellular, or disable any ad blocker for this site.");
    }
    let timeout = setTimeout(fire, 20000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timeout);
        timeout = setTimeout(fire, 20000);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisible);
    };
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

  // "NEW" badge: an open order stays marked new until it's tapped on this
  // device. Seen order ids live in localStorage, so an order that came in
  // while the app was closed still shows NEW when it's opened. The very
  // first time (nothing stored yet), every order already on file counts as
  // seen, so the badge doesn't light up the whole existing queue.
  useEffect(() => {
    if (checking || !authed || seenOrderIds !== null) return;
    let stored = null;
    try { stored = JSON.parse(window.localStorage.getItem(SEEN_ORDERS_KEY) || 'null'); } catch (e) {}
    if (Array.isArray(stored)) {
      setSeenOrderIds(new Set(stored));
    } else {
      const baseline = new Set(orders.map((o) => o.id));
      setSeenOrderIds(baseline);
      try { window.localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify([...baseline])); } catch (e) {}
    }
  }, [checking, authed, orders, seenOrderIds]);

  function isNewOrder(o) {
    return seenOrderIds !== null && o.status !== 'done' && !seenOrderIds.has(o.id);
  }

  function markOrderSeen(id) {
    setSeenOrderIds((prev) => {
      const next = new Set(prev || []);
      next.add(id);
      // Only the most recent ids matter — keep the stored list from growing forever.
      const trimmed = [...next].slice(-500);
      try { window.localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify(trimmed)); } catch (e) {}
      return new Set(trimmed);
    });
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
  // "Always extra" toppings (Cheesecake, Ice Cream) can carry more than one
  // unit — same +/- pattern as the customer order page — so an order can be
  // corrected to the right quantity instead of only on/off.
  function addEditToppingUnit(name) {
    setEditForm((f) => (
      f.toppings.filter((x) => x === name).length >= MAX_EXTRA_TOPPING_QTY
        ? f
        : { ...f, toppings: [...f.toppings, name] }
    ));
  }
  function removeEditToppingUnit(name) {
    setEditForm((f) => {
      const idx = f.toppings.indexOf(name);
      if (idx === -1) return f;
      const next = [...f.toppings];
      next.splice(idx, 1);
      return { ...f, toppings: next };
    });
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
    setConfirmingDelete(false);
    setDeleteError('');
  }

  function clearSelection() {
    setSelectedIds([]);
    setConfirmingDelete(false);
    setDeleteError('');
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    // The "are you sure?" step happens in the delete bar itself (see
    // confirmingDelete), so by the time this runs it's already confirmed.
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setOrders((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
      setSelectedIds([]);
      setConfirmingDelete(false);
    } catch (e) {
      setDeleteError('Could not delete. Check your connection and try again.');
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

  function openNotifyForFreeCupDeal() {
    openNotifyForm({
      title: 'Buy 3, get the 4th free! 🍓',
      message: 'Order 4 cups and your cheapest one is on us. No code needed, it applies automatically. / Compra 3 y el 4to es gratis, sin código.',
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

  const openOrders = orders.filter((o) => o.status !== 'done');

  // Completed tab: done orders grouped by pickup day (newest day first,
  // latest pickup first within a day), each day with its own count/total.
  const doneGroups = (() => {
    const today = todayDateKey();
    const yesterday = shiftDateKey(today, -1);
    const byDay = new Map();
    orders.filter((o) => o.status === 'done').forEach((o) => {
      const key = o.pickup_date || today;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(o);
    });
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([dateKey, list]) => ({
        dateKey,
        label: dateKey === today ? 'Today' : dateKey === yesterday ? 'Yesterday' : formatDateKey(dateKey),
        orders: list.sort((a, b) => pickupMinutes(b.pickup_time) - pickupMinutes(a.pickup_time)),
        revenue: list.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
      }));
  })();

  // One full order card — used as-is in the Open tab, and when a row in
  // the Completed tab is tapped open (without the faded "done" look there,
  // since everything in that list is done anyway).
  function renderOrderCard(o, inCompletedList = false) {
    return (
      <div
        key={o.id}
        className={`order-card${o.status === 'done' && !inCompletedList ? ' done' : ''}${isNewOrder(o) ? ' is-new' : ''}${selectedIds.includes(o.id) ? ' selected' : ''}`}
        onClick={() => { if (isNewOrder(o)) markOrderSeen(o.id); }}
      >
        {o.order_number && (
          <div style={{ fontWeight: 800, color: 'var(--maroon)', fontSize: '1.05rem', marginBottom: 6 }}>
            #{o.order_number}{o.customer_name ? ` — ${o.customer_name}` : ''}
            {isNewOrder(o) && <span className="new-badge">NEW</span>}
          </div>
        )}
        {isNewOrder(o) && <div className="new-ago">Came in {timeAgo(o.created_at)}</div>}
        {o.arrived_at && (
          <div style={{
            display: 'inline-block', background: 'var(--pink-pale)', border: '2px solid var(--pink)',
            borderRadius: 10, padding: '4px 10px', fontWeight: 800, color: 'var(--maroon)',
            fontSize: '0.82rem', marginBottom: 8,
          }}>
            🚶 Arrived at {new Date(o.arrived_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
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
        {o.promo_code === FREE_CUP_DEAL_CODE ? (
          <div className="meta"><span className="deal-tag" style={{ marginLeft: 0 }}>🎁 4th free</span> −${Number(o.discount_amount || 0).toFixed(2)} off</div>
        ) : o.promo_code ? (
          <div className="meta">🏷️ {o.promo_code} −${Number(o.discount_amount || 0).toFixed(2)} off</div>
        ) : null}
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
                    ? groupToppingCounts(item.toppings).map(({ name, count }) => (
                        <div key={name}>- {name}{count > 1 ? ` ×${count}` : ''}</div>
                      ))
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
                ? groupToppingCounts(o.toppings).map(({ name, count }) => (
                    <div key={name}>- {name}{count > 1 ? ` ×${count}` : ''}</div>
                  ))
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
    );
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
        {/* Pinned open/closed toggle — the one thing checked on every visit,
            so it lives outside (above) the Manage shop drawer below and is
            never collapsed. Everything else that used to share this "Shop
            status" section (closed days, hours, phone requirement,
            catering, sold-out toggles) now lives in the drawer's "Hours,
            availability & catering" row. */}
        {settings && (
          <div className="section pinned-status-section">
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
          </div>
        )}

        {/* Everything below is settings/admin tools rather than day-to-day
            queue work — tucked into one collapsible drawer so it stops
            competing with Orders for space. The individual rows inside
            (Hours & availability, Sales, Promo codes, Site photos, Export)
            are still reorderable with the same up/down arrows as before —
            SECTION_KEYS, sectionOrder and moveSection are all unchanged. */}
        <details className="manage-shop-drawer">
          <summary>
            <span>⚙️ Manage shop — hours, availability, promos &amp; more</span>
            <span className="chev">▾</span>
          </summary>
          <div className="admin-reorder-wrap">
        {settings && (
          <details className="section drawer-section" style={{ order: sectionOrder.indexOf('shopStatus') }}>
            <summary>
              <span>Hours, availability &amp; catering</span>
              <span className="drawer-row-right"><SectionArrows sectionKey="shopStatus" /><span className="chev">▾</span></span>
            </summary>
            <div className="drawer-section-body">
            <div className="order-card" style={{ marginTop: 0 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
                Closed days
              </label>
              <p className="hint" style={{ marginTop: 0 }}>
                Know in advance you'll be closed a day — a trip, a holiday? Add the date here. Customers won't be able to pick it for pickup, and the home page shows "Closed" that day automatically — you don't have to remember to flip the shop switch.
              </p>
              <div style={{ marginBottom: 12, position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  className="status-btn"
                  disabled={savingSettings}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  + Add a closed day
                </button>
                {/* The real date input sits invisibly on top of the button, so
                    a tap lands on the input itself. iOS Safari won't open a
                    date picker from showPicker()/focus() on a hidden input,
                    but it always opens one when the input is tapped directly.
                    Desktop browsers only open the picker from the calendar
                    icon, so we also call showPicker() on click. */}
                <input
                  ref={closedDateInputRef}
                  type="date"
                  aria-label="Add a closed day"
                  value={newClosedDate}
                  min={todayDateKey()}
                  disabled={savingSettings}
                  onClick={(e) => {
                    const el = e.currentTarget;
                    if (typeof el.showPicker === 'function') {
                      try { el.showPicker(); } catch (err) { /* tap opens it natively */ }
                    }
                  }}
                  onChange={(e) => {
                    const picked = e.target.value;
                    setNewClosedDate(picked);
                    if (picked) {
                      const current = settings.closed_dates || [];
                      if (!current.includes(picked)) {
                        saveSettings({ closed_dates: [...current, picked].sort() });
                      }
                      setNewClosedDate('');
                    }
                  }}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer', fontSize: 16,
                    margin: 0, padding: 0, border: 0, WebkitAppearance: 'none', appearance: 'none',
                  }}
                />
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

            <div className="order-card" style={{ marginTop: 10 }}>
              <div className="field-lbl" style={{ marginTop: 0 }}>Max per 15-min slot</div>
              <div className="mini-card-inline">
                <input
                  type="number"
                  min="1"
                  max="50"
                  defaultValue={settings.slot_limit}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (val > 0) saveSettings({ slot_limit: val });
                  }}
                />
                <span>orders max per slot</span>
              </div>

              <div className="field-lbl">Store hours</div>
              <div className="hours-grid">
                <div className="hbox">
                  <div className="lbl">Mon–Fri</div>
                  <div className="val">
                    <input
                      type="time"
                      defaultValue={settings.hours_weekday_start}
                      onChange={(e) => saveSettings({ hours_weekday_start: e.target.value })}
                    />
                    <span>–</span>
                    <input
                      type="time"
                      defaultValue={settings.hours_weekday_end}
                      onChange={(e) => saveSettings({ hours_weekday_end: e.target.value })}
                    />
                  </div>
                </div>
                <div className="hbox">
                  <div className="lbl">Sat–Sun</div>
                  <div className="val">
                    <input
                      type="time"
                      defaultValue={settings.hours_weekend_start}
                      onChange={(e) => saveSettings({ hours_weekend_start: e.target.value })}
                    />
                    <span>–</span>
                    <input
                      type="time"
                      defaultValue={settings.hours_weekend_end}
                      onChange={(e) => saveSettings({ hours_weekend_end: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              {settings.hours_weekend_start && settings.hours_weekend_start === settings.hours_weekend_end && (
                <p className="hint-sm warn">
                  ⚠️ Sat–Sun start and end are both set to the same time right now — that's probably not intended. Update the Sat–Sun times above to fix it.
                </p>
              )}
              <p className="hint-sm">Pickup times customers can pick from are generated from these — weekday and weekend hours can differ.</p>

              <div className="field-lbl">Phone number</div>
              <div className="toggle-inline">
                <span className="ti-label">{settings.require_phone ? '📵 Required at checkout' : '📱 Required at checkout'}</span>
                <button
                  type="button"
                  className={`pill-btn${settings.require_phone ? ' primary' : ''}`}
                  onClick={() => saveSettings({ require_phone: !settings.require_phone })}
                  disabled={savingSettings}
                >
                  {settings.require_phone ? 'On' : 'Off'}
                </button>
              </div>
              <p className="hint-sm">When on, customers can't submit an order without a valid phone number — so every order can get a confirmation text and the "I'm here" arrival link.</p>
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

            <div className="order-card" style={{ marginTop: 10 }}>
              <p className="hint-sm" style={{ margin: '0 0 2px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.7rem' }}>Mark items sold out</p>

              <div className="field-lbl">Flavors</div>
              <div className="chip-row">
                {BASES.map((b) => {
                  const isSoldOut = (settings.sold_out_flavors || []).includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`chip-sm${isSoldOut ? ' off' : ''}`}
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

              <div className="field-lbl">Toppings</div>
              <div className="chip-row">
                {TOPPINGS.map((tp) => {
                  const isSoldOut = (settings.sold_out_toppings || []).includes(tp.name);
                  return (
                    <button
                      key={tp.name}
                      type="button"
                      className={`chip-sm${isSoldOut ? ' off' : ''}`}
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

              <div className="field-lbl">Syrups</div>
              <div className="chip-row">
                {SYRUPS.map((s) => {
                  const isSoldOut = (settings.sold_out_syrups || []).includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`chip-sm${isSoldOut ? ' off' : ''}`}
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
              <p className="hint-sm">Tap an item to mark it sold out — customers won't be able to select it.</p>
            </div>
            </div>
          </details>
        )}

        <details className="section drawer-section" style={{ order: sectionOrder.indexOf('salesLink') }} onToggle={handleSalesToggle}>
          <summary>
            <span>📊 Sales</span>
            <span className="drawer-row-right"><SectionArrows sectionKey="salesLink" /><span className="chev">▾</span></span>
          </summary>
          <div className="drawer-section-body">
            {salesLoading && <p className="hint" style={{ marginTop: 0 }}>Loading…</p>}
            {salesError && <p className="error">{salesError}</p>}
            {salesSummary && (
              <>
                <div className="order-card">
                  <div className="row"><span className="pickup">Today</span></div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <span className="pickup">{salesSummary.today.orders} order{salesSummary.today.orders === 1 ? '' : 's'}</span>
                    <span className="total">${salesSummary.today.revenue.toFixed(2)}</span>
                  </div>
                </div>
                <div className="order-card">
                  <div className="row"><span className="pickup">Last 7 days</span></div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <span className="pickup">{salesSummary.week.orders} order{salesSummary.week.orders === 1 ? '' : 's'}</span>
                    <span className="total">${salesSummary.week.revenue.toFixed(2)}</span>
                  </div>
                </div>
                <div className="order-card">
                  <div className="row"><span className="pickup">Last 90 days</span></div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <span className="pickup">{salesSummary.allTime90d.orders} order{salesSummary.allTime90d.orders === 1 ? '' : 's'}</span>
                    <span className="total">${salesSummary.allTime90d.revenue.toFixed(2)}</span>
                  </div>
                </div>
                {salesSummary.topFlavors.length > 0 && (
                  <p className="hint" style={{ marginBottom: 4 }}>
                    <strong>Best sellers (90 days):</strong> {salesSummary.topFlavors.slice(0, 3).map((f) => `${f.name} (${f.count}x)`).join(', ')}
                  </p>
                )}
              </>
            )}
            <Link href="/admin/sales" style={{ color: 'var(--maroon)', fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>
              📊 Open full sales dashboard →
            </Link>
          </div>
        </details>

        <details className="section drawer-section" style={{ order: sectionOrder.indexOf('promoCodes') }}>
          <summary>
            <span>🏷️ Promo codes</span>
            <span className="drawer-row-right"><SectionArrows sectionKey="promoCodes" /><span className="chev">▾</span></span>
          </summary>
          <div className="drawer-section-body">
          {settings && (
            <div className={`order-card${settings.free_cup_deal ? '' : ' done'}`}>
              <div className="toggle-inline">
                <span className="ti-label">🎁 Buy 3, get the 4th free</span>
                <button
                  type="button"
                  className={`pill-btn${settings.free_cup_deal ? ' primary' : ''}`}
                  onClick={() => saveSettings({ free_cup_deal: !settings.free_cup_deal })}
                  disabled={savingSettings}
                >
                  {settings.free_cup_deal ? 'On' : 'Off'}
                </button>
              </div>
              <p className="hint-sm">When on, every 4th cup in an order is free, with no code needed. The cheapest cup is the free one (base price only, extra toppings still charged). It doesn't combine with promo codes.</p>
              {settings.free_cup_deal && (
                <div className="promo-actions">
                  <button className="status-btn" onClick={openNotifyForFreeCupDeal}>📣 Notify customers</button>
                </div>
              )}
            </div>
          )}
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
        </details>

        <details className="section drawer-section" style={{ order: sectionOrder.indexOf('sitePhotos') }}>
          <summary>
            <span>🖼️ Site photos</span>
            <span className="drawer-row-right"><SectionArrows sectionKey="sitePhotos" /><span className="chev">▾</span></span>
          </summary>
          <div className="drawer-section-body">
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
        </details>

        <details className="section drawer-section" style={{ order: sectionOrder.indexOf('exportHistory') }}>
          <summary>
            <span>📥 Export order history</span>
            <span className="drawer-row-right"><SectionArrows sectionKey="exportHistory" /><span className="chev">▾</span></span>
          </summary>
          <div className="drawer-section-body">
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
        </details>
          </div>
        </details>

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
                {pushError && (
                  <div style={{ marginTop: 8 }}>
                    <p className="error" style={{ margin: 0 }}>{pushError}</p>
                    <button
                      type="button"
                      className="status-btn"
                      style={{ marginTop: 8 }}
                      onClick={() => window.location.reload()}
                    >
                      🔄 Retry
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Orders queue — moved up front, right under the open/closed
            toggle. This is what gets checked most; everything settings-ish
            now lives in the Manage shop drawer below it. Nothing about how
            orders render or the actions on them changed — only where this
            block sits on the page. */}
        <div className="section" style={selectedIds.length > 0 ? { paddingBottom: 96 } : undefined}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <h2>Orders</h2>
          </div>
          {orders.length > 0 && (
            <div className="order-tabs" role="tablist">
              <button type="button" role="tab" className="order-tab" aria-selected={ordersTab === 'open'} onClick={() => setOrdersTab('open')}>
                Open <span className="n">{openOrders.length}</span>
                {openOrders.some(isNewOrder) && <span className="new-dot" aria-label="New orders waiting" />}
              </button>
              <button type="button" role="tab" className="order-tab" aria-selected={ordersTab === 'done'} onClick={() => setOrdersTab('done')}>
                Completed <span className="n">{orders.length - openOrders.length}</span>
              </button>
            </div>
          )}
          {orders.length === 0 && <p className="hint">No orders yet.</p>}
          {orders.length > 0 && ordersTab === 'open' && openOrders.length === 0 && (
            <div className="all-caught-up">
              <div className="act-title">🎉 All caught up</div>
              <p>No orders waiting right now. Finished orders are in the Completed tab.</p>
            </div>
          )}
          {ordersTab === 'done' && orders.length > 0 && openOrders.length === orders.length && (
            <p className="hint">No completed orders yet.</p>
          )}
          {ordersTab === 'open'
            ? openOrders.map((o) => renderOrderCard(o))
            : doneGroups.map((g) => (
                <div key={g.dateKey}>
                  <div className="done-day">
                    <span>{g.label}</span>
                    <b>{g.orders.length} order{g.orders.length === 1 ? '' : 's'} · ${g.revenue.toFixed(2)}</b>
                  </div>
                  <div className="done-list">
                    {g.orders.map((o) => (
                      <div key={o.id}>
                        <button
                          type="button"
                          className={`done-row${expandedDoneId === o.id ? ' open' : ''}`}
                          onClick={() => setExpandedDoneId((cur) => (cur === o.id ? null : o.id))}
                          aria-expanded={expandedDoneId === o.id}
                        >
                          <span className="who">#{o.order_number}{o.customer_name ? ` — ${o.customer_name}` : ''}</span>
                          <span className="right">
                            <span className="total">${Number(o.total).toFixed(2)}</span>
                            <span className={`paid-tag ${o.paid ? 'paid' : 'unpaid'}`}>{o.paid ? 'Paid' : 'Unpaid'}</span>
                          </span>
                          <span className="what">{doneRowSummary(o)}</span>
                        </button>
                        {expandedDoneId === o.id && <div className="done-expanded">{renderOrderCard(o, true)}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
        </div>

      </div>

      {selectedIds.length > 0 && (() => {
        const n = selectedIds.length;
        const selectedTotal = orders.filter((o) => selectedIds.includes(o.id)).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        return (
          <div className={`delete-bar${confirmingDelete ? ' confirm' : ''}`} role="region" aria-label="Selected orders">
            <div style={{ minWidth: 0 }}>
              <div className="db-count">{confirmingDelete ? `Delete ${n} order${n === 1 ? '' : 's'}?` : `${n} selected`}</div>
              <div className="db-sub">
                {deleteError || (confirmingDelete ? "This can't be undone." : `$${selectedTotal.toFixed(2)} in orders`)}
              </div>
            </div>
            <div className="db-actions">
              {confirmingDelete ? (
                <>
                  <button type="button" className="db-ghost" onClick={() => { setConfirmingDelete(false); setDeleteError(''); }} disabled={deleting}>Cancel</button>
                  <button type="button" className="db-yes" onClick={deleteSelected} disabled={deleting}>{deleting ? 'Deleting…' : 'Yes, delete'}</button>
                </>
              ) : (
                <>
                  <button type="button" className="db-ghost" onClick={clearSelection}>Clear</button>
                  <button type="button" className="db-del" onClick={() => setConfirmingDelete(true)}>🗑️ Delete</button>
                </>
              )}
            </div>
          </div>
        );
      })()}

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
                      <div>Toppings: {item.toppings?.length ? toppingsSummaryText(item.toppings) : 'None'} · Syrup: {item.syrups?.length ? item.syrups.join(', ') : 'None'}</div>
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
                    {TOPPINGS.map((tp) => {
                      if (tp.alwaysExtra) {
                        const count = editForm.toppings.filter((x) => x === tp.name).length;
                        if (count > 0) {
                          return (
                            <div key={tp.name} className="chip checked chip-stepper">
                              <span>{tp.name}</span>
                              <div className="mini-stepper">
                                <button type="button" onClick={() => removeEditToppingUnit(tp.name)} aria-label={`Remove one ${tp.name}`}>−</button>
                                <span>{count}</span>
                                <button type="button" onClick={() => addEditToppingUnit(tp.name)} disabled={count >= MAX_EXTRA_TOPPING_QTY} aria-label={`Add one more ${tp.name}`}>+</button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <button key={tp.name} type="button" className="chip" onClick={() => addEditToppingUnit(tp.name)}>
                            <span>{tp.name}</span>
                            <span className="badge">+$1</span>
                          </button>
                        );
                      }
                      return (
                        <label key={tp.name} className={`chip${editForm.toppings.includes(tp.name) ? ' checked' : ''}`}>
                          <input type="checkbox" style={{ display: 'none' }} checked={editForm.toppings.includes(tp.name)} onChange={() => toggleEditTopping(tp.name)} />
                          <span>{tp.name}</span>
                        </label>
                      );
                    })}
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
