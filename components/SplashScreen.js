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

// Measures the true full screen height — but "full" means something
// different depending on how the app is running, which is exactly what the
// live debug readout on Orlando's phone (DBGV2) caught:
//
// - Installed, standalone, home-screen app (navigator.standalone === true):
//   there's no browser chrome at all, so window.screen.height already IS
//   the true full screen, and it never changes. window.innerHeight can
//   transiently under-report by a few pixels while the app is still
//   settling right after launch (see the resize-settling comment in the
//   effect below), so taking the tallest of innerHeight/clientHeight/
//   screen.height is safe here: it can only end up too generous, never too
//   short, and a splash a few px taller than the screen is simply clipped
//   at the device edge — invisible, no downside.
//
// - A regular Safari tab (navigator.standalone is false/undefined):
//   window.screen.height is STILL the full physical screen size, but now
//   that's the wrong number to chase, because Safari's own address-bar/
//   toolbar chrome can be occupying real screen space on top of the page.
//   Orlando's own readout proved this directly: iH:650 cH:650 vvH:650 all
//   agreed on the actual visible area while sH:874 (the fixed physical
//   screen) sat far above it. The old code's Math.max(...) picked 874,
//   sized the splash to that, and pushed its centered content down off the
//   bottom of the 650px that was actually visible — the exact "pushed
//   down" bug Orlando reported. window.visualViewport.height is the API
//   built specifically to track the currently-visible area net of that
//   chrome, so in this branch it's used directly (not maxed against
//   screen.height), with innerHeight as a fallback for the rare browser
//   without visualViewport support.
function measureFullHeight() {
  if (typeof window === 'undefined') return null;
  const isStandalone = !!(window.navigator && window.navigator.standalone === true);
  let base = null;
  if (isStandalone) {
    const candidates = [
      window.innerHeight,
      document.documentElement.clientHeight,
      window.screen ? window.screen.height : 0,
    ].filter((n) => Number.isFinite(n) && n > 0);
    if (candidates.length) base = Math.max(...candidates);
  } else {
    const vv = window.visualViewport;
    if (vv && Number.isFinite(vv.height) && vv.height > 0) {
      base = vv.height;
    } else if (Number.isFinite(window.innerHeight) && window.innerHeight > 0) {
      base = window.innerHeight;
    }
  }
  if (base == null) return null;
  const safeTop = readRootPx('--safe-area-top');
  const safeBottom = readRootPx('--safe-area-bottom');
  return base + safeTop + safeBottom;
}

// TEMPORARY — diagnostic only, v2. The first version of this readout was
// nested inside .app-splash and anchored to ITS bottom edge — which means
// if the real bug turns out to be that .app-splash itself never mounts
// tall enough (or gets covered by something with a higher effective stack
// order in Safari), the readout would be exactly as invisible as the gap
// it was trying to explain, which is exactly what happened: three
// screenshots in a row (normal Safari, private browsing, a never-before-
// requested URL) showed no readout anywhere, not even as an empty box —
// ruling out ordinary caching as the explanation. This version is its own
// independent, top-anchored, maximum-z-index, solid-background element —
// a sibling of .app-splash, not a child of it — so it can't be hidden by
// anything going wrong with the splash's own height or stacking. If THIS
// still doesn't show up, the problem isn't the splash at all, it's that
// this build genuinely isn't the one running yet. "DBGV2" in the text is
// the tell: if a screenshot doesn't say that, it's an old build.
function useDebugInfo(vh) {
  const [info, setInfo] = useState('DBGV2 (waiting for layout effect...)');
  useLayoutEffect(() => {
    const vv = window.visualViewport;
    setInfo(
      [
        'DBGV2',
        `iH:${window.innerHeight}`,
        `cH:${document.documentElement.clientHeight}`,
        `sH:${window.screen ? window.screen.height : '?'}`,
        `dpr:${window.devicePixelRatio}`,
        `vvH:${vv ? Math.round(vv.height) : '?'}`,
        `vvOffT:${vv ? Math.round(vv.offsetTop) : '?'}`,
        `sT:${readRootPx('--safe-area-top')}`,
        `sB:${readRootPx('--safe-area-bottom')}`,
        `vh:${vh}`,
        `sa:${window.navigator.standalone}`,
        `scrollY:${window.scrollY}`,
        `ua:${navigator.userAgent.slice(0, 40)}`,
      ].join(' ')
    );
  });
  return info;
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

  const debugInfo = useDebugInfo(vh);

  return (
    <>
      {/* TEMPORARY diagnostic — see comment above useDebugInfo. Deliberately
          NOT inside .app-splash: independent element, top-anchored (doesn't
          depend on any height calculation), higher z-index than the splash
          itself, solid (not translucent) background so it can't blend into
          anything behind it. */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2147483647,
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#000',
          background: '#ffe600',
          padding: '6px 8px',
          wordBreak: 'break-all',
          lineHeight: 1.4,
        }}
      >
        {debugInfo}
      </div>
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
    </>
  );
}
