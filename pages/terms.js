import Head from 'next/head';

export default function Terms() {
  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 720 }}>
      <Head><title>Terms &amp; Conditions — Fresas con Crema</title></Head>
      <h1 style={{ color: 'var(--maroon)' }}>Terms &amp; Conditions</h1>
      <p style={{ color: 'var(--ink-soft)' }}>Fresas con Crema — Rialto, CA</p>

      <p>These Terms &amp; Conditions govern your use of the Fresas con Crema online ordering form.</p>

      <h2 style={{ color: 'var(--maroon)', fontSize: '1.2rem', marginTop: 28 }}>Ordering</h2>
      <p>
        Orders placed through this site are for pickup only, at 1526 W Bonnie View Dr, Rialto,
        CA 92376, during the pickup time selected at checkout. Payment is made via Zelle or cash
        at pickup, as selected during checkout.
      </p>

      <h2 style={{ color: 'var(--maroon)', fontSize: '1.2rem', marginTop: 28 }}>SMS Terms</h2>
      <p>
        By providing your phone number when placing an order, you consent to receive a one-time
        text message from Fresas con Crema when your order is ready for pickup.
      </p>
      <ul>
        <li>Message frequency: one message per order.</li>
        <li>Message and data rates may apply.</li>
        <li>You may reply STOP at any time to opt out of future messages.</li>
        <li>Reply HELP, or contact us at (909) 725-2384, for assistance.</li>
      </ul>

      <h2 style={{ color: 'var(--maroon)', fontSize: '1.2rem', marginTop: 28 }}>Changes to an Order</h2>
      <p>
        To make changes to an order after it has been placed, contact us directly by phone or
        text at (909) 725-2384.
      </p>

      <h2 style={{ color: 'var(--maroon)', fontSize: '1.2rem', marginTop: 28 }}>Contact</h2>
      <p>
        Fresas con Crema — Rialto, CA — <a href="tel:+19097252384">(909) 725-2384</a> — Instagram{' '}
        <a href="https://instagram.com/lovelyfresitas_" target="_blank" rel="noopener noreferrer">@lovelyfresitas_</a>
      </p>
    </div>
  );
}
