// Full-screen launch splash shown briefly by _app.js while the app boots.
// Pure presentation — no data fetching, no timing logic here (that lives in
// _app.js so it can coordinate with actual page-load state). `label` lets
// _app.js swap the caption based on which page is actually loading (the
// admin dashboard doesn't have a "menu" to load).
import { useEffect, useState } from 'react';

export default function SplashScreen({ leaving, label = 'LOADING THE MENU' }) {
  // The CSS side (globals.css) sizes .app-splash with "height: 100dvh",
  // which is supposed to always track the real visible viewport height —
  // but on iOS, specifically when this app is running as a standalone
  // home-screen app (added to the home screen, no Safari chrome at all),
  // that unit doesn't reliably resolve to the true screen height. It was
  // consistently coming up short, leaving a strip of the real page exposed
  // at the bottom the whole time the splash was up. Safari tabs (not
  // installed to the home screen) never showed this — only the installed,
  // standalone copy did, which is what points at dvh's standalone-mode
  // handling rather than anything about the gradient or the fade.
  // window.innerHeight doesn't have that problem: it reports the actual
  // visible height in every mode, standalone included. Reading it here and
  // applying it as an inline pixel height sidesteps the CSS unit entirely —
  // inline styles win over the stylesheet, so this simply overrides the
  // dvh value once JS has a real number to use. Before that first effect
  // runs (the very first paint), there's nothing to override yet, so the
  // CSS dvh/vh fallback in globals.css is what's on screen for that
  // instant — harmless, since it's gone within a frame.
  const [vh, setVh] = useState(null);
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return (
    <div
      className={`app-splash${leaving ? ' app-splash-leaving' : ''}`}
      style={vh ? { height: `${vh}px` } : undefined}
      aria-hidden="true"
    >
      <div className="app-splash-ringwrap">
        <div className="app-splash-ring r1" />
        <div className="app-splash-ring r2" />
        <div className="app-splash-ring r3" />
        <div className="app-splash-core">🍓</div>
      </div>
      <div className="app-splash-text">
        Fresas con Crema
        <small>{label}</small>
      </div>
    </div>
  );
}
