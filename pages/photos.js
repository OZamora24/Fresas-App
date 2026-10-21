import { useEffect, useState } from 'react';
import Head from 'next/head';
import Seo from '../components/Seo';
import Image from 'next/image';
import SiteNav from '../components/SiteNav';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';

// The photo list is fetched on the server and baked into the page, so the
// grid is there on first paint instead of showing "Loading…" and then fetching.
export async function getServerSideProps() {
  let initialPhotos = null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from('site-photos').list('', {
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (!error) {
      initialPhotos = (data || [])
        .filter((f) => f.name && !f.name.startsWith('.'))
        .map((f) => {
          const { data: pub } = supabase.storage.from('site-photos').getPublicUrl(f.name);
          return { path: f.name, url: pub.publicUrl, created_at: f.created_at || null };
        });
    }
  } catch (e) {
    // Supabase unreachable — the client-side fetch below takes over.
  }
  return { props: { initialPhotos } };
}

const STR = {
  en: {
    title: 'Photos — Fresas con Crema',
    seoTitle: 'Photos · Lovely Fresitas Fresas con Crema, Rialto CA',
    seoDesc: 'See our fresas con crema cups, toppings and specials — made fresh to order in Rialto, CA.',
    heading: 'Photos',
    sub: 'A look at our flavors and past orders.',
    loading: 'Loading…',
    none: 'No photos up yet — check back soon!',
    close: 'Close',
  },
  es: {
    title: 'Fotos — Fresas con Crema',
    seoTitle: 'Fotos · Lovely Fresitas Fresas con Crema, Rialto CA',
    seoDesc: 'Mira nuestros vasos de fresas con crema, toppings y especiales — hechos al momento en Rialto, CA.',
    heading: 'Fotos',
    sub: 'Un vistazo a nuestros sabores y órdenes pasadas.',
    loading: 'Cargando…',
    none: 'Aún no hay fotos — ¡vuelve pronto!',
    close: 'Cerrar',
  },
};

export default function Photos({ initialPhotos = null }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [lang, setLang] = useState('en');
  const [openPhoto, setOpenPhoto] = useState(null);
  const t = STR[lang];

  useEffect(() => {
    if (initialPhotos) return;
    fetch('/api/photos')
      .then((r) => r.json())
      .then((j) => setPhotos(j.photos || []))
      .catch(() => setPhotos([]));
  }, []);

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

  // Let the customer close the enlarged photo with the Escape key too,
  // not just by tapping outside it.
  useEffect(() => {
    if (!openPhoto) return;
    function onKey(e) {
      if (e.key === 'Escape') setOpenPhoto(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPhoto]);

  return (
    <div className="site-shell fresh-look">
      <Seo title={t.seoTitle} description={t.seoDesc} path="/photos" lang={lang} />
      <SiteNav lang={lang} onLangChange={changeLang} />
      <main className="site-main">
        <div className="content-pad">
          <h2>{t.heading}</h2>
          <p className="sub">{t.sub}</p>

          {photos === null && <p className="hint">{t.loading}</p>}

          {photos && photos.length === 0 && (
            <p className="hint">{t.none}</p>
          )}

          {photos && photos.length > 0 && (
            <div className="photo-grid">
              {photos.map((p, i) => (
                <Image
                  key={p.path}
                  src={p.url}
                  alt="Fresas con Crema"
                  width={600}
                  height={600}
                  sizes="(max-width: 760px) 50vw, 33vw"
                  quality={70}
                  priority={i < 4}
                  onClick={() => setOpenPhoto(p)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <div
        className={`overlay center-modal lightbox-overlay${openPhoto ? ' open' : ''}`}
        onClick={(e) => e.target === e.currentTarget && setOpenPhoto(null)}
      >
        {openPhoto && (
          <div className="lightbox-inner">
            <button
              type="button"
              className="lightbox-close"
              aria-label={t.close}
              onClick={() => setOpenPhoto(null)}
            >
              ✕
            </button>
            <img src={openPhoto.url} alt="Fresas con Crema" className="lightbox-img" />
          </div>
        )}
      </div>
    </div>
  );
}
