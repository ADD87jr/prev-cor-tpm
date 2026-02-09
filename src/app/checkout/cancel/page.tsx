export default function CheckoutCancel() {
  return (
    <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
      <h1 style={{ color: 'red', fontSize: 32, fontWeight: 700 }}>Plata a fost anulată sau a eșuat!</h1>
      <p style={{ fontSize: 18, marginTop: 24 }}>
        Comanda nu a fost procesată. Poți încerca din nou sau alege altă metodă de plată.
      </p>
      <a href="/cart" style={{ display: 'inline-block', marginTop: 32, color: '#2563eb', fontWeight: 600, fontSize: 18 }}>Înapoi la coș</a>
    </div>
  );
}
