import { useEffect, useState } from 'react';
import Head from 'next/head';
import SiteNav from '../components/SiteNav';

const STR = {
  en: {
    title: 'Photos — Fresas con Crema',
    heading: 'Photos',
    sub: 'A look at our flavors and past orders.',
    loading: 'Loading…',
    none: 'No photos up yet — check back soon!',
    close: 'Close',
  },
  es: {
    title: 'Fotos — Fresas con Crema',
    heading: 'Fotos',
    sub: 'Un vistazo a nuestros sabores y órdenes pasadas.',
    loading: 'Cargando…',
    none: 'Aún no hay fotos — ¡vuelve pronto!',
    close: 'Cerrar',
  },
};

export default function Photos() {
  const [photos, setPhotos] = useState(null);
  const [lang, setLang] = useState('en');
  const [openPhoto, setOpenPhoto] = useState(null);
  const t = STR[lang];

  useEffect(() => {
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
    <div className="site-shell">
      <Head><title>{t.title}</title></Head>
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
              {photos.map((p) => (
                <img
                  key={p.path}
                  src={p.url}
                  alt="Fresas con Crema"
                  loading="lazy"
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
