import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';

const STR = {
  en: {
    title: 'Reviews — Fresas con Crema',
    heading: 'Reviews',
    sub: 'Tell us what you thought. Your words help other customers and help us get better.',
    loading: 'Loading…',
    none: 'No reviews yet. Be the first!',
    outOf: (n) => `${n} review${n === 1 ? '' : 's'}`,
    leave: 'Leave a review',
    rating: 'Your rating',
    starsLabel: (n) => `${n} star${n === 1 ? '' : 's'}`,
    nameLbl: 'Your name (optional)',
    namePh: 'First name is fine',
    commentLbl: 'Your thoughts',
    commentPh: 'What did you order? How was it?',
    send: 'Send review',
    sending: 'Sending…',
    thanks: 'Thank you! Your review will show up here once we approve it.',
    another: 'Write another',
    pickStars: 'Pick a star rating first.',
    needComment: 'Add a short comment.',
    failed: 'Could not send your review. Please try again.',
    anon: 'A customer',
    needOrderTitle: 'Reviews are for customers who have ordered',
    needOrderBody: 'Place an order with us first, then come back here and tell us what you thought. We would love to hear it!',
    needOrderBtn: 'Place an order',
    alreadyReviewed: 'You already reviewed your last order. Thank you! Place another order to leave a new review.',
  },
  es: {
    title: 'Reseñas — Fresas con Crema',
    heading: 'Reseñas',
    sub: 'Cuéntanos qué te pareció. Tus palabras ayudan a otros clientes y a mejorar.',
    loading: 'Cargando…',
    none: 'Aún no hay reseñas. ¡Sé el primero!',
    outOf: (n) => `${n} reseña${n === 1 ? '' : 's'}`,
    leave: 'Deja una reseña',
    rating: 'Tu calificación',
    starsLabel: (n) => `${n} estrella${n === 1 ? '' : 's'}`,
    nameLbl: 'Tu nombre (opcional)',
    namePh: 'Tu primer nombre está bien',
    commentLbl: 'Tus comentarios',
    commentPh: '¿Qué pediste? ¿Cómo estuvo?',
    send: 'Enviar reseña',
    sending: 'Enviando…',
    thanks: '¡Gracias! Tu reseña aparecerá aquí cuando la aprobemos.',
    another: 'Escribir otra',
    pickStars: 'Primero elige las estrellas.',
    needComment: 'Agrega un comentario corto.',
    failed: 'No se pudo enviar tu reseña. Inténtalo de nuevo.',
    anon: 'Un cliente',
    needOrderTitle: 'Las reseñas son para clientes que ya pidieron',
    needOrderBody: 'Primero haz un pedido con nosotros y luego vuelve aquí para contarnos qué te pareció. ¡Nos encantaría saberlo!',
    needOrderBtn: 'Hacer un pedido',
    alreadyReviewed: 'Ya dejaste una reseña de tu último pedido. ¡Gracias! Haz otro pedido para dejar una nueva reseña.',
  },
};

function Stars({ value, size = '1.1rem' }) {
  return (
    <span className="rv-stars" style={{ fontSize: size }} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? 'on' : ''}>★</span>
      ))}
    </span>
  );
}

export default function Reviews() {
  const [lang, setLang] = useState('en');
  const [data, setData] = useState(null);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  // null = still checking this device; [] = no orders placed from this phone yet
  const [orderIds, setOrderIds] = useState(null);
  const t = STR[lang];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('fresasLang');
      if (saved === 'en' || saved === 'es') setLang(saved);
    } catch (e) {}
    try {
      const ids = JSON.parse(window.localStorage.getItem('fresasOrderIds') || '[]');
      setOrderIds(Array.isArray(ids) ? ids : []);
    } catch (e) {
      setOrderIds([]);
    }
    fetch('/api/reviews')
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => setData({ reviews: [], count: 0, average: 0 }));
  }, []);

  function changeLang(newLang) {
    setLang(newLang);
    try { window.localStorage.setItem('fresasLang', newLang); } catch (e) {}
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!rating) return setError(t.pickStars);
    if (comment.trim().length < 2) return setError(t.needComment);
    setSending(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, name, lang, website, orderIds }),
      });
      if (res.status === 403) { setOrderIds([]); setSending(false); return; }
      if (res.status === 409) { setError(t.alreadyReviewed); setSending(false); return; }
      if (!res.ok) throw new Error('bad');
      setSent(true);
      setRating(0); setName(''); setComment('');
    } catch (err) {
      setError(t.failed);
    }
    setSending(false);
  }

  const reviews = data?.reviews || [];

  return (
    <div className="site-shell fresh-look">
      <Head><title>{t.title}</title></Head>
      <SiteNav lang={lang} onLangChange={changeLang} />
      <main className="site-main">
        <div className="content-pad">
          <h2>{t.heading}</h2>
          <p className="sub">{t.sub}</p>

          {data && data.count > 0 && (
            <div className="rv-summary">
              <span className="rv-avg">{data.average.toFixed(1)}</span>
              <div>
                <Stars value={data.average} size="1.3rem" />
                <div className="rv-count">{t.outOf(data.count)}</div>
              </div>
            </div>
          )}

          <div className="rv-form-card">
            {orderIds !== null && orderIds.length === 0 ? (
              <div className="rv-need-order">
                <h3>{t.needOrderTitle}</h3>
                <p>{t.needOrderBody}</p>
                <Link href="/order" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>🍓 {t.needOrderBtn}</Link>
              </div>
            ) : (
            <>
            <h3>{t.leave}</h3>
            {sent ? (
              <div>
                <p className="rv-thanks">{t.thanks}</p>
                <button type="button" className="btn-outline" onClick={() => setSent(false)}>{t.another}</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="field">
                  <label id="rv-rating-lbl">{t.rating}</label>
                  <div className="rv-picker" role="radiogroup" aria-labelledby="rv-rating-lbl">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={t.starsLabel(n)}
                        className={`rv-star${n <= rating ? ' on' : ''}`}
                        onClick={() => setRating(n)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="rv-name">{t.nameLbl}</label>
                  <input id="rv-name" type="text" value={name} maxLength={40} placeholder={t.namePh} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="rv-comment">{t.commentLbl}</label>
                  <textarea id="rv-comment" value={comment} maxLength={600} placeholder={t.commentPh} onChange={(e) => setComment(e.target.value)} />
                </div>
                {/* Honeypot: hidden from people, bots fill it in. */}
                <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
                {error && <p className="error" role="alert">{error}</p>}
                <button className="btn-primary" type="submit" disabled={sending}>{sending ? t.sending : t.send}</button>
              </form>
            )}
            </>
            )}
          </div>

          {data === null && <p className="hint">{t.loading}</p>}
          {data && reviews.length === 0 && <p className="hint">{t.none}</p>}
          <div className="rv-list">
            {reviews.map((r) => (
              <article key={r.id} className="rv-card">
                <div className="rv-top">
                  <Stars value={r.rating} />
                  <span className="rv-date">{new Date(r.created_at).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <p className="rv-text">{r.comment}</p>
                <div className="rv-who">{r.name || t.anon}</div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
