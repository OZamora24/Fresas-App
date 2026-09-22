import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV_ITEMS = [
  { href: '/', icon: '🏠', label: { en: 'Home', es: 'Inicio' } },
  { href: '/order', icon: '🛒', label: { en: 'Order Here', es: 'Ordenar' } },
  { href: '/catering', icon: '🎉', label: { en: 'Catering', es: 'Catering' } },
  { href: '/photos', icon: '📸', label: { en: 'Photos', es: 'Fotos' } },
];

// Shared site navigation: a left sidebar on wide screens, a horizontal
// pill tab strip on narrow ones (same breakpoint/pattern as the rest of
// the site's CSS, see .site-sidebar / .site-mobile-tabs in globals.css).
export default function SiteNav({ lang = 'en', onLangChange }) {
  const router = useRouter();

  return (
    <>
      <nav className="site-mobile-tabs">
        <div className="site-mobile-brand-row">
          <div className="site-mobile-brand">🍓 Fresas con Crema</div>
          {onLangChange && (
            <div className="site-mobile-lang">
              <button
                type="button"
                className={`site-lang-btn${lang === 'en' ? ' on' : ''}`}
                onClick={() => onLangChange('en')}
              >
                EN
              </button>
              <button
                type="button"
                className={`site-lang-btn${lang === 'es' ? ' on' : ''}`}
                onClick={() => onLangChange('es')}
              >
                ES
              </button>
            </div>
          )}
        </div>
        <div className="site-mobile-chips">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`site-m-chip${router.pathname === item.href ? ' active' : ''}`}
            >
              {item.label[lang] || item.label.en}
            </Link>
          ))}
        </div>
      </nav>

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
