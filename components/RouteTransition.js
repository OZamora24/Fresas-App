import { useEffect, useRef, useState } from 'react';
import Router from 'next/router';

// Home -> Order transition: pink cream fills the screen like a cup, a
// strawberry pops, then the cream lifts away to reveal the Order page.
// The fill runs while Next loads the Order page's data, so it hides the wait
// instead of adding to it. Skipped for phones set to "reduce motion".
const FILL_MS = 420;
const LIFT_MS = 480;
const MAX_COVER_MS = 4000;

export default function RouteTransition() {
  const [phase, setPhase] = useState('idle'); // idle | fill | lift
  const t = useRef({ filled: false, routed: false, timers: [] });

  useEffect(() => {
    const st = t.current;
    const clear = () => {
      st.timers.forEach(clearTimeout);
      st.timers = [];
    };
    const lift = () => {
      clear();
      setPhase('lift');
      st.timers.push(setTimeout(() => setPhase('idle'), LIFT_MS));
    };
    const maybeLift = () => {
      if (st.filled && st.routed) lift();
    };
    const onStart = (url) => {
      if (Router.pathname !== '/' || !/^\/order(\?|#|$)/.test(url)) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      clear();
      st.filled = false;
      st.routed = false;
      setPhase('fill');
      st.timers.push(setTimeout(() => { st.filled = true; maybeLift(); }, FILL_MS));
      st.timers.push(setTimeout(lift, MAX_COVER_MS));
    };
    const onDone = () => {
      if (!st.timers.length) return;
      st.routed = true;
      maybeLift();
    };
    Router.events.on('routeChangeStart', onStart);
    Router.events.on('routeChangeComplete', onDone);
    Router.events.on('routeChangeError', onDone);
    return () => {
      Router.events.off('routeChangeStart', onStart);
      Router.events.off('routeChangeComplete', onDone);
      Router.events.off('routeChangeError', onDone);
      clear();
    };
  }, []);

  if (phase === 'idle') return null;
  return (
    <div className={`route-fill route-fill-${phase}`} aria-hidden="true">
      <span className="route-fill-berry">🍓</span>
    </div>
  );
}
