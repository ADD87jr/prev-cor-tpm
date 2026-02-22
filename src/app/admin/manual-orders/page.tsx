"use client";
import Link from "next/link";
import * as React from "react";
import ConfirmModal from "@/components/ConfirmModal";

export default function ManualOrdersPage() {
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [defaultTva, setDefaultTva] = React.useState(19);
  const [deleteOrderId, setDeleteOrderId] = React.useState<number | null>(null);
  
  // Încarcă TVA configurat din admin
  React.useEffect(() => {
    fetch('/admin/api/pagini?pagina=cos')
      .then(res => res.json())
      .then(data => {
        if (data && data.tva !== undefined) {
          setDefaultTva(Number(data.tva));
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    setLoading(true);
    fetch("/admin/manual-orders/api")
      .then(res => res.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-900">Comenzi manuale</h1>
      <div className="mb-6 text-gray-700 text-lg">
        Această pagină permite administrarea comenzilor introduse manual de către operatori sau personal administrativ. Poți adăuga, edita sau vizualiza comenzi care nu au fost plasate direct prin site.
      </div>
      <div className="flex gap-4 mb-8">
        <Link href="/admin/manual-orders/new">
          <button className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition">Adaugă comandă manuală</button>
        </Link>
      </div>
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Lista comenzi manuale</h2>
        {loading ? (
          <div className="text-gray-500">Se încarcă...</div>
        ) : orders.length === 0 ? (
          <div className="text-gray-500">Nu există comenzi manuale.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Client</th>
                <th className="p-2">Email</th>
                <th className="p-2">Produse</th>
                <th className="p-2">Total</th>
                <th className="p-2">Status</th>
                <th className="p-2">Data</th>
                <th className="p-2">Șterge</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Afișează toate comenzile manuale, fără deduplicare/grupare
                const manualOrders = orders
                  .filter(order => order.source === 'manual')
                  .sort((a, b) => b.id - a.id);
                return manualOrders.map((order, idx) => {
                  // Calcul detaliat cu stacking logic (discount produs + cupon)
                  const items = Array.isArray(order.items) ? order.items : [];
                  let subtotalVanzare = 0;
                  let subtotalDupaReduceri = 0;
                  
                  for (const it of items) {
                    const price = typeof it.price === 'number' ? it.price : 0;
                    const qty = typeof it.quantity === 'number' ? it.quantity : 1;
                    subtotalVanzare += price * qty;
                    
                    // Calculează prețul după discount produs
                    let priceAfterProduct = price;
                    if (typeof it.discount === 'number' && it.discount > 0) {
                      const discountPercent = it.discount <= 1 ? it.discount : it.discount / 100;
                      priceAfterProduct = price * (1 - discountPercent);
                    } else if (typeof it.discountPrice === 'number') {
                      priceAfterProduct = it.discountPrice;
                    }
                    
                    // Aplică cuponul (stacking) pe prețul după discount produs
                    let finalPrice = priceAfterProduct;
                    if (it.appliedCoupon) {
                      if (it.appliedCoupon.type === 'percent') {
                        const couponPercent = it.appliedCoupon.value <= 1 ? it.appliedCoupon.value : it.appliedCoupon.value / 100;
                        finalPrice = priceAfterProduct * (1 - couponPercent);
                      } else {
                        finalPrice = priceAfterProduct - (it.appliedCoupon.value / qty);
                      }
                    }
                    if (finalPrice < 0) finalPrice = 0;
                    subtotalDupaReduceri += finalPrice * qty;
                  }
                  
                  const courier = typeof order.courierCost === 'number' ? order.courierCost : 0;
                  const tvaPercent = typeof order.tva === 'number' ? order.tva : defaultTva;
                  const totalFaraTVA = subtotalDupaReduceri + courier;
                  const tvaValoare = Math.round(totalFaraTVA * tvaPercent / 100 * 100) / 100;
                  const totalCuTVA = Math.round((totalFaraTVA + tvaValoare) * 100) / 100;
                  
                  // Afișare produse pe un singur rând
                  const produseText = items.map((it: any) => `${it.name} x${it.quantity}`).join(', ') || '-';
                  
                  return (
                    <tr key={order.id} className="border-b align-top">
                      <td className="p-2 font-mono">{idx + 1}</td>
                      <td className="p-2">{order.clientData?.denumire || order.clientData?.name || '-'}</td>
                      <td className="p-2">{order.clientData?.email || '-'}</td>
                      <td className="p-2 whitespace-nowrap">{produseText}</td>
                      <td className="p-2 align-middle whitespace-nowrap">
                        <div className="text-base font-bold text-blue-700 text-center">
                          {totalCuTVA.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei
                        </div>
                      </td>
                      <td className="p-2">{order.paymentMethod ? `${order.paymentMethod} (manuală)` : order.status}</td>
                      <td className="p-2">{order.date ? new Date(order.date).toLocaleString("ro-RO") : '-'}</td>
                      <td className="p-2 text-center flex flex-col gap-2">
                        <button
                          className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200"
                          title="Șterge comanda"
                          onClick={() => setDeleteOrderId(order.id)}
                        >✕</button>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        )}

        {/* Modal confirmare ștergere comandă */}
        <ConfirmModal
          isOpen={deleteOrderId !== null}
          title="Ștergere comandă"
          message="Sigur dorești să ștergi această comandă manuală? Acțiunea este ireversibilă."
          confirmText="Da, șterge"
          cancelText="Anulează"
          confirmColor="red"
          icon="danger"
          onConfirm={async () => {
            if (deleteOrderId) {
              await fetch(`/admin/manual-orders/api?id=${deleteOrderId}`, { method: 'DELETE' });
              setOrders(orders => orders.filter(o => o.id !== deleteOrderId));
            }
            setDeleteOrderId(null);
          }}
          onCancel={() => setDeleteOrderId(null)}
        />
      </div>
    </main>
  );
}
