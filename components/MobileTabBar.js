import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const PICKUP_MAP_URL = 'https://maps.google.com/?q=1526+W+Bonnie+View+Dr,+Rialto,+CA+92376';

const LABELS = {
  en: { home: 'Home', catering: 'Catering', order: 'Order', photos: 'Photos', pickup: 'Pickup' },
  es: { home: 'Inicio', catering: 'Catering', order: 'Pedir', photos: 'Fotos', pickup: 'Recoger' },
};

// Floating bottom tab bar for phones (hidden on wide screens, where the
// left sidebar does this job): Home · Catering · raised Order 🍓 · Photos ·
// Pickup (opens the shop address in Maps). Adds `has-tabbar` to <body> while
// mounted so the page leaves room for it.
export default function MobileTabBar({ lang = 'en' }) {
  const router = useRouter();
  const t = LABELS[lang] || LABELS.en;
  const path = router.pathname;

  useEffect(() => {
    document.body.classList.add('has-tabbar');
    return () => document.body.classList.remove('has-tabbar');
  }, []);

  const item = (href, icon, label) => (
    <Link href={href} className={`tb-item${path === href ? ' on' : ''}`} aria-current={path === href ? 'page' : undefined}>
      <span className="tb-ic">{icon}</span>
      {label}
    </Link>
  );

  return (
    <nav className="tabbar" aria-label="Main">
      {item('/', '🏠', t.home)}
      {item('/catering', '🎉', t.catering)}
      <Link href="/order" className={`tb-mid${path === '/order' ? ' on' : ''}`} aria-label={t.order}>
        <span className="tb-mid-ic">🍓</span>
        <span className="tb-mid-label">{t.order}</span>
      </Link>
      {item('/photos', '📸', t.photos)}
      <a className="tb-item" href={PICKUP_MAP_URL} target="_blank" rel="noopener noreferrer">
        <span className="tb-ic">📍</span>
        {t.pickup}
      </a>
    </nav>
  );
}
