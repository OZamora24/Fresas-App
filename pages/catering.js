import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import { formatWeekdaysList } from '../lib/menu';

export default function Catering() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => setSettings(j.settings))
      .catch(() => setSettings({}));
  }, []);

  const hasCatering = settings?.catering_days?.length > 0;

  return (
    <div className="site-shell">
      <Head><title>Catering — Fresas con Crema</title></Head>
      <SiteNav />
      <main className="site-main">
        <div className="content-pad">
          <h2>Catering</h2>
          <p className="sub">Fresas con crema for parties, quinceañeras, and events — made fresh, served your way.</p>

          {settings && hasCatering && (
            <div className="catering-info-card">
              <div className="days">🎉 Available for catering on {formatWeekdaysList(settings.catering_days, 'en')}</div>
              {settings.catering_info && <div className="note">{settings.catering_info}</div>}
            </div>
          )}

          {settings && !hasCatering && (
            <div className="catering-info-card">
              <div className="note">Catering availability isn't set up yet — text us at (909) 725-2384 to ask about booking an event.</div>
            </div>
          )}

          <p style={{ color: 'var(--ink-soft)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 28 }}>
            Want to see more of our work? Check out our <Link href="/photos" style={{ color: 'var(--maroon)', fontWeight: 700 }}>photo gallery</Link>, or reach out directly to talk through details for your event.
          </p>

          <a href="tel:+19097252384" className="home-btn-primary" style={{ background: 'var(--maroon)', color: 'var(--cream-2)' }}>
            Call or text to book
          </a>
        </div>
      </main>
    </div>
  );
}
