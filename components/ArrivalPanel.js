import { useState, useEffect } from 'react';
import { HOLD_MINUTES, LATE_MINUTE_OPTIONS, heldUntilLabel, addMinutesToTimeLabel } from '../lib/menu';

const STR = {
  en: {
    holdNote: (until) => `Your order is held until ${until}. After that it may be cancelled so we can serve the next customer.`,
    hereTitle: 'Here already?',
    hereBody: "Tap when you arrive and we'll bring it out.",
    hereBtn: "I'm here!",
    hereSending: 'Letting them know…',
    hereDone: "Thanks, they know you're here! Sit tight, your order is on its way out.",
    lateTitle: 'Running late?',
    lateBody: "Tell us how long and we'll hold your order.",
    latePick: 'Choose how late…',
    lateOption: (n) => `${n} minutes`,
    lateBtn: 'Let them know',
    lateSending: 'Sending…',
    lateOk: (until, n) => `Got it! We'll hold your order until ${until} (${n} min late + ${HOLD_MINUTES} min hold). See you soon!`,
    lateChange: 'Need more time?',
    lateChangeBtn: 'Change',
    newTime: (t) => `New arrival time: ${t}`,
    error: 'Something went wrong, please try again in a moment.',
    arrivedLate: "You're all set, we already know you're here.",
  },
  es: {
    holdNote: (until) => `Guardamos tu orden hasta las ${until}. Después podría cancelarse para atender al siguiente cliente.`,
    hereTitle: '¿Ya llegaste?',
    hereBody: 'Toca cuando llegues y te sacamos tu orden.',
    hereBtn: '¡Ya llegué!',
    hereSending: 'Avisando…',
    hereDone: '¡Gracias, ya saben que llegaste! Espera un momento, tu orden va en camino.',
    lateTitle: '¿Vas tarde?',
    lateBody: 'Dinos cuánto y guardamos tu orden.',
    latePick: 'Elige cuánto tiempo…',
    lateOption: (n) => `${n} minutos`,
    lateBtn: 'Avisarles',
    lateSending: 'Enviando…',
    lateOk: (until, n) => `¡Listo! Guardamos tu orden hasta las ${until} (${n} min tarde + ${HOLD_MINUTES} min de espera). ¡Nos vemos pronto!`,
    lateChange: '¿Necesitas más tiempo?',
    lateChangeBtn: 'Cambiar',
    newTime: (t) => `Nueva hora de llegada: ${t}`,
    error: 'Algo salió mal, intenta de nuevo en un momento.',
    arrivedLate: 'Todo listo, ya sabemos que llegaste.',
  },
};

// Shown to a customer who has placed an order, either on the confirmation
// screen (showHere) or on the page opened from the text link. It holds the
// "held until" note, the "I'm here" button and the "Running late?" drop-down.
// Knowing the order id is what lets the customer use it (same as /arrived).
export default function ArrivalPanel({ orderId, pickupTime, lang = 'en', showHere = false, initialLate = 0, initialArrived = false, onArrive }) {
  const t = STR[lang === 'es' ? 'es' : 'en'];
  const [late, setLate] = useState(initialLate || 0);
  const [pick, setPick] = useState('');
  const [editing, setEditing] = useState(false);
  const [lateStatus, setLateStatus] = useState('idle'); // idle | sending | error
  const [hereStatus, setHereStatus] = useState(initialArrived ? 'done' : 'idle'); // idle | sending | done | error

  useEffect(() => { setLate(initialLate || 0); }, [initialLate]);
  useEffect(() => { if (initialArrived) setHereStatus('done'); }, [initialArrived]);

  if (!orderId || !pickupTime) return null;
  const until = heldUntilLabel(pickupTime, late);
  const arrived = hereStatus === 'done';

  async function sendHere() {
    if (hereStatus === 'sending') return;
    setHereStatus('sending');
    try {
      const res = await fetch('/api/orders/arrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId }),
      });
      if (!res.ok) throw new Error('arrive failed');
      setHereStatus('done');
      if (onArrive) onArrive();
    } catch (e) {
      setHereStatus('error');
    }
  }

  async function sendLate() {
    const mins = parseInt(pick, 10);
    if (!mins || lateStatus === 'sending') return;
    setLateStatus('sending');
    try {
      const res = await fetch('/api/orders/late', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, minutes: mins }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setHereStatus('done');
        setLateStatus('idle');
        return;
      }
      if (!res.ok) throw new Error('late failed');
      setLate(mins);
      setEditing(false);
      setLateStatus('idle');
    } catch (e) {
      setLateStatus('error');
    }
  }

  const showLateForm = !late || editing;

  return (
    <div className="arrival-panel">
      {!arrived && (
        <div className="hold-note">
          <span className="hold-note-icon" aria-hidden="true">⏰</span>
          <span>{t.holdNote(until)}</span>
        </div>
      )}

      {showHere && (
        <div className="arrival-card">
          {arrived ? (
            <div className="arrival-ok">🍓 {t.hereDone}</div>
          ) : (
            <>
              <div className="arrival-title">🍓 {t.hereTitle}</div>
              <p className="arrival-body">{t.hereBody}</p>
              <button type="button" className="arrival-here-btn" onClick={sendHere} disabled={hereStatus === 'sending'}>
                {hereStatus === 'sending' ? t.hereSending : t.hereBtn}
              </button>
              {hereStatus === 'error' && <p className="arrival-err">{t.error}</p>}
            </>
          )}
        </div>
      )}

      {!arrived && (
        <div className={`arrival-card${late && !editing ? ' arrival-card-ok' : ''}`}>
          <div className="arrival-title">⏰ {t.lateTitle}</div>
          {showLateForm ? (
            <>
              <p className="arrival-body">{t.lateBody}</p>
              <select
                className="late-select"
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                aria-label={t.lateTitle}
              >
                <option value="">{t.latePick}</option>
                {LATE_MINUTE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{t.lateOption(n)}</option>
                ))}
              </select>
              <button type="button" className="late-go" onClick={sendLate} disabled={!pick || lateStatus === 'sending'}>
                {lateStatus === 'sending' ? t.lateSending : t.lateBtn}
              </button>
              {lateStatus === 'error' && <p className="arrival-err">{t.error}</p>}
            </>
          ) : (
            <>
              <div className="late-ok">✓ {t.lateOk(until, late)}</div>
              <p className="arrival-body" style={{ marginTop: 8 }}>
                {t.newTime(addMinutesToTimeLabel(pickupTime, late))}. {t.lateChange}{' '}
                <button type="button" className="late-change" onClick={() => { setPick(String(late)); setEditing(true); }}>
                  {t.lateChangeBtn}
                </button>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
