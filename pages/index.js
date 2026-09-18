import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { BASES, PRICES, TOPPINGS, SYRUPS, toppingsCost, buildPickupTimes } from '../lib/menu';

const BASE_DESC = {
  regular: {
    en: 'Homemade sweet cream + 3 toppings included',
    es: 'Crema dulce casera + 3 toppings incluidos',
  },
  raffaello: {
    en: 'White chocolate sweet cream, coconut & almonds + homemade sweet cream',
    es: 'Crema dulce de chocolate blanco, coco y almendras + crema dulce casera',
  },
  biscoff: {
    en: 'Biscoff cookie butter fresas con crema',
    es: 'Fresas con crema con mantequilla de galleta Biscoff',
  },
  ferrero: {
    en: 'Ferrero Rocher fresas con crema',
    es: 'Fresas con crema estilo Ferrero Rocher',
  },
  bananapudding: {
    en: 'Banana pudding fresas con crema',
    es: 'Fresas con crema con pudín de plátano',
  },
  gansito: {
    en: 'Gansito fresas con crema',
    es: 'Fresas con crema estilo Gansito',
  },
};

const TOPPING_LABELS = {
  'Whipped Cream': { en: 'Whipped Cream', es: 'Crema Batida' },
  'Fruity Pebbles': { en: 'Fruity Pebbles', es: 'Fruity Pebbles' },
  'Wafer Cookie': { en: 'Wafer Cookie', es: 'Galleta de Barquillo' },
  'Almonds': { en: 'Almonds', es: 'Almendras' },
  'Granola': { en: 'Granola', es: 'Granola' },
  'Oreo': { en: 'Oreo', es: 'Oreo' },
  'Coconut Flakes': { en: 'Coconut Flakes', es: 'Coco Rallado' },
  'Mini Marshmallows': { en: 'Mini Marshmallows', es: 'Bombones Pequeños' },
  'Cheesecake': { en: 'Cheesecake', es: 'Pastel de Queso' },
  'Ice Cream': { en: 'Ice Cream', es: 'Helado' },
};

const SYRUP_LABELS = {
  Chocolate: { en: 'Chocolate', es: 'Chocolate' },
  Caramel: { en: 'Caramel', es: 'Caramelo' },
  Lechera: { en: 'Lechera', es: 'Lechera' },
  Nutella: { en: 'Nutella', es: 'Nutella' },
  Strawberry: { en: 'Strawberry', es: 'Fresa' },
};

const PICKUP_ADDRESS = '1526 W Bonnie View Dr, Rialto, CA 92376';
const ZELLE_PHONE = '(909) 725-2384';

