import { useEffect, useState } from 'react';

// A small bottom banner that nudges customers to save this page to their
// phone's home screen — so the next order is one tap away instead of a
// re-typed URL. iOS has no API to trigger "Add to Home Screen" itself
// (Apple only allows the customer to do that manually from the Share
// sheet), so on iOS this just shows clear instructions. Android/Chrome
// *does* support triggering the real install prompt via the
// `beforeinstallprompt` event, so there we show a working "Add" button
// that opens the browser's own native dialog.
const STR = {
  en: {
    iosTitle: 'Add this to your Home Screen',
    iosBody: 'Tap the Share icon below, then scroll down and tap "Add to Home Screen".',
    androidTitle: 'Add this to your Home Screen',
    androidBody: 'Get one-tap access next time — no browser, no typing the link.',
    androidBtn: 'Add to Home Screen',
    gotIt: 'Got it',
    notNow: 'Not now',
    watchHow: 'Watch how (10 sec)',
    watchHowSub: 'See it done step by step',
  },
  es: {
    iosTitle: 'Agrega esto a tu pantalla de inicio',
    iosBody: 'Toca el ícono de Compartir, luego desplázate y toca "Agregar a inicio".',
    androidTitle: 'Agrega esto a tu pantalla de inicio',
    androidBody: 'Acceso con un toque la próxima vez — sin navegador, sin escribir el enlace.',
    androidBtn: 'Agregar a pantalla de inicio',
    gotIt: 'Entendido',
    notNow: 'Ahora no',
    watchHow: 'Ver cómo (10 seg)',
    watchHowSub: 'Míralo paso a paso',
  },
};

export default function AddToHomeBanner({ lang = 'en', storageKey = 'fresasA2HSDismissed' }) {
  const [platform, setPlatform] = useState(null); // 'ios' | 'android' | null
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const t = STR[lang] || STR.en;

  useEffect(() => {
    if (!videoOpen) return;
    function onKey(e) { if (e.key === 'Escape') setVideoOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [videoOpen]);

  useEffect(() => {
    let cleanup;
    try {
      const standalone =
        window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
      if (standalone) return; // already installed — never show

      if (window.localStorage.getItem(storageKey)) return; // customer already dismissed it

      const ua = window.navigator.userAgent || '';
      const isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
      const isAndroid = /android/i.test(ua);

      if (isIOS) {
        setPlatform('ios');
        setVisible(true);
      } else if (isAndroid) {
        // Wait for the browser to confirm the site is installable before
        // showing anything — that's also the event that hands us the
        // native prompt to trigger from our own "Add" button.
        function onPrompt(e) {
          e.preventDefault();
          setDeferredPrompt(e);
          setPlatform('android');
          setVisible(true);
        }
        window.addEventListener('beforeinstallprompt', onPrompt);
        cleanup = () => window.removeEventListener('beforeinstallprompt', onPrompt);
      }
    } catch (e) {
      // localStorage/UA sniffing unavailable — just skip the banner
    }
    return cleanup;
  }, [storageKey]);

  function dismiss() {
    setVisible(false);
    try { window.localStorage.setItem(storageKey, '1'); } catch (e) {}
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) {}
    dismiss();
  }

  if (!visible || !platform) return null;

  return (
    <>
      <div className="a2hs-banner">
        <div className="a2hs-icon">🍓</div>
        <div className="a2hs-text">
          <div className="a2hs-title">{platform === 'ios' ? t.iosTitle : t.androidTitle}</div>
          <div className="a2hs-body">{platform === 'ios' ? t.iosBody : t.androidBody}</div>

          {/* We only have real footage for iOS right now, so the video
              option only shows there — Android still gets the working
              native install button below instead. */}
          {platform === 'ios' && (
            <div
              className="a2hs-video-row"
              role="button"
              tabIndex={0}
              onClick={() => setVideoOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Enter') setVideoOpen(true); }}
            >
              <div className="a2hs-thumb">
                <img src="/tutorials/ios-thumb.jpg" alt="" />
                <div className="play-dot">
                  <span>
                    <svg viewBox="0 0 12 12" fill="none"><path d="M2 1.5L10 6L2 10.5V1.5Z" fill="#7C1B2C" /></svg>
                  </span>
                </div>
              </div>
              <div className="a2hs-video-text">
                <div className="a2hs-video-title">{t.watchHow}</div>
                <div className="a2hs-video-sub">{t.watchHowSub}</div>
              </div>
              <div className="a2hs-video-arrow">›</div>
            </div>
          )}
        </div>
        <div className="a2hs-actions">
          {platform === 'android' && (
            <button type="button" className="a2hs-btn-primary" onClick={handleAndroidInstall}>
              {t.androidBtn}
            </button>
          )}
          <button type="button" className="a2hs-btn-ghost" onClick={dismiss}>
            {platform === 'ios' ? t.gotIt : t.notNow}
          </button>
        </div>
      </div>

      {videoOpen && (
        <div
          className="overlay center-modal lightbox-overlay open"
          onClick={() => setVideoOpen(false)}
        >
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <video
              className="lightbox-video"
              src="/tutorials/ios-add-to-home-screen.mp4"
              poster="/tutorials/ios-thumb.jpg"
              controls
              autoPlay
              playsInline
            />
            <button type="button" className="lightbox-close" onClick={() => setVideoOpen(false)} aria-label="Close">✕</button>
          </div>
        </div>
      )}
    </>
  );
}
