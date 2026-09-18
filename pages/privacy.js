import Head from 'next/head';

export default function Privacy() {
  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 720 }}>
      <Head><title>Privacy Policy — Fresas con Crema</title></Head>
      <h1 style={{ color: 'var(--maroon)' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--ink-soft)' }}>Fresas con Crema — Rialto, CA</p>

      <p>
        Fresas con Crema (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates an online
        ordering form for pickup orders in Rialto, CA. This Privacy Policy explains what
        information we collect from customers and how we use it.
      </p>

      <h2 style={{ color: 'var(--maroon)', fontSize: '1.2rem', marginTop: 28 }}>Information We Collect</h2>
      <p>
        When you place an order, we collect your name, phone number (optional), your order
        details (flavor, cup size, toppings, syrup, quantity, and pickup time), any notes you
        provide, your preferred language, and your chosen payment method.
      </p>

      <h2 style={{ color: 'var(--maroon)', fontSize: '1.2rem', marginTop: 28 }}>How We Use Your Information</h2>
      <p>
        We use this information solely to prepare and fulfill your order, to contact you about
        your order — including a text message notification when your order is ready for pickup —
        and to maintain our own order records.
      </p>

      <h2 style={{ color: 'var(--maroon)', fontSize: '1.2rem', marginTop: 28 }}>SMS Communications</h2>
      <p>
        If you provide your phone number, we may send you a one-time text message letting you
        know when your order is ready for pickup. We do not send marketing texts. Message and
        data rates may apply. You will receive at most one text per order.
      </p>
      <p>
        <strong>We do not sell or share your SMS opt-in data or personal information with third
        parties for marketing purposes.</strong>
      </p>

      <h2 style={{ color: 'var(--maroon)', fontSize: '1.2rem', marginTop: 28 }}>Data Retention</h2>
      <p>We retain order records for our own business and accounting purposes.</p>

      <h2 style={{ color: 'var(--maroon)', fontSize: '1.2rem', marginTop: 28 }}>Contact Us</h2>
      <p>
        Questions about this policy can be directed to us at{' '}
        <a href="tel:+19097252384">(909) 725-2384</a> or via Instagram{' '}
        <a href="https://instagram.com/lovelyfresitas_" target="_blank" rel="noopener noreferrer">@lovelyfresitas_</a>.
      </p>
    </div>
  );
}