const STR = {
  en: {
    title: 'Fresas con Crema — Build Your Cup',
    heroTag: 'Build your cup · Rialto, CA',
    cupSize: 'Cup size',
    cupSizeHint: 'Choose 12 oz or 24 oz — prices update automatically',
    pickBase: 'Pick your base',
    pickBaseHint: 'Includes homemade sweet cream',
    toppings: 'Toppings',
    toppingsHint: 'Cheesecake & Ice Cream are always +$1. Any other extra topping is +$1.',
    freeNote: (used, total) => `${used} of ${total} free toppings used`,
    syrup: 'Syrup',
    syrupHint: "Pick as many as you'd like — no extra charge",
    howMany: 'How many cups?',
    pickupTime: 'Pickup time',
    pickupHint: "Today's pickup window: 5:00 – 9:00 PM",
    yourInfo: 'Your info',
    name: 'Name',
    namePlaceholder: "Who's this order for?",
    phone: 'Phone number',
    phonePlaceholder: 'In case we have a question about your order',
    notes: 'Notes (optional)',
    notesPlaceholder: 'Anything we should know? Allergies, etc.',
    questions: 'Questions? Call or text',
    total: 'Total',
    reviewOrder: 'Review order',
    yourOrder: 'Your order',
    base: 'Base',
    cupSizeLabel: 'Size',
    pickup: 'Pickup',
    none: 'None',
    payment: 'Payment',
    zelle: 'Zelle',
    cashAtPickup: 'Cash at pickup',
    zelleInstructions: (total, phone, name) =>
      `Send $${total} via Zelle to ${phone}, and include your name (${name}) in the Zelle note so we can match it to your order.`,
    zelleCheckbox: (total, phone) => `I've sent $${total} via Zelle to ${phone}`,
    cashInstructions: (total) => `Have $${total} in cash ready when you pick up your order.`,
    cashCheckbox: (total) => `I understand I'll pay $${total} cash at pickup`,
    yourNamePlaceholder: 'your name',
    keepEditing: 'Keep editing',
    sending: 'Sending…',
    placeOrder: 'Place order',
    confirmPaymentFirst: 'Confirm payment above to continue',
    genericError: "Something went wrong sending your order — please try again, or text us directly.",
    orderSent: '🍓 Order sent!',
    orderSentBody: (pickup) => (
      <>We got your order for pickup at <strong>{pickup}</strong>. See you soon!</>
    ),
    pickupLocation: 'Pickup location:',
    zelleFollowUp: (total, phone) => `We'll confirm once your $${total} Zelle payment to ${phone} comes through.`,
    cashFollowUp: (total) => `Have $${total} in cash ready at pickup.`,
    walnutWarning: '⚠️ Allergy notice: Ferrero Rocher Fresas con Crema contains walnuts.',
    allergyTitle: '🥜 Allergy Notice',
    gotIt: 'Got it',
  },
  es: {
    title: 'Fresas con Crema — Arma tu Vaso',
    heroTag: 'Arma tu vaso · Rialto, CA',
    cupSize: 'Tamaño del vaso',
    cupSizeHint: 'Elige 12 oz o 24 oz — los precios se actualizan automáticamente',
    pickBase: 'Elige tu base',
    pickBaseHint: 'Incluye crema dulce casera',
    toppings: 'Toppings',
    toppingsHint: 'Pastel de queso y helado siempre son +$1. Cualquier otro topping extra es +$1.',
    freeNote: (used, total) => `${used} de ${total} toppings gratis usados`,
    syrup: 'Jarabe',
    syrupHint: 'Elige los que quieras — sin costo extra',
    howMany: '¿Cuántos vasos?',
    pickupTime: 'Hora de recogida',
    pickupHint: 'Horario de recogida de hoy: 5:00 – 9:00 PM',
    yourInfo: 'Tu información',
    name: 'Nombre',
    namePlaceholder: '¿Para quién es esta orden?',
    phone: 'Número de teléfono',
    phonePlaceholder: 'Por si tenemos una pregunta sobre tu orden',
    notes: 'Notas (opcional)',
    notesPlaceholder: '¿Algo que debamos saber? Alergias, etc.',
    questions: 'Preguntas? Llama o envía un mensaje',
    total: 'Total',
    reviewOrder: 'Revisar orden',
    yourOrder: 'Tu orden',
    base: 'Base',
    cupSizeLabel: 'Tamaño',
    pickup: 'Recogida',
    none: 'Ninguno',
    payment: 'Pago',
    zelle: 'Zelle',
    cashAtPickup: 'Efectivo al recoger',
    zelleInstructions: (total, phone, name) =>
      `Envía $${total} por Zelle a ${phone}, e incluye tu nombre (${name}) en la nota de Zelle para poder identificar tu orden.`,
    zelleCheckbox: (total, phone) => `Ya envié $${total} por Zelle a ${phone}`,
    cashInstructions: (total) => `Ten $${total} en efectivo listos cuando recojas tu orden.`,
    cashCheckbox: (total) => `Entiendo que pagaré $${total} en efectivo al recoger`,
    yourNamePlaceholder: 'tu nombre',
    keepEditing: 'Seguir editando',
    sending: 'Enviando…',
    placeOrder: 'Realizar orden',
    confirmPaymentFirst: 'Confirma el pago arriba para continuar',
    genericError: 'Algo salió mal al enviar tu orden — por favor intenta de nuevo, o envíanos un mensaje de texto.',
    orderSent: '🍓 ¡Orden enviada!',
    orderSentBody: (pickup) => (
      <>Recibimos tu orden para recoger a las <strong>{pickup}</strong>. ¡Nos vemos pronto!</>
    ),
    pickupLocation: 'Lugar de recogida:',
    zelleFollowUp: (total, phone) => `Confirmaremos tu orden cuando llegue tu pago de $${total} por Zelle a ${phone}.`,
    cashFollowUp: (total) => `Ten $${total} en efectivo listos al recoger.`,
    walnutWarning: '⚠️ Aviso de alergia: las Fresas con Crema estilo Ferrero Rocher contienen nueces (walnuts).',
    allergyTitle: '🥜 Aviso de Alergia',
    gotIt: 'Entendido',
  },
};

const PICKUP_TIMES = buildPickupTimes();

