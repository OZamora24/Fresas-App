import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import SplashScreen from '../components/SplashScreen';

// The launch splash always stays up at least this long — long enough for
// the pulse rings to complete a couple of full cycles (each ring takes
// 2.4s) rather than getting cut off mid-animation.
const SPLASH_MIN_MS = 2400;
// Safety cap: even if the page is unusually slow to finish loading, the
// splash never blocks the app for longer than this.
const SPLASH_MAX_MS = 3800;
// How long the CSS fade-out transition takes (.app-splash-leaving in
// globals.css) — kept in sync so the splash unmounts right as it finishes
// fading rather than popping off mid-transition. 90ms with no motion read
// as stiff/mechanical — a flicker rather than a fade. Pairing the opacity
// drop with a slight scale (see .app-splash-leaving in globals.css) gives
// the eye something to follow, so 160ms feels like an intentional soft
// dissolve instead of either a flicker or a lingering red wash.
const FADE_MS = 160;

export default function App({ Component, pageProps }) {
  // 'visible' -> 'leaving' (fading out) -> 'gone' (unmounted). Starting at
  // 'visible' means this only ever plays on a real page load: client-side
  // navigation between pages (via next/link) doesn't remount _app, so the
  // splash never reappears just from clicking around the site.
  const [phase, setPhase] = useState('visible');
  const router = useRouter();
  // The splash's caption should match what's actually loading — "LOADING
  // THE MENU" is only true on the order-builder page. router.pathname is
  // already known on the very first render (no loading flicker between
  // labels), since Next resolves it before _app ever mounts.
  const splashLabel = router.pathname.startsWith('/admin')
    ? 'LOADING ADMIN'
    : router.pathname === '/order'
    ? 'LOADING THE MENU'
    : router.pathname === '/'
    ? 'WELCOME'
    : 'LOADING...';

  useEffect(() => {
    let minDone = false;
    let pageLoaded = document.readyState === 'complete';
    // Guards against the splash reappearing a second time. Without this,
    // once the normal minTimer path already called setPhase('leaving') and
    // the splash finished fading away, the maxTimer safety-cap (still
    // pending, since nothing had cancelled it) fired on its own a moment
    // later and called setPhase('leaving') again — remounting the splash
    // for another ~450ms, invisible but still swapping <html>/<body>'s
    // background back to the splash's maroon underneath it. That's the
    // "loads fine, then a quick glitch, then loads normally" flash Orlando
    // kept seeing on every device: a real timing bug, not a rendering
    // quirk. leaveOnce() cancels whichever timer didn't win the race, so
    // only one of them can ever move the splash into 'leaving'.
    let left = false;

    function leaveOnce() {
      if (left) return;
      left = true;
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      setPhase('leaving');
    }

    function tryLeave() {
      if (minDone && pageLoaded) leaveOnce();
    }
    function onWindowLoad() {
      pageLoaded = true;
      tryLeave();
    }

    const minTimer = setTimeout(() => {
      minDone = true;
      tryLeave();
    }, SPLASH_MIN_MS);
    const maxTimer = setTimeout(leaveOnce, SPLASH_MAX_MS);

    if (!pageLoaded) window.addEventListener('load', onWindowLoad);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      window.removeEventListener('load', onWindowLoad);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const t = setTimeout(() => setPhase('gone'), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // On iPhone, the safe-area strip behind the home indicator sits outside
  // where the splash overlay's own fixed positioning reliably reaches, so
  // no z-index on the splash can guarantee covering it — whatever <html>
  // and <body>'s own background color is shows through there instead.
  // <body> is normally much taller than the screen (it's the actual
  // scrollable page), so IT'S the one that actually paints that strip, not
  // <html> — an earlier version of this only swapped <html>'s color, which
  // did nothing since <body>'s own cream background was what was showing.
  // Swapping both for as long as the splash is on screen closes the gap;
  // .splash-active comes off the moment it's gone, so every other page
  // keeps its normal cream edge.
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (phase === 'gone') {
      root.classList.remove('splash-active');
      body.classList.remove('splash-active');
    } else {
      root.classList.add('splash-active');
      body.classList.add('splash-active');
    }
    return () => {
      root.classList.remove('splash-active');
      body.classList.remove('splash-active');
    };
  }, [phase]);

  return (
    <>
      <Component {...pageProps} />
      {phase !== 'gone' && <SplashScreen leaving={phase === 'leaving'} label={splashLabel} />}
    </>
  );
}
