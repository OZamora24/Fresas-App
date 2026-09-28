// Full-screen launch splash shown briefly by _app.js while the app boots.
// Pure presentation — no data fetching, no timing logic here (that lives in
// _app.js so it can coordinate with actual page-load state).
export default function SplashScreen({ leaving }) {
  return (
    <div className={`app-splash${leaving ? ' app-splash-leaving' : ''}`} aria-hidden="true">
      <div className="app-splash-ringwrap">
        <div className="app-splash-ring r1" />
        <div className="app-splash-ring r2" />
        <div className="app-splash-ring r3" />
        <div className="app-splash-core">🍓</div>
      </div>
      <div className="app-splash-text">
        Fresas con Crema
        <small>LOADING THE MENU</small>
      </div>
    </div>
  );
}