export default function Home() {
  const [lang, setLang] = useState('en');
  const t = STR[lang];

  const [cupSize, setCupSize] = useState('12');
  const [base, setBase] = useState('regular');
  const [toppings, setToppings] = useState([]);
  const [syrups, setSyrups] = useState([]);
  const [qty, setQty] = useState(1);
  const [pickup, setPickup] = useState(PICKUP_TIMES[0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [showSheet, setShowSheet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('zelle');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showWalnutAlert, setShowWalnutAlert] = useState(false);

  const activeBase = BASES.find((b) => b.id === base);
  const basePrice = PRICES[cupSize][base];
  const perCup = basePrice + toppingsCost(base, toppings);
  const total = perCup * qty;

  const standardChecked = useMemo(
    () => toppings.filter((tp) => !TOPPINGS.find((x) => x.name === tp)?.alwaysExtra).length,
    [toppings]
  );

  // Walnut allergy notice: fires whenever Ferrero Rocher is selected, and
  // again if the cup size changes while it's still selected.
  useEffect(() => {
    if (base === 'ferrero') {
      setShowWalnutAlert(true);
    }
  }, [base, cupSize]);

  function toggleTopping(tp) {
    setToppings((prev) => (prev.includes(tp) ? prev.filter((x) => x !== tp) : [...prev, tp]));
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
          cup_size: `${cupSize} oz`,
          toppings,
          syrups,
          qty,
          pickup_time: pickup,
          customer_name: name,
          customer_phone: phone,
          notes,
          total,
          payment_method: paymentMethod,
          payment_confirmed: paymentConfirmed,
          language: lang,
        }),
      });
      if (!res.ok) throw new Error('Order failed');
      setSubmitted(true);
    } catch (e) {
      setErrorMsg(t.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  const LangToggle = (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
      <button
        type="button"
        onClick={() => setLang('en')}
        className="btn-secondary"
        style={{
          padding: '6px 16px', fontSize: '0.82rem',
          background: lang === 'en' ? 'rgba(255,255,255,0.25)' : 'transparent',
          borderColor: 'rgba(255,255,255,0.5)',
        }}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLang('es')}
        className="btn-secondary"
        style={{
          padding: '6px 16px', fontSize: '0.82rem',
          background: lang === 'es' ? 'rgba(255,255,255,0.25)' : 'transparent',
          borderColor: 'rgba(255,255,255,0.5)',
        }}
      >
        Español
      </button>
    </div>
  );

  if (submitted) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Head><title>{t.orderSent} — Fresas con Crema</title></Head>
        <h1 style={{ color: 'var(--maroon)' }}>{t.orderSent}</h1>
        <p>{t.orderSentBody(pickup)}</p>
        <p style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>
          {t.pickupLocation}<br />{PICKUP_ADDRESS}
        </p>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
          {paymentMethod === 'zelle' ? t.zelleFollowUp(total.toFixed(2), ZELLE_PHONE) : t.cashFollowUp(total.toFixed(2))}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Head><title>{t.title}</title></Head>
      <div className="hero">
        <h1>Fresas con Crema</h1>
        <p>{t.heroTag}</p>
        {LangToggle}
      </div>

      <div className="wrap">
        <div className="section">
          <h2>{t.cupSize}</h2>
          <p className="hint">{t.cupSizeHint}</p>
          <div className="field">
            <select value={cupSize} onChange={(e) => setCupSize(e.target.value)}>
              <option value="12">12 oz</option>
              <option value="24">24 oz</option>
            </select>
          </div>
        </div>

        <div className="section">
          <h2>{t.pickBase}</h2>
          <p className="hint">{t.pickBaseHint}</p>
          {BASES.map((b) => (
            <label key={b.id} className={`base-card${base === b.id ? ' selected' : ''}`}>
              <input type="radio" name="base" checked={base === b.id} onChange={() => setBase(b.id)} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex' }}>
                  <span className="name">{b.name}</span>
                  <span className="price" style={{ marginLeft: 'auto' }}>${PRICES[cupSize][b.id].toFixed(2)}</span>
                </div>
                <div className="desc">{BASE_DESC[b.id][lang]}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="section">
          <h2>{t.toppings}</h2>
          <p className="hint">{t.toppingsHint}</p>
          <div className="chip-grid">
            {TOPPINGS.map((tp) => (
              <label key={tp.name} className={`chip${toppings.includes(tp.name) ? ' checked' : ''}`}>
                <input type="checkbox" style={{ display: 'none' }} checked={toppings.includes(tp.name)} onChange={() => toggleTopping(tp.name)} />
                <span>{TOPPING_LABELS[tp.name][lang]}</span>
                {tp.alwaysExtra && <span className="badge">+$1</span>}
              </label>
            ))}
          </div>
          {activeBase.freeToppings > 0 && (
            <div className="free-note">
              {t.freeNote(Math.min(standardChecked, activeBase.freeToppings), activeBase.freeToppings)}
            </div>
          )}
        </div>

        <div className="section">
          <h2>{t.syrup}</h2>
          <p className="hint">{t.syrupHint}</p>
          <div className="chip-grid">
            {SYRUPS.map((s) => (
              <label key={s} className={`chip${syrups.includes(s) ? ' checked' : ''}`}>
                <input type="checkbox" style={{ display: 'none' }} checked={syrups.includes(s)} onChange={() => toggleSyrup(s)} />
                <span>{SYRUP_LABELS[s][lang]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="section">
          <h2>{t.howMany}</h2>
          <div className="stepper">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
          </div>
        </div>

        <div className="section">
          <h2>{t.pickupTime}</h2>
          <p className="hint">{t.pickupHint}</p>
          <div className="field">
            <select value={pickup} onChange={(e) => setPickup(e.target.value)}>
              {PICKUP_TIMES.map((tm) => <option key={tm} value={tm}>{tm}</option>)}
            </select>
          </div>
        </div>

        <div className="section">
          <h2>{t.yourInfo}</h2>
          <div className="field">
            <label>{t.name}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} />
          </div>
          <div className="field">
            <label>{t.phone}</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder} />
          </div>
          <div className="field">
            <label>{t.notes}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesPlaceholder} />
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.85rem', padding: '10px 0 20px' }}>
          {t.questions} <a href="tel:+19097252384">(909) 725-2384</a> · <a href="https://instagram.com/lovelyfresitas_" target="_blank" rel="noopener noreferrer">@lovelyfresitas_</a>
        </div>
      </div>

      <div className="sticky-bar">
        <div>
          <div className="total-label">{t.total}</div>
          <div className="total-amt">${total.toFixed(2)}</div>
        </div>
        <button className="btn-primary" onClick={() => setShowSheet(true)} disabled={!name.trim()}>
          {t.reviewOrder}
        </button>
      </div>

      <div className={`overlay${showSheet ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && setShowSheet(false)}>
        <div className="sheet">
          <h3>{t.yourOrder}</h3>
          <div className="line"><span>{t.base}</span><strong>{activeBase.name} × {qty}</strong></div>
          <div className="line"><span>{t.cupSizeLabel}</span><strong>{cupSize} oz</strong></div>
          <div className="line"><span>{t.toppings}</span><strong>{toppings.length ? toppings.map((tp) => TOPPING_LABELS[tp][lang]).join(', ') : t.none}</strong></div>
          <div className="line"><span>{t.syrup}</span><strong>{syrups.length ? syrups.map((s) => SYRUP_LABELS[s][lang]).join(', ') : t.none}</strong></div>
          <div className="line"><span>{t.pickup}</span><strong>{pickup}</strong></div>
          <div className="line"><span>{t.name}</span><strong>{name || '—'}</strong></div>
          {phone && <div className="line"><span>{t.phone}</span><strong>{phone}</strong></div>}
          {notes && <div className="line"><span>{t.notes}</span><strong>{notes}</strong></div>}
          <div className="grand"><span>{t.total}</span><span>${total.toFixed(2)}</span></div>

          <div className="field" style={{ marginTop: 18 }}>
            <label>{t.payment}</label>
            <div className="chip-grid" style={{ marginBottom: 12 }}>
              <label className={`chip${paymentMethod === 'zelle' ? ' checked' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  style={{ display: 'none' }}
                  checked={paymentMethod === 'zelle'}
                  onChange={() => { setPaymentMethod('zelle'); setPaymentConfirmed(false); }}
                />
                <span>{t.zelle}</span>
              </label>
              <label className={`chip${paymentMethod === 'cash' ? ' checked' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  style={{ display: 'none' }}
                  checked={paymentMethod === 'cash'}
                  onChange={() => { setPaymentMethod('cash'); setPaymentConfirmed(false); }}
                />
                <span>{t.cashAtPickup}</span>
              </label>
            </div>

            {paymentMethod === 'zelle' ? (
              <>
                <p style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>
                  {t.zelleInstructions(total.toFixed(2), ZELLE_PHONE, name || t.yourNamePlaceholder)}
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
                    checked={paymentConfirmed}
                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  />
                  {t.zelleCheckbox(total.toFixed(2), ZELLE_PHONE)}
                </label>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>
                  {t.cashInstructions(total.toFixed(2))}
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
                    checked={paymentConfirmed}
                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  />
                  {t.cashCheckbox(total.toFixed(2))}
                </label>
              </>
            )}
          </div>
          {errorMsg && <p className="login-box error" style={{ margin: '10px 0' }}>{errorMsg}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <button className="btn-primary" onClick={placeOrder} disabled={submitting || !paymentConfirmed}>
              {submitting ? t.sending : paymentConfirmed ? t.placeOrder : t.confirmPaymentFirst}
            </button>
            <button className="status-btn" onClick={() => setShowSheet(false)}>{t.keepEditing}</button>
          </div>
        </div>
      </div>
      <div className={`overlay center-modal${showWalnutAlert ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && setShowWalnutAlert(false)}>
        <div className="sheet center-card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: 10 }}>{t.allergyTitle}</h3>
          <p style={{ fontSize: '0.96rem' }}>{t.walnutWarning.replace('⚠️ ', '')}</p>
          <button className="btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={() => setShowWalnutAlert(false)}>
            {t.gotIt}
          </button>
        </div>
      </div>
    </div>
  );
}
