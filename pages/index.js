import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import AddToHomeBanner from '../components/AddToHomeBanner';
import { buildPickupTimes, todayDateKey, nowMinutesInShopTz, timeStringToMinutes } from '../lib/menu';

// Show "Closing soon" instead of "Open now" once we're inside this many
// minutes of today's closing time (weekday and weekend hours can differ,
// but this window applies to whichever one is in effect today).
const CLOSING_SOON_MINUTES = 30;

const STR = {
  en: {
    title: 'Fresas con Crema — Rialto, CA',
    openNow: 'Open now',
    closingSoon: 'Closing soon',
    closedNow: 'Closed right now',
    eyebrow: 'Rialto, CA · Fresh daily',
    heading: 'Handmade fresas con crema, made to order.',
    tagline: "Build your cup, pick a pickup time, and we'll have it ready — sweet, fresh, and worth the trip.",
    orderNow: 'Order Now',
    seeCatering: 'See Catering Info',
    todaysHours: "Today's hours",
    closedToday: 'Closed today',
    followUs: 'Follow us',
    questions: 'Questions',
    whyTitle: 'Why customers keep coming back',
    whyBody: 'Every cup is built fresh when you order it — homemade sweet cream, real toppings, and flavors like Raffaello, Biscoff, and Ferrero Rocher alongside the classic. Order ahead, pick your time, and skip the wait.',
  },
  es: {
    title: 'Fresas con Crema — Rialto, CA',
    openNow: 'Abierto ahora',
    closedNow: 'Cerrado por ahora',
    closingSoon: 'Cerrando pronto',
    eyebrow: 'Rialto, CA · Fresco cada día',
    heading: 'Fresas con crema hechas a mano, preparadas al pedirlas.',
    tagline: 'Arma tu vaso, elige una hora de recogida, y lo tendremos listo — dulce, fresco, y vale la pena.',
    orderNow: 'Ordenar Ahora',
    seeCatering: 'Ver Info de Catering',
    todaysHours: 'Horario de hoy',
    closedToday: 'Cerrado hoy',
    followUs: 'Síguenos',
    questions: 'Preguntas',
    whyTitle: 'Por qué los clientes siguen regresando',
    whyBody: 'Cada vaso se prepara fresco al momento de ordenar — crema dulce casera, toppings reales, y sabores como Raffaello, Biscoff, y Ferrero Rocher junto con el clásico. Ordena con anticipación, elige tu hora, y evita la espera.',
  },
};

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [lang, setLang] = useState('en');
  const t = STR[lang];

  // Remember the customer's language choice across pages (Home, Order,
  // Catering, Photos all share this) — read it on mount, and save it
  // whenever they switch.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('fresasLang');
      if (saved === 'en' || saved === 'es') setLang(saved);
    } catch (e) {
      // localStorage unavailable — just keep the default
    }
  }, []);

  function changeLang(newLang) {
    setLang(newLang);
    try { window.localStorage.setItem('fresasLang', newLang); } catch (e) {}
  }

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => setSettings(j.settings))
      .catch(() => setSettings({ is_open: true }));
  }, []);

  // Re-check every minute so "Open now" flips to "Closing soon" (and
  // eventually to whatever the shop status says after closing) without
  // needing a page reload.
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const isOpen = settings ? settings.is_open !== false : null;
  const todayTimes = settings ? buildPickupTimes(todayDateKey(), settings) : [];
  // A day the shop scheduled as closed in advance (see the admin "Closed
  // days" list) has no pickup slots at all, same as if hours were never
  // set — either way there's nothing to book today. This is checked
  // independently of the manual open/closed switch so a pre-scheduled
  // closure shows correctly even if nobody remembers to flip that switch
  // on the day.
  const closedToday = todayTimes.length === 0;
  const effectivelyOpen = isOpen && !closedToday;
  const hoursLabel = closedToday ? t.closedToday : `${todayTimes[0]} – ${todayTimes[todayTimes.length - 1]}`;

  // Recomputed on every render, including the one triggered by nowTick
  // ticking every minute above — no memoization needed for something this
  // cheap.
  let closingSoon = false;
  if (effectivelyOpen) {
    const closeMinutes = timeStringToMinutes(todayTimes[todayTimes.length - 1]);
    if (closeMinutes !== null) {
      const minutesLeft = closeMinutes - nowMinutesInShopTz();
      closingSoon = minutesLeft >= 0 && minutesLeft <= CLOSING_SOON_MINUTES;
    }
  }

  return (
    <div className="site-shell">
      <Head>
        <title>{t.title}</title>
        <link rel="manifest" href="/manifest-home.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Fresas Con Crema" />
        <meta name="theme-color" content="#7C1B2C" />
      </Head>
      <SiteNav lang={lang} onLangChange={changeLang} />
      <AddToHomeBanner lang={lang} storageKey="fresasA2HSSeen" />
      <main className="site-main">
        <div className="home-hero">
          {isOpen !== null && (
            <div className="home-status-row">
              <span className={`home-status-badge${effectivelyOpen ? (closingSoon ? ' closing-soon' : '') : ' closed'}`}>
                <span className="home-status-dot"></span> {effectivelyOpen ? (closingSoon ? t.closingSoon : t.openNow) : t.closedNow}
              </span>
            </div>
          )}
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>{t.heading}</h1>
          <p className="tagline">{t.tagline}</p>
          <div className="home-hero-ctas">
            <Link href="/order" className="home-btn-primary">{t.orderNow}</Link>
            <Link href="/catering" className="home-btn-ghost">{t.seeCatering}</Link>
          </div>
        </div>

        <div className="home-strip">
          <div className="cell">
            <div className="label">{t.todaysHours}</div>
            <div className="val">{hoursLabel}</div>
          </div>
          <div className="cell">
            <div className="label">{t.followUs}</div>
            <a
              href="https://instagram.com/lovelyfresitas_"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="@lovelyfresitas_ on Instagram"
              className="val"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="4.3" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" />
              </svg>
              @lovelyfresitas_
            </a>
          </div>
          <div className="cell">
            <div className="label">{t.questions}</div>
            <div className="val">(909) 725-2384</div>
          </div>
        </div>

        <div className="home-section">
          <h2>{t.whyTitle}</h2>
          <p>{t.whyBody}</p>
        </div>
      </main>
    </div>
  );
}
