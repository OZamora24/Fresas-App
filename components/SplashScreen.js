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
// different depending on how the app is running:
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
//   A live readout on-device confirmed this directly: innerHeight,
//   clientHeight, and visualViewport.height all agreed on the actual
//   visible area while screen.height (the fixed physical screen) sat far
//   above it. Using Math.max(...) across all of those, like the standalone
//   branch does, picks the oversized screen.height number, sizes the
//   splash to that, and pushes its centered content down off the bottom of
//   what's actually visible. window.visualViewport.height is the API built
//   specifically to track the currently-visible area net of that chrome,
//   so in this branch it's used directly (not maxed against
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
    // than being correct immediately. Since this splash only ever needs to
    // get taller, never shorter, only accepting a new measurement when it's
    // at least as tall as what's already in place makes any bad early
    // reading harmless — it's simply ignored, and the next (correct)
    // reading still comes through normally.
    //
    // The open question was always *how* to catch that correct reading.
    // The original approach — re-measure only on the browser's own
    // 'resize'/'orientationchange' events — assumed the settling would
    // show up as a resize event firing a moment after mount. On the /admin
    // page specifically, a frame-by-frame video showed that's often too
    // slow: the gap was visibly there for a few hundred milliseconds (not
    // one throwaway frame) before anything corrected it, meaning either no
    // resize event fired in that window at all, or it fired later than a
    // human can un-notice. Polling every animation frame for the first
    // second and a half after mount closes that gap regardless of whether
    // the browser ever fires a matching event: whatever the true
    // measurement turns out to be, this catches it within about one frame
    // of it becoming available. It's cheap (measureFullHeight is a handful
    // of property reads) and harmless to run this often, since the
    // monotonic-max guard means extra calls can only ever confirm the
    // current height or grow it — never cause a flicker.
    const update = () => {
      setVh((prev) => {
        const next = measureFullHeight();
        if (next == null) return prev;
        return prev != null ? Math.max(prev, next) : next;
      });
    };
    update();

    let rafId = null;
    const settleDeadline = Date.now() + 1500;
    const poll = () => {
      update();
      if (Date.now() < settleDeadline) {
        rafId = requestAnimationFrame(poll);
      } else {
        rafId = null;
      }
    };
    rafId = requestAnimationFrame(poll);

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
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
