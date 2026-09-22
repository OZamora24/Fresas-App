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
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
