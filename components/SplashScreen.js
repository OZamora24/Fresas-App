// Full-screen launch splash shown briefly by _app.js while the app boots.
// Pure presentation — no data fetching, no timing logic here (that lives in
// _app.js so it can coordinate with actual page-load state). `label` lets
// _app.js swap the caption based on which page is actually loading (the
// admin dashboard doesn't have a "menu" to load).
import { useLayoutEffect, useRef, useState } from 'react';

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

// TEMPORARY — diagnostic only. The standalone home-screen gap turned out to
// need a debug readout to actually pin down (guessing at the fix three
// times in a row all landed on the same wrong symptom). The same gap is
// now showing up in regular Safari too — sustained, not just a one-frame
// flash — which points to something specific to Safari's own address-bar/
// toolbar chrome that this component doesn't currently account for at all.
// Rather than guess a fourth time, this prints the real numbers (including
// window.visualViewport, which is the one API specifically meant to track
// how much of the screen Safari's chrome is currently covering) directly
// on the splash. Remove this block and the readout div below once the
// real cause is confirmed.
function useDebugInfo(vh) {
  const [info, setInfo] = useState('');
  const ref = useRef(null);
  useLayoutEffect(() => {
    const rect = ref.current ? ref.current.getBoundingClientRect() : null;
    const vv = window.visualViewport;
    setInfo(
      [
        `iH:${window.innerHeight}`,
        `cH:${document.documentElement.clientHeight}`,
        `sH:${window.screen ? window.screen.height : '?'}`,
        `dpr:${window.devicePixelRatio}`,
        `vvH:${vv ? Math.round(vv.height) : '?'}`,
        `vvOffT:${vv ? Math.round(vv.offsetTop) : '?'}`,
        `vvScale:${vv ? vv.scale : '?'}`,
        `sT:${readRootPx('--safe-area-top')}`,
        `sB:${readRootPx('--safe-area-bottom')}`,
        `vh:${vh}`,
        `rect:${rect ? Math.round(rect.top) + '/' + Math.round(rect.height) + '/' + Math.round(rect.bottom) : '?'}`,
        `sa:${window.navigator.standalone}`,
        `scrollY:${window.scrollY}`,
      ].join(' ')
    );
  });
  return [info, ref];
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
    // Right after a standalone iOS app launches from the home screen, the
    // window's reported size settles over the first several frames rather
    // than being correct immediately — it can fire an extra 'resize' event
    // mid-launch that briefly reports a smaller size than the real screen,
    // before a follow-up event lands on the true value a moment later.
    // That's what the frame-by-frame video showed: one single frame with
    // a sliver of the real page exposed, gone again the very next frame —
    // not a sustained gap, just one bad in-between reading. Since this
    // splash only ever needs to get taller, never shorter, only accepting
    // a new measurement when it's at least as tall as what's already in
    // place makes that one bad reading harmless: it's simply ignored, and
    // the next (correct) reading still comes through normally.
    const update = () => {
      setVh((prev) => {
        const next = measureFullHeight();
        if (next == null) return prev;
        return prev != null ? Math.max(prev, next) : next;
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
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
