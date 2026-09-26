import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const PICKUP_ADDRESS = '1526 W Bonnie View Dr, Rialto, CA 92376';

const STR = {
  en: {
    title: "Let us know you're here",
    body: "Tap the button below when you arrive — we'll bring your order right out.",
    button: "🍓 I'm here!",
    sending: 'Letting them know…',
    doneTitle: "Thanks — they know you're here!",
    doneBody: 'Sit tight, your order is on its way out.',
    alreadyTitle: "You're all set",
    alreadyBody: "We already know you're here — hang tight!",
    notFoundTitle: "We couldn't find that order",
    notFoundBody: 'This link may have expired. Please call or text us if you need help.',
    errorBody: 'Something went wrong — please try again in a moment.',
    pickupLocation: 'Pickup at:',
  },
  es: {
    title: 'Avísanos que ya llegaste',
    body: 'Toca el botón cuando llegues — te sacaremos tu orden enseguida.',
    button: '🍓 ¡Ya llegué!',
    sending: 'Avisando…',
    doneTitle: '¡Gracias, ya lo saben!',
    doneBody: 'Espera un momento, tu orden va en camino.',
    alreadyTitle: 'Todo listo',
    alreadyBody: 'Ya sabemos que llegaste — espera un momento.',
    notFoundTitle: 'No encontramos esa orden',
    notFoundBody: 'Este enlace pudo haber expirado. Llámanos o escríbenos si necesitas ayuda.',
    errorBody: 'Algo salió mal — intenta de nuevo en un momento.',
    pickupLocation: 'Recoger en:',
  },
};

// Public page — the link texted to a customer after they order. One big
// button, no login: tapping it tells the shop "I'm here" and pushes an
// alert to the admin. Language comes from a ?lang= query param set when
// the link is built (from the order's own saved language), not detection,
// so it's right even if the phone itself is set to a different language.
export default function Arrived() {
  const router = useRouter();
  const { id, lang: langParam } = router.query;
  const lang = langParam === 'es' ? 'es' : 'en';
  const t = STR[lang];

  const [status, setStatus] = useState('idle'); // idle | sending | done | already | not_found | error

  async function markArrived() {
    if (!id || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/orders/arrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 404 || body.error === 'not_found') {
        setStatus('not_found');
      } else if (!res.ok) {
        setStatus('error');
      } else {
        setStatus(body.already ? 'already' : 'done');
      }
    } catch (e) {
      setStatus('error');
    }
  }

  return (
    <div className="wrap" style={{ textAlign: 'center', paddingTop: 80 }}>
      <Head>
        <title>Fresas con Crema</title>
        <meta name="theme-color" content="#7C1B2C" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {(status === 'idle' || status === 'sending' || status === 'error') && (
        <>
          <h1 style={{ color: 'var(--maroon)' }}>🍓 {t.title}</h1>
          <p style={{ color: 'var(--ink-soft)' }}>{t.body}</p>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '18px 34px', fontSize: '1.15rem', marginTop: 20 }}
            onClick={markArrived}
            disabled={status === 'sending' || !id}
          >
            {status === 'sending' ? t.sending : t.button}
          </button>
          {status === 'error' && (
            <p style={{ color: 'var(--maroon)', marginTop: 16, fontWeight: 700 }}>{t.errorBody}</p>
          )}
        </>
      )}

      {status === 'done' && (
        <>
          <h1 style={{ color: 'var(--maroon)' }}>🍓 {t.doneTitle}</h1>
          <p style={{ color: 'var(--ink-soft)' }}>{t.doneBody}</p>
          <p style={{ color: 'var(--ink-soft)', fontWeight: 700, marginTop: 20 }}>
            {t.pickupLocation}<br />{PICKUP_ADDRESS}
          </p>
        </>
      )}

      {status === 'already' && (
        <>
          <h1 style={{ color: 'var(--maroon)' }}>🍓 {t.alreadyTitle}</h1>
          <p style={{ color: 'var(--ink-soft)' }}>{t.alreadyBody}</p>
        </>
      )}

      {status === 'not_found' && (
        <>
          <h1 style={{ color: 'var(--maroon)' }}>{t.notFoundTitle}</h1>
          <p style={{ color: 'var(--ink-soft)' }}>{t.notFoundBody}</p>
        </>
      )}
    </div>
  );
}
