import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

const BASES = [
  { id: 'regular', name: 'Regular Fresas', desc: 'Homemade sweet cream + 3 toppings included', price: 7.0, freeToppings: 3 },
  { id: 'raffaello', name: 'Fresas Raffaello', desc: 'White chocolate sweet cream, coconut & almonds + homemade sweet cream', price: 8.0, freeToppings: 0 },
  { id: 'biscoff', name: 'Biscoff Cookie Butter', desc: 'Biscoff cookie butter fresas con crema', price: 8.0, freeToppings: 0 },
  { id: 'ferrero', name: 'Ferrero Rocher', desc: 'Ferrero Rocher fresas con crema', price: 9.0, freeToppings: 0 },
];

const TOPPINGS = [
  { name: 'Whipped Cream' }, { name: 'Fruity Pebbles' }, { name: 'Wafer Cookie' },
  { name: 'Almonds' }, { name: 'Granola' }, { name: 'Oreo' },
  { name: 'Coconut Flakes' }, { name: 'Mini Marshmallows' },
  { name: 'Cheesecake', alwaysExtra: true }, { name: 'Ice Cream', alwaysExtra: true },
];

const SYRUPS = ['Chocolate', 'Caramel', 'Lechera', 'Nutella', 'Strawberry'];
const PICKUP_ADDRESS = '1526 W Bonnie View Dr, Rialto, CA 92376';
const ZELLE_PHONE = '(909) 725-2384';

function buildPickupTimes() {
  const times = [];
  const start = 17 * 60; // 5:00 PM
  const end = 21 * 60; // 9:00 PM
  for (let mins = start; mins <= end; mins += 15) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    times.push(`${h12}:${m.toString().padStart(2, '0')} ${suffix}`);
  }
  return times;
}
const PICKUP_TIMES = buildPickupTimes();

function toppingsCost(baseId, toppings) {
  const base = BASES.find((b) => b.id === baseId);
  const standard = toppings.filter((t) => !TOPPINGS.find((x) => x.name === t)?.alwaysExtra);
  const premiumCount = toppings.length - standard.length;
  let cost = premiumCount * 1;
  const extraStandard = Math.max(0, standard.length - base.freeToppings);
  cost += extraStandard * 1;
  return cost;
}

