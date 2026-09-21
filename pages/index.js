import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { BASES, PRICES, TOPPINGS, SYRUPS, toppingsCost, todayDateKey, maxPreorderDateKey, formatDateKey, getAvailablePickupTimes, buildPickupTimes, formatWeekdaysList } from '../lib/menu';

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

// Banana Pudding and Gansito cups come with a flavored rim around the top
// of the cup (like a michelada rim) — separate from the toppings/syrup
// selected inside. Shown as a heads-up popup when that flavor is picked.
const RIM_INFO = {
  bananapudding: {
    en: 'This cup comes with a lechera & crushed Nilla wafer rim.',
    es: 'Este vaso viene con un borde de lechera y galleta Nilla triturada.',
  },
  gansito: {
    en: 'This cup comes with a Nutella & chocolate sprinkle rim.',
    es: 'Este vaso viene con un borde de Nutella y chispas de chocolate.',
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

// Formats digits as the customer types into (xxx) xxx-xxxx, so the area
// code is always easy to spot. Keeps just the first 10 digits typed —
// extra characters (letters, extra digits) are dropped rather than
// blocking input.
function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const STR = {
  en: {
    title: 'Fresas con Crema — Build Your Cup',
    heroTag: 'Build your cup · Rialto, CA',
    cupSize: 'Cup size',
    cupSizeHint: 'Choose 12 oz or 24 oz — prices update automatically',
    pickBase: 'Pick your base',
    pickBaseHint: 'Includes homemade sweet cream',
    soldOut: 'Sold out today',
    toppings: 'Toppings',
    toppingsHint: 'Cheesecake & Ice Cream are always +$1. Any other extra topping is +$1.',
    freeNote: (used, total) => `${used} of ${total} free toppings used`,
    syrup: 'Syrup',
    syrupHint: "Pick as many as you'd like — no extra charge",
    howMany: 'How many cups?',
    pickupTime: 'Pickup time',
    pickupHint: (dateLabel, start, end) => `${dateLabel} pickup window: ${start} – ${end}`,
    noTimesToday: "No more pickup times available today — please choose another date.",
    pickupDateLabel: 'Pickup date',
    pickupDateHint: 'Order for today, or pick a future date.',
    cateringTitle: '🎉 Catering',
    cateringAvailable: (days) => `Available for catering on ${days}.`,
    yourInfo: 'Your info',
    name: 'Name',
    namePlaceholder: "Who's this order for?",
    phone: 'Phone number',
    phonePlaceholder: 'Optional',
    phoneHint: "We'll text you when your order is ready for pickup. Msg & data rates may apply.",
    repeatTitle: 'Want one of your recent orders again?',
    repeatUse: 'Use this order',
    repeatDismiss: 'No thanks',
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
    autoReturn: (secs) => `Returning to the order page in ${secs}s…`,
    walnutWarning: '⚠️ Allergy notice: Ferrero Rocher Fresas con Crema contains walnuts.',
    allergyTitle: '🥜 Allergy Notice',
    rimTitle: '🥤 Heads Up!',
    rimPrompt: 'Would you like the rim on your cup?',
    rimSpillWarning: '⚠️ Cups with the rim come without a lid.',
    rimLabel: 'Cup rim',
    rimYes: 'Yes, add it',
    rimNo: 'No, skip it',
    gotIt: 'Got it',
    closedTitle: "We're closed right now",
    closedDefault: "We're not taking orders right now — please check back soon!",
    closedReopensAt: (when) => `We'll be back ${when}!`,
    fullSuffix: ' (FULL)',
    almostFullSuffix: ' (1 spot left)',
  },
  es: {
    title: 'Fresas con Crema — Arma tu Vaso',
    heroTag: 'Arma tu vaso · Rialto, CA',
    cupSize: 'Tamaño del vaso',
    cupSizeHint: 'Elige 12 oz o 24 oz — los precios se actualizan automáticamente',
    pickBase: 'Elige tu base',
    pickBaseHint: 'Incluye crema dulce casera',
    soldOut: 'Agotado hoy',
    toppings: 'Toppings',
    toppingsHint: 'Pastel de queso y helado siempre son +$1. Cualquier otro topping extra es +$1.',
    freeNote: (used, total) => `${used} de ${total} toppings gratis usados`,
    syrup: 'Jarabe',
    syrupHint: 'Elige los que quieras — sin costo extra',
    howMany: '¿Cuántos vasos?',
    pickupTime: 'Hora de recogida',
    pickupHint: (dateLabel, start, end) => `Horario de recogida (${dateLabel}): ${start} – ${end}`,
    noTimesToday: 'Ya no hay horarios de recogida disponibles hoy — elige otra fecha.',
    pickupDateLabel: 'Fecha de recogida',
    pickupDateHint: 'Ordena para hoy, o elige una fecha futura.',
    cateringTitle: '🎉 Catering',
    cateringAvailable: (days) => `Disponible para catering los ${days}.`,
    yourInfo: 'Tu información',
    name: 'Nombre',
    namePlaceholder: '¿Para quién es esta orden?',
    phone: 'Número de teléfono',
    phonePlaceholder: 'Opcional',
    phoneHint: 'Te enviaremos un mensaje de texto cuando tu orden esté lista para recoger. Aplican tarifas de mensajes y datos.',
    repeatTitle: '¿Quieres pedir uno de tus pedidos recientes?',
    repeatUse: 'Usar esta orden',
    repeatDismiss: 'No, gracias',
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
    autoReturn: (secs) => `Volviendo a la página de orden en ${secs}s…`,
    walnutWarning: '⚠️ Aviso de alergia: las Fresas con Crema estilo Ferrero Rocher contienen nueces (walnuts).',
    allergyTitle: '🥜 Aviso de Alergia',
    rimTitle: '🥤 ¡Aviso!',
    rimPrompt: '¿Quieres el borde en tu vaso?',
    rimSpillWarning: '⚠️ Los vasos con borde no llevan tapa.',
    rimLabel: 'Borde del vaso',
    rimYes: 'Sí, agrégalo',
    rimNo: 'No, sin borde',
    gotIt: 'Entendido',
    closedTitle: 'Estamos cerrados por ahora',
    closedDefault: 'No estamos tomando órdenes en este momento — ¡vuelve pronto!',
    closedReopensAt: (when) => `¡Regresamos ${when}!`,
    fullSuffix: ' (LLENO)',
    almostFullSuffix: ' (queda 1 lugar)',
  },
};

export default function Home() {
  const [lang, setLang] = useState('en');
  const t = STR[lang];

  const [cupSize, setCupSize] = useState('12');
  const [base, setBase] = useState('regular');
  const [toppings, setToppings] = useState([]);
  const [syrups, setSyrups] = useState([]);
  const [qty, setQty] = useState(1);
  const [pickupDate, setPickupDate] = useState(todayDateKey());
  const [pickup, setPickup] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [showSheet, setShowSheet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('zelle');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showWalnutAlert, setShowWalnutAlert] = useState(false);
  const [showRimAlert, setShowRimAlert] = useState(false);
  const [includeRim, setIncludeRim] = useState(true);
  const [shopStatus, setShopStatus] = useState(null); // null = still checking
  const [slotCounts, setSlotCounts] = useState({});
  const [slotLimit, setSlotLimit] = useState(3);
  const [pastOrders, setPastOrders] = useState([]);
  const [showRepeatPrompt, setShowRepeatPrompt] = useState(false);
  const [repeatDismissed, setRepeatDismissed] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  // Re-check which pickup times are still bookable once a minute, so a
  // slot that just passed disappears from the list on its own.
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Once an order is confirmed, count down 2 minutes then reload back to a
  // fresh order form — so a phone left open on the confirmation screen
  // doesn't just sit there indefinitely.
  useEffect(() => {
    if (!submitted) return;
    setRedirectSeconds(120);
    const id = setInterval(() => {
      setRedirectSeconds((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [submitted]);

  useEffect(() => {
    if (redirectSeconds === 0) {
      window.location.reload();
    }
  }, [redirectSeconds]);

  const availableTimes = useMemo(
    () => getAvailablePickupTimes(pickupDate, shopStatus),
    [pickupDate, nowTick, shopStatus]
  );

  // Keep the selected time valid: default to the first bookable slot, and
  // bump off of one that just passed while the page was open.
  useEffect(() => {
    if (availableTimes.length === 0) {
      setPickup('');
    } else if (!availableTimes.includes(pickup)) {
      setPickup(availableTimes[0]);
    }
  }, [availableTimes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => setShopStatus(j.settings))
      .catch(() => setShopStatus({ is_open: true }));
  }, []);

  // If the currently selected flavor gets marked sold out, switch to the
  // first flavor that's still available.
  useEffect(() => {
    if (!shopStatus?.sold_out_flavors?.includes(base)) return;
    const available = BASES.find((b) => !shopStatus.sold_out_flavors.includes(b.id));
    if (available) setBase(available.id);
  }, [shopStatus, base]);

  // Drop any selected toppings/syrups that get marked sold out mid-session.
  useEffect(() => {
    if (!shopStatus) return;
    if (shopStatus.sold_out_toppings?.length) {
      setToppings((prev) => prev.filter((t) => !shopStatus.sold_out_toppings.includes(t)));
    }
    if (shopStatus.sold_out_syrups?.length) {
      setSyrups((prev) => prev.filter((s) => !shopStatus.sold_out_syrups.includes(s)));
    }
  }, [shopStatus]);

  // Reload slot availability whenever the customer changes the pickup date.
  useEffect(() => {
    fetch(`/api/slots?date=${pickupDate}`)
      .then((r) => r.json())
      .then((j) => {
        setSlotCounts(j.counts || {});
        setSlotLimit(j.slotLimit ?? 3);
      })
      .catch(() => {});
  }, [pickupDate]);

  // Repeat-customer lookup: once the phone number looks complete (10+
  // digits), check if this number has ordered before and offer up to 5
  // of their past distinct orders to quickly reorder from.
  useEffect(() => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || repeatDismissed) {
      setShowRepeatPrompt(false);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/last-order?phone=${digits}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.orders?.length) {
            setPastOrders(j.orders);
            setShowRepeatPrompt(true);
          }
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(handle);
  }, [phone, repeatDismissed]);

  function useLastOrder(order) {
    if (!order) return;
    const matchedBase = BASES.find((b) => b.name === order.base);
    if (matchedBase) setBase(matchedBase.id);
    if (order.cup_size) setCupSize(order.cup_size.startsWith('24') ? '24' : '12');
    setToppings(order.toppings || []);
    setSyrups(order.syrups || []);
    if (order.payment_method) setPaymentMethod(order.payment_method);
    setShowRepeatPrompt(false);
  }

  const activeBase = BASES.find((b) => b.id === base);
  const isRimFlavor = base === 'bananapudding' || base === 'gansito';
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

  // Rim notice: Banana Pudding and Gansito cups come with a flavored rim
  // around the top (like a michelada) — separate, non-allergy heads-up
  // that also lets the customer opt out of the rim. Defaults to "yes" and
  // re-prompts if the cup size changes while the flavor is still selected.
  useEffect(() => {
    if (base === 'bananapudding' || base === 'gansito') {
      setIncludeRim(true);
      setShowRimAlert(true);
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
          pickup_date: pickupDate,
          pickup_time: pickup,
          customer_name: name,
          customer_phone: phone,
          notes,
          total,
          include_rim: isRimFlavor ? includeRim : true,
          payment_method: paymentMethod,
          payment_confirmed: paymentConfirmed,
          language: lang,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === 'closed') {
          setShopStatus({ is_open: false, closed_message: body.message });
        } else if (body.error === 'slot_full') {
          setErrorMsg(body.message || t.genericError);
          fetch(`/api/slots?date=${pickupDate}`).then((r) => r.json()).then((j) => setSlotCounts(j.counts || {})).catch(() => {});
        } else if (body.error === 'sold_out') {
          setErrorMsg(body.message || t.genericError);
          fetch('/api/settings').then((r) => r.json()).then((j) => setShopStatus(j.settings)).catch(() => {});
        } else if (body.error === 'time_passed') {
          setErrorMsg(body.message || t.genericError);
          setNowTick((n) => n + 1); // forces availableTimes to recompute and drop the stale slot
        } else {
          setErrorMsg(t.genericError);
        }
        return;
      }
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

  if (shopStatus && shopStatus.is_open === false) {
    const reopensDate = shopStatus.reopens_at ? new Date(shopStatus.reopens_at) : null;
    const reopensLabel = reopensDate
      ? reopensDate.toLocaleString(lang === 'es' ? 'es-US' : 'en-US', {
          weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })
      : null;
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Head><title>{t.closedTitle} — Fresas con Crema</title></Head>
        <h1 style={{ color: 'var(--maroon)' }}>🍓 {t.closedTitle}</h1>
        <p>{shopStatus.closed_message || t.closedDefault}</p>
        {reopensLabel && (
          <p style={{ color: 'var(--maroon)', fontWeight: 700 }}>{t.closedReopensAt(reopensLabel)}</p>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Head><title>{t.orderSent} — Fresas con Crema</title></Head>
        <h1 style={{ color: 'var(--maroon)' }}>{t.orderSent}</h1>
        <p>{t.orderSentBody(pickup)}</p>
        <p style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>
          {formatDateKey(pickupDate, lang)}
        </p>
        <p style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>
          {t.pickupLocation}<br />{PICKUP_ADDRESS}
        </p>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
          {paymentMethod === 'zelle' ? t.zelleFollowUp(total.toFixed(2), ZELLE_PHONE) : t.cashFollowUp(total.toFixed(2))}
        </p>
        {redirectSeconds !== null && (
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.78rem', marginTop: 20 }}>
            {t.autoReturn(redirectSeconds)}
          </p>
        )}
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
          {BASES.map((b) => {
            const isSoldOut = (shopStatus?.sold_out_flavors || []).includes(b.id);
            return (
              <label
                key={b.id}
                className={`base-card${base === b.id ? ' selected' : ''}`}
                style={isSoldOut ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                <input type="radio" name="base" checked={base === b.id} disabled={isSoldOut} onChange={() => setBase(b.id)} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex' }}>
                    <span className="name">{b.name}</span>
                    <span className="price" style={{ marginLeft: 'auto' }}>
                      {isSoldOut ? t.soldOut : `$${PRICES[cupSize][b.id].toFixed(2)}`}
                    </span>
                  </div>
                  <div className="desc">{BASE_DESC[b.id][lang]}</div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="section">
          <h2>{t.toppings}</h2>
          <p className="hint">{t.toppingsHint}</p>
          <div className="chip-grid">
            {TOPPINGS.map((tp) => {
              const isSoldOut = (shopStatus?.sold_out_toppings || []).includes(tp.name);
              return (
                <label
                  key={tp.name}
                  className={`chip${toppings.includes(tp.name) ? ' checked' : ''}`}
                  style={isSoldOut ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                >
                  <input type="checkbox" style={{ display: 'none' }} checked={toppings.includes(tp.name)} disabled={isSoldOut} onChange={() => toggleTopping(tp.name)} />
                  <span>{TOPPING_LABELS[tp.name][lang]}</span>
                  {isSoldOut ? <span className="badge">{t.soldOut}</span> : tp.alwaysExtra && <span className="badge">+$1</span>}
                </label>
              );
            })}
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
            {SYRUPS.map((s) => {
              const isSoldOut = (shopStatus?.sold_out_syrups || []).includes(s);
              return (
                <label
                  key={s}
                  className={`chip${syrups.includes(s) ? ' checked' : ''}`}
                  style={isSoldOut ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                >
                  <input type="checkbox" style={{ display: 'none' }} checked={syrups.includes(s)} disabled={isSoldOut} onChange={() => toggleSyrup(s)} />
                  <span>{SYRUP_LABELS[s][lang]}</span>
                  {isSoldOut && <span className="badge">{t.soldOut}</span>}
                </label>
              );
            })}
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
          <h2>{t.pickupDateLabel}</h2>
          <p className="hint">{t.pickupDateHint}</p>
          <div className="field">
            <input
              type="date"
              value={pickupDate}
              min={todayDateKey()}
              max={maxPreorderDateKey()}
              onChange={(e) => setPickupDate(e.target.value)}
            />
          </div>
        </div>

        {shopStatus?.catering_days?.length > 0 && (
          <div className="section">
            <div className="order-card" style={{ background: 'var(--pink-pale)' }}>
              <h2 style={{ marginBottom: 6 }}>{t.cateringTitle}</h2>
              <p style={{ margin: 0, fontWeight: 700 }}>
                {t.cateringAvailable(formatWeekdaysList(shopStatus.catering_days, lang))}
              </p>
              {shopStatus.catering_info && (
                <p style={{ margin: '8px 0 0', color: 'var(--ink-soft)', fontSize: '0.92rem' }}>
                  {shopStatus.catering_info}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="section">
          <h2>{t.pickupTime}</h2>
          {(() => {
            const dayTimes = buildPickupTimes(pickupDate, shopStatus);
            return dayTimes.length > 0 ? (
              <p className="hint">{t.pickupHint(formatDateKey(pickupDate, lang), dayTimes[0], dayTimes[dayTimes.length - 1])}</p>
            ) : null;
          })()}
          {availableTimes.length === 0 ? (
            <p className="free-note">{t.noTimesToday}</p>
          ) : (
            <div className="field">
              <select value={pickup} onChange={(e) => setPickup(e.target.value)}>
                {availableTimes.map((tm) => {
                  const isFull = (slotCounts[tm] || 0) >= slotLimit;
                  const isAlmostFull = !isFull && slotLimit - (slotCounts[tm] || 0) === 1;
                  return (
                    <option key={tm} value={tm} disabled={isFull}>
                      {tm}{isFull ? t.fullSuffix : isAlmostFull ? t.almostFullSuffix : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        <div className="section">
          <h2>{t.yourInfo}</h2>
          <div className="field">
            <label>{t.name}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} />
          </div>
          <div className="field">
            <label>{t.phone}</label>
            <input type="tel" value={phone} onChange={(e) => { setPhone(formatPhoneInput(e.target.value)); setRepeatDismissed(false); }} placeholder={t.phonePlaceholder} />
            <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>{t.phoneHint}</p>
          </div>
          {showRepeatPrompt && pastOrders.length > 0 && (
            <div className="free-note" style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginBottom: 14 }}>
              <div style={{ marginBottom: 8 }}>{t.repeatTitle}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {pastOrders.map((o, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: '8px 10px', borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem' }}>
                      <strong>{o.base}</strong>{o.cup_size ? ` (${o.cup_size})` : ''}
                      {o.toppings?.length ? ` · ${o.toppings.join(', ')}` : ''}
                    </div>
                    <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', flexShrink: 0 }} onClick={() => useLastOrder(o)}>
                      {t.repeatUse}
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="status-btn"
                style={{ padding: '8px 14px', fontSize: '0.85rem', marginTop: 10 }}
                onClick={() => { setShowRepeatPrompt(false); setRepeatDismissed(true); }}
              >
                {t.repeatDismiss}
              </button>
            </div>
          )}
          <div className="field">
            <label>{t.notes}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesPlaceholder} />
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '14px 0 20px' }}>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', margin: '0 0 10px' }}>{t.questions}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 22 }}>
            <a
              href="tel:+19097252384"
              aria-label="Call or text (909) 725-2384"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--maroon)', textDecoration: 'none' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.2 1L6.6 10.8z"
                  fill="currentColor"
                />
              </svg>
              <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>(909) 725-2384</span>
            </a>
            <a
              href="https://instagram.com/lovelyfresitas_"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="@lovelyfresitas_ on Instagram"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--maroon)', textDecoration: 'none' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="4.3" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" />
              </svg>
              <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>@lovelyfresitas_</span>
            </a>
          </div>
        </div>
      </div>

      <div className="sticky-bar">
        <div>
          <div className="total-label">{t.total}</div>
          <div className="total-amt">${total.toFixed(2)}</div>
        </div>
        <button className="btn-primary" onClick={() => setShowSheet(true)} disabled={!name.trim() || !pickup}>
          {t.reviewOrder}
        </button>
      </div>

      <div className={`overlay${showSheet ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && setShowSheet(false)}>
        <div className="sheet">
          <h3>{t.yourOrder}</h3>
          <div className="line"><span>{t.base}</span><strong>{activeBase.name} × {qty}</strong></div>
          <div className="line"><span>{t.cupSizeLabel}</span><strong>{cupSize} oz</strong></div>
          {isRimFlavor && (
            <div className="line"><span>{t.rimLabel}</span><strong>{includeRim ? t.rimYes : t.rimNo}</strong></div>
          )}
          <div className="line"><span>{t.toppings}</span><strong>{toppings.length ? toppings.map((tp) => TOPPING_LABELS[tp][lang]).join(', ') : t.none}</strong></div>
          <div className="line"><span>{t.syrup}</span><strong>{syrups.length ? syrups.map((s) => SYRUP_LABELS[s][lang]).join(', ') : t.none}</strong></div>
          <div className="line"><span>{t.pickup}</span><strong>{formatDateKey(pickupDate, lang)}, {pickup}</strong></div>
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
      <div className={`overlay center-modal${showRimAlert ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && setShowRimAlert(false)}>
        <div className="sheet center-card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: 10 }}>{t.rimTitle}</h3>
          <p style={{ fontSize: '0.96rem', marginBottom: 4 }}>{RIM_INFO[base]?.[lang]}</p>
          <p style={{ fontSize: '0.86rem', color: 'var(--ink-soft)', marginBottom: 10 }}>{t.rimSpillWarning}</p>
          <p style={{ fontSize: '0.96rem', fontWeight: 700 }}>{t.rimPrompt}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            <button className="btn-primary" onClick={() => { setIncludeRim(true); setShowRimAlert(false); }}>
              {t.rimYes}
            </button>
            <button className="status-btn" onClick={() => { setIncludeRim(false); setShowRimAlert(false); }}>
              {t.rimNo}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
