// Full-screen launch splash shown briefly by _app.js while the app boots.
// Pure presentation — no data fetching, no timing logic here (that lives in
// _app.js so it can coordinate with actual page-load state). `label` lets
// _app.js swap the caption based on which page is actually loading (the
// admin dashboard doesn't have a "menu" to load).
import { useEffect, useRef, useState } from 'react';

// Reads a CSS custom property (in px) off <html> — used below to pull in
// the safe-area inset values that globals.css exposes as --safe-area-top /
// --safe-area-bottom, since raw env() isn't readable from JS directly.
function readRootPx(varName) {
  if (typeof window === 'undefined') return 0;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

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

// TEMPORARY — diagnostic only. Three straight attempts at fixing the splash
// not covering the full screen on Orlando's installed iOS app (dvh, plain
// innerHeight, then this generous multi-source measurement) have all
// produced the exact same gap, which means the real cause isn't "which
// number we measure" at all — something else is going on. Rather than
// guess a fourth time, this prints what the device actually sees directly
// on the splash itself, so the next screenshot carries the real numbers
// instead of another blind guess. Remove this block (and the readout div
// below) once the real cause is found.
function useDebugInfo(vh) {
  const [info, setInfo] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const rect = ref.current ? ref.current.getBoundingClientRect() : null;
    setInfo(
      [
        `iH:${window.innerHeight}`,
        `cH:${document.documentElement.clientHeight}`,
        `sH:${window.screen ? window.screen.height : '?'}`,
        `dpr:${window.devicePixelRatio}`,
        `sT:${readRootPx('--safe-area-top')}`,
        `sB:${readRootPx('--safe-area-bottom')}`,
        `vh:${vh}`,
        `rect:${rect ? Math.round(rect.top) + '/' + Math.round(rect.height) + '/' + Math.round(rect.bottom) : '?'}`,
        `sa:${window.navigator.standalone}`,
      ].join(' ')
    );
  });
  return [info, ref];
}

export default function SplashScreen({ leaving, label = 'LOADING THE MENU' }) {
  const [vh, setVh] = useState(null);
  useEffect(() => {
    const update = () => setVh(measureFullHeight());
    update();
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

  const [debugInfo, debugRef] = useDebugInfo(vh);

  return (
    <div
      ref={debugRef}
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
      {/* TEMPORARY debug readout — see comment above useDebugInfo */}
      <div
        style={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          right: 8,
          fontSize: '10px',
          fontFamily: 'monospace',
          color: 'rgba(255,255,255,0.85)',
          background: 'rgba(0,0,0,0.35)',
          padding: '4px 6px',
          borderRadius: '4px',
          wordBreak: 'break-all',
          lineHeight: 1.4,
        }}
      >
        {debugInfo}
      </div>
    </div>
  );
}
