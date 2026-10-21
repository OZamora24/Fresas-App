import Head from 'next/head';
import { useRouter } from 'next/router';

// Search + link-preview tags for every customer page. One official address
// (SITE_URL) so Google treats lovelyfresitas.app as the real site, even when
// someone arrives through the old fresas-app-zeta.vercel.app link.
export const SITE_URL = 'https://www.lovelyfresitas.app';
export const SITE_NAME = 'Lovely Fresitas';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export default function Seo({ title, description, path, noindex = false, jsonLd = null, lang = 'en' }) {
  const router = useRouter();
  const p = path || (router.asPath || '/').split(/[?#]/)[0] || '/';
  const url = `${SITE_URL}${p === '/' ? '/' : p}`;
  return (
    <Head>
      <title key="title">{title}</title>
      {description ? <meta key="description" name="description" content={description} /> : null}
      {noindex ? (
        <meta key="robots" name="robots" content="noindex, nofollow" />
      ) : (
        <link key="canonical" rel="canonical" href={url} />
      )}
      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:locale" property="og:locale" content={lang === 'es' ? 'es_US' : 'en_US'} />
      <meta key="og:title" property="og:title" content={title} />
      {description ? <meta key="og:description" property="og:description" content={description} /> : null}
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:image" property="og:image" content={OG_IMAGE} />
      <meta key="og:image:width" property="og:image:width" content="1200" />
      <meta key="og:image:height" property="og:image:height" content="630" />
      <meta key="og:image:alt" property="og:image:alt" content="Lovely Fresitas — fresas con crema in Rialto, CA" />
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={title} />
      {description ? <meta key="twitter:description" name="twitter:description" content={description} /> : null}
      <meta key="twitter:image" name="twitter:image" content={OG_IMAGE} />
      {jsonLd ? (
        <script
          key="ld-json"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      ) : null}
    </Head>
  );
}

// "17:00" -> "17:00" (schema.org wants HH:MM); anything odd -> null.
function hhmm(v) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || ''));
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

// Business card for Google (name, phone, city, hours, Instagram). Hours come
// from the live shop settings, so editing hours in /admin updates this too.
export function businessJsonLd(settings) {
  const s = settings || {};
  const hours = [];
  const wd = [hhmm(s.hours_weekday_start), hhmm(s.hours_weekday_end)];
  const we = [hhmm(s.hours_weekend_start), hhmm(s.hours_weekend_end)];
  if (wd[0] && wd[1]) {
    hours.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: wd[0],
      closes: wd[1],
    });
  }
  if (we[0] && we[1]) {
    hours.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday'],
      opens: we[0],
      closes: we[1],
    });
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    '@id': `${SITE_URL}/#business`,
    name: SITE_NAME,
    alternateName: ['Fresas con Crema', 'Lovely Fresitas Fresas con Crema'],
    description:
      'Handmade fresas con crema in Rialto, CA — homemade sweet cream, fresh strawberries and toppings like Biscoff, Ferrero Rocher and Raffaello. Order ahead for pickup.',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
    image: [`${SITE_URL}/og-image.png`, `${SITE_URL}/icon-512.png`],
    telephone: '+1-909-725-2384',
    servesCuisine: ['Desserts', 'Mexican'],
    priceRange: '$',
    acceptsReservations: false,
    hasMenu: `${SITE_URL}/order`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Rialto',
      addressRegion: 'CA',
      addressCountry: 'US',
    },
    areaServed: 'Rialto, CA',
    sameAs: ['https://instagram.com/lovelyfresitas_'],
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
  };
}
