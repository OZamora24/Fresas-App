import Link from 'next/link';
import { useRouter } from 'next/router';
import MobileTabBar from './MobileTabBar';

const NAV_ITEMS = [
  { href: '/', icon: '🏠', label: { en: 'Home', es: 'Inicio' } },
  { href: '/order', icon: '🛒', label: { en: 'Order Here', es: 'Ordenar' } },
  { href: '/catering', icon: '🎉', label: { en: 'Catering', es: 'Catering' } },
  { href: '/photos', icon: '📸', label: { en: 'Photos', es: 'Fotos' } },
];

// Shared site navigation: a left sidebar on wide screens; on phones a slim
// brand + language bar on top and the floating bottom tab bar (see
// MobileTabBar). Same breakpoint as the rest of the site's CSS.
export default function SiteNav({ lang = 'en', onLangChange }) {
  const router = useRouter();

  return (
    <>
      <nav className="site-mobile-tabs">
        <div className="site-mobile-brand-row">
          <div className="site-mobile-brand">🍓 Fresas con Crema</div>
        </div>
        {onLangChange && (
          <div className="site-mobile-lang" role="group" aria-label="Language">
            <button
              type="button"
              className={`site-mobile-lang-btn${lang === 'en' ? ' on' : ''}`}
              onClick={() => onLangChange('en')}
              aria-pressed={lang === 'en'}
            >
              {lang === 'en' ? '✓ ' : ''}English
            </button>
            <button
              type="button"
              className={`site-mobile-lang-btn${lang === 'es' ? ' on' : ''}`}
              onClick={() => onLangChange('es')}
              aria-pressed={lang === 'es'}
            >
              {lang === 'es' ? '✓ ' : ''}Español
            </button>
          </div>
        )}
      </nav>
      <MobileTabBar lang={lang} />

      <aside className="site-sidebar">
        <div className="site-sidebar-brand">🍓 Fresas<br />con Crema</div>
        <div className="site-sidebar-sub">Rialto, CA</div>

        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`site-nav-item${router.pathname === item.href ? ' active' : ''}`}
          >
            <span className="site-nav-ic">{item.icon}</span> {item.label[lang] || item.label.en}
          </Link>
        ))}

        {onLangChange && (
          <div className="site-sidebar-lang">
            <button
              type="button"
              className={`site-lang-btn${lang === 'en' ? ' on' : ''}`}
              onClick={() => onLangChange('en')}
            >
              English
            </button>
            <button
              type="button"
              className={`site-lang-btn${lang === 'es' ? ' on' : ''}`}
              onClick={() => onLangChange('es')}
            >
              Español
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
