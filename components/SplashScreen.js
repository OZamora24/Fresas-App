// Full-screen launch splash shown briefly by _app.js while the app boots.
// Pure presentation — no data fetching, no timing logic here (that lives in
// _app.js so it can coordinate with actual page-load state). `label` lets
// _app.js swap the caption based on which page is actually loading (the
// admin dashboard doesn't have a "menu" to load).
import { useEffect, useState } from 'react';

// Reads a CSS custom property (in px) off <html> — used below to pull in
// the safe-area inset values that globals.css exposes as --safe-area-top /
// --safe-area-bottom, since raw env() isn't readable from JS directly.
function readRootPx(varName) {
  if (typeof window === 'undefined') return 0;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// Measures the true full screen height as generously as possible. Plain
// window.innerHeight was the first thing tried here, and on paper it
// should already be correct — but on iOS, specifically in this app's
// installed, standalone, home-screen mode (never in a plain Safari tab),
// it was still coming up short by almost exactly the height of the
// status-bar/Dynamic-Island overlay, leaving that strip of the real page
// exposed at the bottom the whole time the splash was up. Rather than
// trust any single number, this takes the tallest of several different
// ways the browser might report "the screen" (innerHeight, the root
// element's own clientHeight, and the physical screen resolution divided
// by pixel ratio, which isn't affected by any viewport reporting quirk at
// all) and then pads that with the safe-area insets on top, so the result
// can only ever end up too generous, never too short. A splash a few
// pixels taller than the screen is invisible — clipped by the edge of the
// device — so there's no real downside to over-covering here.
function measureFullHeight() {
  if (typeof window === 'undefined') return null;
  const candidates = [
    window.innerHeight,
    document.documentElement.clientHeight,
    window.screen && window.devicePixelRatio
      ? window.screen.height / window.devicePixelRatio
      : 0,
  ].filter((n) => Number.isFinite(n) && n > 0);
  if (!candidates.length) return null;
  const base = Math.max(...candidates);
  const safeTop = readRootPx('--safe-area-top');
  const safeBottom = readRootPx('--safe-area-bottom');
  return base + safeTop + safeBottom;
}

export default function SplashScreen({ leaving, label = 'LOADING THE MENU' }) {
  const [vh, setVh] = useState(null);
  useEffect(() => {
    const update = () => setVh(measureFullHeight());
    update();
    // A couple of follow-up measurements shortly after mount, in case iOS
    // hasn't finished settling the real viewport size on the very first
    // read right after a standalone-app launch.
    const t1 = setTimeout(update, 50);
    const t2 = setTimeout(update, 300);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
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
