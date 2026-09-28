// Full-screen launch splash shown briefly by _app.js while the app boots.
// Pure presentation — no data fetching, no timing logic here (that lives in
// _app.js so it can coordinate with actual page-load state). `label` lets
// _app.js swap the caption based on which page is actually loading (the
// admin dashboard doesn't have a "menu" to load).
import { useLayoutEffect, useState } from 'react';

// Reads a CSS custom property (in px) off <html> — used below to pull in
// the safe-area inset values that globals.css exposes as --safe-area-top /
// --safe-area-bottom, since raw env() isn't readable from JS directly.
function readRootPx(varName) {
  if (typeof window === 'undefined') return 0;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// Measures the true full screen height as generously as possible. The
// debug readout that briefly lived here confirmed the actual cause: on
// Orlando's installed, standalone, home-screen iOS app, window.innerHeight
// only covers the space below the status-bar/Dynamic-Island overlay —
// screen.height is the one number that already reports the true full
// screen. Taking the tallest of all three and adding the safe-area insets
// on top means the result can only ever end up too generous, never too
// short — a splash a few pixels taller than the screen is invisible,
// clipped by the edge of the device, so there's no downside to
// over-covering here.
function measureFullHeight() {
  if (typeof window === 'undefined') return null;
  const candidates = [
    window.innerHeight,
    document.documentElement.clientHeight,
    window.screen ? window.screen.height : 0,
  ].filter((n) => Number.isFinite(n) && n > 0);
  if (!candidates.length) return null;
  const base = Math.max(...candidates);
  const safeTop = readRootPx('--safe-area-top');
  const safeBottom = readRootPx('--safe-area-bottom');
  return base + safeTop + safeBottom;
}

export default function SplashScreen({ leaving, label = 'LOADING THE MENU' }) {
  const [vh, setVh] = useState(null);
  // useLayoutEffect (not useEffect) is what actually closes this out: it
  // runs after React updates the DOM but before the browser paints, so the
  // corrected height is what's on screen from the very first frame. With
  // plain useEffect, that first frame briefly painted using the CSS
  // fallback (the same unreliable dvh value) before this ran a moment
  // later and corrected it — a real, if brief, flash of the gap each time,
  // which is the "flinch" Orlando kept seeing even after the sustained gap
  // itself was fixed.
  useLayoutEffect(() => {
    const update = () => setVh(measureFullHeight());
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
