import { useEffect, useState } from 'react';
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
// fading rather than popping off mid-transition.
const FADE_MS = 450;

export default function App({ Component, pageProps }) {
  // 'visible' -> 'leaving' (fading out) -> 'gone' (unmounted). Starting at
  // 'visible' means this only ever plays on a real page load: client-side
  // navigation between pages (via next/link) doesn't remount _app, so the
  // splash never reappears just from clicking around the site.
  const [phase, setPhase] = useState('visible');

  useEffect(() => {
    let minDone = false;
    let pageLoaded = document.readyState === 'complete';

    function tryLeave() {
      if (minDone && pageLoaded) setPhase('leaving');
    }
    function onWindowLoad() {
      pageLoaded = true;
      tryLeave();
    }

    const minTimer = setTimeout(() => {
      minDone = true;
      tryLeave();
    }, SPLASH_MIN_MS);
    const maxTimer = setTimeout(() => setPhase('leaving'), SPLASH_MAX_MS);

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

  return (
    <>
      <Component {...pageProps} />
      {phase !== 'gone' && <SplashScreen leaving={phase === 'leaving'} />}
    </>
  );
}
