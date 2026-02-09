import { useEffect } from "react";

export default function StripeSuccessPage() {
  useEffect(() => {
    // Preia datele din localStorage
    const items = JSON.parse(localStorage.getItem('checkout_items') || '[]');
    const client = JSON.parse(localStorage.getItem('checkout_client') || '{}');
    const userEmail = client.email || '';
    const courierCost = JSON.parse(localStorage.getItem('checkout_courierCost') || '0');
    const deliveryType = localStorage.getItem('checkout_deliveryType') || '';
    const paymentMethod = 'card';
    // Trimite datele către backend pentru email
    fetch('/api/stripe-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, client, userEmail, courierCost, deliveryType, paymentMethod })
    });
  }, []);
  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4 text-green-700">Plata a fost procesată!</h1>
      <p>Veți primi un email de confirmare cu detaliile comenzii și PDF-ul atașat.</p>
    </div>
  );
}
