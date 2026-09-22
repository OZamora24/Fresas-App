import { useEffect, useState } from 'react';
import Head from 'next/head';
import SiteNav from '../components/SiteNav';

export default function Photos() {
  const [photos, setPhotos] = useState(null);

  useEffect(() => {
    fetch('/api/photos')
      .then((r) => r.json())
      .then((j) => setPhotos(j.photos || []))
      .catch(() => setPhotos([]));
  }, []);

  return (
    <div className="site-shell">
      <Head><title>Photos — Fresas con Crema</title></Head>
      <SiteNav />
      <main className="site-main">
        <div className="content-pad">
          <h2>Photos</h2>
          <p className="sub">A look at our flavors and past orders.</p>

          {photos === null && <p className="hint">Loading…</p>}

          {photos && photos.length === 0 && (
            <p className="hint">No photos up yet — check back soon!</p>
          )}

          {photos && photos.length > 0 && (
            <div className="photo-grid">
              {photos.map((p) => (
                <img key={p.path} src={p.url} alt="Fresas con Crema" loading="lazy" />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
