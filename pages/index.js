import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import { buildPickupTimes, todayDateKey } from '../lib/menu';

export default function Home() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => setSettings(j.settings))
      .catch(() => setSettings({ is_open: true }));
  }, []);

  const isOpen = settings ? settings.is_open !== false : null;
  const todayTimes = settings ? buildPickupTimes(todayDateKey(), settings) : [];
  const hoursLabel = todayTimes.length > 0
    ? `${todayTimes[0]} – ${todayTimes[todayTimes.length - 1]}`
    : '—';

  return (
    <div className="site-shell">
      <Head><title>Fresas con Crema — Rialto, CA</title></Head>
      <SiteNav />
      <main className="site-main">
        <div className="home-hero">
          {isOpen !== null && (
            <div className="home-status-row">
              <span className={`home-status-badge${isOpen ? '' : ' closed'}`}>
                <span className="home-status-dot"></span> {isOpen ? 'Open now' : 'Closed right now'}
              </span>
            </div>
          )}
          <div className="eyebrow">Rialto, CA · Fresh daily</div>
          <h1>Handmade fresas con crema, made to order.</h1>
          <p className="tagline">Build your cup, pick a pickup time, and we'll have it ready — sweet, fresh, and worth the trip.</p>
          <div className="home-hero-ctas">
            <Link href="/order" className="home-btn-primary">Order Now</Link>
            <Link href="/catering" className="home-btn-ghost">See Catering Info</Link>
          </div>
        </div>

        <div className="home-strip">
          <div className="cell">
            <div className="label">Today's hours</div>
            <div className="val">{hoursLabel}</div>
          </div>
          <div className="cell">
            <div className="label">Follow us</div>
            <div className="val">@lovelyfresitas_</div>
          </div>
          <div className="cell">
            <div className="label">Questions</div>
            <div className="val">(909) 725-2384</div>
          </div>
        </div>

        <div className="home-section">
          <h2>Why customers keep coming back</h2>
          <p>Every cup is built fresh when you order it — homemade sweet cream, real toppings, and flavors like Raffaello, Biscoff, and Ferrero Rocher alongside the classic. Order ahead, pick your time, and skip the wait.</p>
        </div>
      </main>
    </div>
  );
}
