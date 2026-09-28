import { Html, Head, Main, NextScript } from 'next/document';

// Applies to every page automatically — this is the one place a viewport
// meta tag needs to exist. Without it, mobile browsers default to
// rendering the page at a desktop-style width (~980px) and then the
// actual phone screen only shows a slice of that, which is what makes
// the whole site look shifted/offset and horizontally scrollable on
// phones.
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <body>
        {/* Runs before the page paints anything, so <html>/<body> already
            have the splash's maroon background for the very first frame —
            without this, that only happened once _app.js's useEffect ran
            a beat later, and the gap showed as a pale flash on iPhone's
            safe-area strip (the strip is painted from <html>'s own
            background-color, outside normal DOM stacking, so nothing else
            can cover it). _app.js still owns removing this class once the
            splash actually finishes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('splash-active');",
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
