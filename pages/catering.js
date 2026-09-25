import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import { formatWeekdaysList } from '../lib/menu';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';

// Fetches the shop settings on the SERVER, before the page is ever sent to
// the browser — so the catering card's real text is already baked into the
// HTML on arrival. This is what actually removes the loading flicker: with
// only a client-side fetch (the old approach), the browser always has to
// paint the page once with nothing there, then again a beat later once the
// request comes back, no matter how that gap is visually covered up.
// Next.js excludes this function (and getSupabaseAdmin, since it's only
// used in here) from the client-side JS bundle automatically.
export async function getServerSideProps() {
  let initialSettings = null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
    if (!error) initialSettings = data;
  } catch (e) {
    // Supabase env vars missing or unreachable — fall back to the
    // client-side fetch below rather than failing the whole page.
  }
  return { props: { initialSettings } };
}

const STR = {
  en: {
    title: 'Catering — Fresas con Crema',
    heading: 'Catering',
    sub: 'Fresas con crema for parties, quinceañeras, and events — made fresh, served your way.',
    availableOn: (days) => `🎉 Available for catering on ${days}`,
    notSetUp: "Catering availability isn't set up yet — text us at (909) 725-2384 to ask about booking an event.",
    seeMore: (link) => (
      <>Want to see more of our work? Check out our {link}, or reach out directly to talk through details for your event.</>
    ),
    photoGallery: 'photo gallery',
    callToBook: 'Call or text to book',
    cartRentalHeading: '🛒 Cart Rental',
    cartRentalText: 'The cart itself is available to rent for the day — $75, serving trays and spoons included.',
  },
  es: {
    title: 'Catering — Fresas con Crema',
    heading: 'Catering',
    sub: 'Fresas con crema para fiestas, quinceañeras, y eventos — preparadas frescas, servidas a tu manera.',
    availableOn: (days) => `🎉 Disponible para catering los ${days}`,
    notSetUp: 'La disponibilidad de catering aún no está configurada — envíanos un mensaje al (909) 725-2384 para preguntar sobre reservar un evento.',
    seeMore: (link) => (
      <>¿Quieres ver más de nuestro trabajo? Mira nuestra {link}, o contáctanos directamente para hablar sobre los detalles de tu evento.</>
    ),
    photoGallery: 'galería de fotos',
    callToBook: 'Llama o envía un mensaje para reservar',
    cartRentalHeading: '🛒 Renta del Carrito',
    cartRentalText: 'El carrito en sí está disponible para rentar por el día — $75, incluye bandejas y cucharas para servir.',
  },
};

export default function Catering({ initialSettings }) {
  const [settings, setSettings] = useState(initialSettings || null);
  const [lang, setLang] = useState('en');
  const t = STR[lang];

  // Only needed as a fallback if the server-side fetch above came back
  // empty (e.g. a transient Supabase hiccup) — normally `settings` is
  // already set from initialSettings and this is a no-op.
  useEffect(() => {
    if (settings) return;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => setSettings(j.settings))
      .catch(() => setSettings({}));
  }, [settings]);

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

  const hasCatering = settings?.catering_days?.length > 0;

  return (
    <div className="site-shell">
      <Head><title>{t.title}</title></Head>
      <SiteNav lang={lang} onLangChange={changeLang} />
      <main className="site-main">
        <div className="content-pad">
          <h2>{t.heading}</h2>
          <p className="sub">{t.sub}</p>

          {!settings && (
            <div className="catering-info-card" aria-hidden="true">
              <div className="skeleton-line skeleton-line--title"></div>
              <div className="skeleton-line skeleton-line--body"></div>
            </div>
          )}

          {settings && hasCatering && (
            <div className="catering-info-card">
              <div className="days">{t.availableOn(formatWeekdaysList(settings.catering_days, lang))}</div>
              {settings.catering_info && <div className="note">{settings.catering_info}</div>}
            </div>
          )}

          {settings && !hasCatering && (
            <div className="catering-info-card">
              <div className="note">{t.notSetUp}</div>
            </div>
          )}

          <div className="catering-info-card">
            <div className="days">{t.cartRentalHeading}</div>
            <div className="note">{t.cartRentalText}</div>
          </div>

          <p style={{ color: 'var(--ink-soft)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 28 }}>
            {t.seeMore(
              <Link href="/photos" style={{ color: 'var(--maroon)', fontWeight: 700 }}>{t.photoGallery}</Link>
            )}
          </p>

          <a href="tel:+19097252384" className="home-btn-primary" style={{ background: 'var(--maroon)', color: 'var(--cream-2)' }}>
            {t.callToBook}
          </a>
        </div>
      </main>
    </div>
  );
}