export default function Home() {
  const [base, setBase] = useState('regular');
  const [toppings, setToppings] = useState([]);
  const [syrups, setSyrups] = useState([]);
  const [qty, setQty] = useState(1);
  const [pickup, setPickup] = useState(PICKUP_TIMES[0]);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [showSheet, setShowSheet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('zelle');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeBase = BASES.find((b) => b.id === base);
  const perCup = activeBase.price + toppingsCost(base, toppings);
  const total = perCup * qty;

  const standardChecked = useMemo(
    () => toppings.filter((t) => !TOPPINGS.find((x) => x.name === t)?.alwaysExtra).length,
    [toppings]
  );

  function toggleTopping(t) {
    setToppings((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }
  function toggleSyrup(s) {
    setSyrups((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function placeOrder() {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base: activeBase.name,
          toppings,
          syrups,
          qty,
          pickup_time: pickup,
          customer_name: name,
          notes,
          total,
          payment_method: paymentMethod,
          payment_confirmed: paymentConfirmed,
        }),
      });
      if (!res.ok) throw new Error('Order failed');
      setSubmitted(true);
    } catch (e) {
      setErrorMsg("Something went wrong sending your order — please try again, or text us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Head><title>Order sent — Fresas con Crema</title></Head>
        <h1 style={{ color: 'var(--maroon)' }}>🍓 Order sent!</h1>
        <p>We got your order for pickup at <strong>{pickup}</strong>. See you soon!</p>
        <p style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>
          Pickup location:<br />{PICKUP_ADDRESS}
        </p>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
          {paymentMethod === 'zelle'
            ? `We'll confirm once your $${total.toFixed(2)} Zelle payment to ${ZELLE_PHONE} comes through.`
            : `Have $${total.toFixed(2)} in cash ready at pickup.`}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Head><title>Fresas con Crema — Build Your Cup</title></Head>
      <div className="hero">
        <h1>Fresas con Crema</h1>
        <p>Build your cup · Rialto, CA</p>
      </div>

      <div className="wrap">
        <div className="section">
          <h2>Pick your base</h2>
          <p className="hint">12 oz cup, includes homemade sweet cream</p>
          {BASES.map((b) => (
            <label key={b.id} className={`base-card${base === b.id ? ' selected' : ''}`}>
              <input type="radio" name="base" checked={base === b.id} onChange={() => setBase(b.id)} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex' }}>
                  <span className="name">{b.name}</span>
                  <span className="price" style={{ marginLeft: 'auto' }}>${b.price.toFixed(2)}</span>
                </div>
                <div className="desc">{b.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="section">
          <h2>Toppings</h2>
          <p className="hint">Cheesecake &amp; Ice Cream are always +$1. Any other extra topping is +$1.</p>
          <div className="chip-grid">
            {TOPPINGS.map((t) => (
              <label key={t.name} className={`chip${toppings.includes(t.name) ? ' checked' : ''}`}>
                <input type="checkbox" style={{ display: 'none' }} checked={toppings.includes(t.name)} onChange={() => toggleTopping(t.name)} />
                <span>{t.name}</span>
                {t.alwaysExtra && <span className="badge">+$1</span>}
              </label>
            ))}
          </div>
          {activeBase.freeToppings > 0 && (
            <div className="free-note">
              {Math.min(standardChecked, activeBase.freeToppings)} of {activeBase.freeToppings} free toppings used
            </div>
          )}
        </div>

        <div className="section">
          <h2>Syrup</h2>
          <p className="hint">Pick as many as you'd like — no extra charge</p>
          <div className="chip-grid">
            {SYRUPS.map((s) => (
              <label key={s} className={`chip${syrups.includes(s) ? ' checked' : ''}`}>
                <input type="checkbox" style={{ display: 'none' }} checked={syrups.includes(s)} onChange={() => toggleSyrup(s)} />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="section">
          <h2>How many cups?</h2>
          <div className="stepper">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
          </div>
        </div>

        <div className="section">
          <h2>Pickup time</h2>
          <p className="hint">Today's pickup window: 5:00 – 9:00 PM</p>
          <div className="field">
            <select value={pickup} onChange={(e) => setPickup(e.target.value)}>
              {PICKUP_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="section">
          <h2>Your info</h2>
          <div className="field">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Who's this order for?" />
          </div>
          <div className="field">
            <label>Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know? Allergies, etc." />
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.85rem', padding: '10px 0 20px' }}>
          Questions? Call or text <a href="tel:+19097252384">(909) 725-2384</a> · <a href="https://instagram.com/lovelyfresitas_" target="_blank" rel="noopener noreferrer">@lovelyfresitas_</a>
        </div>
      </div>

      <div className="sticky-bar">
        <div>
          <div className="total-label">Total</div>
          <div className="total-amt">${total.toFixed(2)}</div>
        </div>
        <button className="btn-primary" onClick={() => setShowSheet(true)} disabled={!name.trim()}>
          Review order
        </button>
      </div>

      <div className={`overlay${showSheet ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && setShowSheet(false)}>
        <div className="sheet">
          <h3>Your order</h3>
          <div className="line"><span>Base</span><strong>{activeBase.name} × {qty}</strong></div>
          <div className="line"><span>Toppings</span><strong>{toppings.length ? toppings.join(', ') : 'None'}</strong></div>
          <div className="line"><span>Syrup</span><strong>{syrups.length ? syrups.join(', ') : 'None'}</strong></div>
          <div className="line"><span>Pickup</span><strong>{pickup}</strong></div>
          <div className="line"><span>Name</span><strong>{name || '—'}</strong></div>
          {notes && <div className="line"><span>Notes</span><strong>{notes}</strong></div>}
          <div className="grand"><span>Total</span><span>${total.toFixed(2)}</span></div>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', fontWeight: 700, marginTop: 4 }}>
            Pickup location: {PICKUP_ADDRESS}
          </p>

          <div className="field" style={{ marginTop: 18 }}>
            <label>Payment</label>
            <div className="chip-grid" style={{ marginBottom: 12 }}>
              <label className={`chip${paymentMethod === 'zelle' ? ' checked' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  style={{ display: 'none' }}
                  checked={paymentMethod === 'zelle'}
                  onChange={() => { setPaymentMethod('zelle'); setPaymentConfirmed(false); }}
                />
                <span>Zelle</span>
              </label>
              <label className={`chip${paymentMethod === 'cash' ? ' checked' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  style={{ display: 'none' }}
                  checked={paymentMethod === 'cash'}
                  onChange={() => { setPaymentMethod('cash'); setPaymentConfirmed(false); }}
                />
                <span>Cash at pickup</span>
              </label>
            </div>

            {paymentMethod === 'zelle' ? (
              <>
                <p style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>
                  Send <strong>${total.toFixed(2)}</strong> via Zelle to <strong>{ZELLE_PHONE}</strong>, and include your name ({name || 'your name'}) in the Zelle note so we can match it to your order.
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
                    checked={paymentConfirmed}
                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  />
                  I've sent ${total.toFixed(2)} via Zelle to {ZELLE_PHONE}
                </label>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>
                  Have <strong>${total.toFixed(2)}</strong> in cash ready when you pick up your order.
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
                    checked={paymentConfirmed}
                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  />
                  I understand I'll pay ${total.toFixed(2)} cash at pickup
                </label>
              </>
            )}
          </div>
          {errorMsg && <p className="login-box error" style={{ margin: '10px 0' }}>{errorMsg}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <button className="btn-primary" onClick={placeOrder} disabled={submitting || !paymentConfirmed}>
              {submitting ? 'Sending…' : paymentConfirmed ? 'Place order' : 'Confirm payment above to continue'}
            </button>
            <button className="status-btn" onClick={() => setShowSheet(false)}>Keep editing</button>
          </div>
        </div>
      </div>
    </div>
  );
}
