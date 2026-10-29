import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// "Built by Orlando" back tab.
// Shows only for visitors who arrived from Orlando's portfolio
// (link carries ?ref=bbo, or the referrer is built-by-orlando.app).
// Remembered for the visit (sessionStorage), hidden on owner/admin pages,
// and dismissible. Starts open, then tucks into a small edge tab.
const PORTFOLIO = 'https://built-by-orlando.app/#work';
const KEY = 'bbo_ref';
const PRIVATE = /^\/(admin|arrived|o)(\/|$)/;

export default function BuiltByOrlandoTab() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let flag = null;
    try { flag = sessionStorage.getItem(KEY); } catch {}
    const params = new URLSearchParams(window.location.search);
    const fromRef = params.get('ref') === 'bbo';
    let fromSite = false;
    try { fromSite = /(^|\.)built-by-orlando\.app$/.test(new URL(document.referrer).hostname); } catch {}
    if ((fromRef || fromSite) && flag !== '0') {
      flag = '1';
      try { sessionStorage.setItem(KEY, '1'); } catch {}
    }
    setShow(flag === '1');
    const t = setTimeout(() => setOpen(false), 6000);
    return () => clearTimeout(t);
  }, []);

  if (!show || PRIVATE.test(router.pathname)) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(KEY, '0'); } catch {}
    setShow(false);
  };

  return (
    <div className={`bbo-tab${open ? ' open' : ''}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <a href={PORTFOLIO} className="bbo-link" aria-label="Back to Built by Orlando" onFocus={() => setOpen(true)}>
        <span className="bbo-tile" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" stroke="#141F1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="3.4" />
            <rect x="26" y="9" width="13" height="13" rx="3.4" />
            <rect x="9" y="26" width="13" height="13" rx="3.4" />
            <rect x="26" y="26" width="13" height="13" rx="3.4" fill="#141F1C" />
          </svg>
        </span>
        <span className="bbo-text">
          <small>Back to</small>
          Built by Orlando
        </span>
      </a>
      <button type="button" className="bbo-x" onClick={dismiss} aria-label="Hide this tab">×</button>
      <style jsx>{`
        .bbo-tab {
          position: fixed; left: 0; top: 58%; z-index: 9990;
          display: flex; align-items: center;
          background: #141F1C; color: #F4EFE2;
          border: 1px solid rgba(227,167,61,.55); border-left: 0;
          border-radius: 0 16px 16px 0;
          box-shadow: 0 10px 28px rgba(0,0,0,.35);
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          transform: translateX(0);
          animation: bbo-in .5s cubic-bezier(.2,1.2,.4,1) both;
        }
        @keyframes bbo-in { from { transform: translateX(-110%); } to { transform: translateX(0); } }
        .bbo-link {
          display: flex; align-items: center; gap: 10px;
          min-height: 48px; padding: 6px 8px 6px 8px;
          color: inherit; text-decoration: none;
        }
        .bbo-tile {
          width: 34px; height: 34px; border-radius: 9px; background: #E3A73D;
          display: grid; place-items: center; flex: none;
        }
        .bbo-tile svg { width: 22px; height: 22px; display: block; }
        .bbo-text {
          display: flex; flex-direction: column; line-height: 1.1;
          font-weight: 800; font-size: 14px; letter-spacing: .01em; white-space: nowrap;
          max-width: 0; overflow: hidden; opacity: 0;
          transition: max-width .35s ease, opacity .25s ease;
        }
        .bbo-text small { font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #E3A73D; }
        .bbo-x {
          width: 0; overflow: hidden; opacity: 0; padding: 0;
          min-height: 44px; border: 0; background: transparent; color: #AFC0B9;
          font-size: 20px; line-height: 1; cursor: pointer;
          transition: width .3s ease, opacity .2s ease;
        }
        .open .bbo-text { max-width: 160px; opacity: 1; }
        .open .bbo-x { width: 36px; opacity: 1; }
        .bbo-link:focus-visible, .bbo-x:focus-visible { outline: 2px solid #E3A73D; outline-offset: 2px; border-radius: 10px; }
        @media (prefers-reduced-motion: reduce) {
          .bbo-tab { animation: none; }
          .bbo-text, .bbo-x { transition: none; }
        }
        @media print { .bbo-tab { display: none; } }
      `}</style>
    </div>
  );
}
