"use client";
import { useState, useEffect } from "react";

export default function QuoteGeneratorPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [offer, setOffer] = useState<any>(null);

  useEffect(() => {
    fetch("/admin/api/ai-quote-generator")
      .then(res => res.json())
      .then(data => {
        setClients(data.clients || []);
        setProducts(data.products || []);
        setLoading(false);
      });
  }, []);

  const addProduct = (productId: string) => {
    if (selectedProducts.find(p => p.productId === productId)) return;
    setSelectedProducts([...selectedProducts, { productId, quantity: 1, discount: 0 }]);
  };

  const updateProduct = (productId: string, field: string, value: number) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.productId === productId ? { ...p, [field]: value } : p
    ));
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const generateOffer = async () => {
    if (!selectedClient || selectedProducts.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch("/admin/api/ai-quote-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: selectedClient,
          selectedProducts,
          discount,
          validityDays,
          notes
        })
      });
      const data = await res.json();
      setOffer(data.offer);
    } catch (error) {
      console.error(error);
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">📄 Generator Oferte PDF cu AI</h1>
      <p className="text-gray-600 mb-6">Creează oferte personalizate cu texte generate de AI</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          {/* Client Selection */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">1. Selectează Client</h3>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              <option value="">-- Alege client --</option>
              {clients.map(c => (
                <option key={c.email} value={c.email}>
                  {c.name || c.company || c.email} - {c.totalValue?.toFixed(0)} RON ({c.ordersCount} comenzi)
                </option>
              ))}
            </select>
          </div>

          {/* Products Selection */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">2. Adaugă Produse</h3>
            <select
              onChange={e => {
                if (e.target.value) addProduct(e.target.value);
                e.target.value = "";
              }}
              className="w-full border rounded-lg p-2 mb-3"
            >
              <option value="">-- Adaugă produs --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.price} RON
                </option>
              ))}
            </select>

            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                {selectedProducts.map(sp => {
                  const prod = products.find(p => p.id === sp.productId);
                  return (
                    <div key={sp.productId} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{prod?.name}</p>
                        <p className="text-xs text-gray-500">{prod?.price} RON</p>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={sp.quantity}
                        onChange={e => updateProduct(sp.productId, "quantity", parseInt(e.target.value) || 1)}
                        className="w-16 border rounded p-1 text-center"
                        placeholder="Cant."
                      />
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={sp.discount}
                        onChange={e => updateProduct(sp.productId, "discount", parseInt(e.target.value) || 0)}
                        className="w-16 border rounded p-1 text-center"
                        placeholder="%"
                      />
                      <button onClick={() => removeProduct(sp.productId)} className="text-red-500">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">3. Opțiuni</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Discount global (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={discount}
                  onChange={e => setDiscount(parseInt(e.target.value) || 0)}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Valabilitate (zile)</label>
                <input
                  type="number"
                  min="1"
                  value={validityDays}
                  onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
                  className="w-full border rounded p-2"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm text-gray-600">Note suplimentare</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full border rounded p-2 h-20"
                placeholder="Mențiuni speciale pentru ofertă..."
              />
            </div>
          </div>

          <button
            onClick={generateOffer}
            disabled={generating || !selectedClient || selectedProducts.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {generating ? "⏳ Generez oferta..." : "🚀 Generează Ofertă AI"}
          </button>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Preview Ofertă</h3>
          </div>
          {offer ? (
            <div className="p-4 space-y-4 max-h-[700px] overflow-y-auto">
              {/* Header */}
              <div className="border-b pb-4">
                <p className="text-sm text-gray-500">Ofertă #{offer.offerNumber}</p>
                <h2 className="text-xl font-bold">{offer.title}</h2>
                <p className="text-gray-600">{offer.introduction}</p>
              </div>

              {/* Products */}
              <div>
                <h4 className="font-semibold mb-2">Produse</h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Produs</th>
                      <th className="p-2 text-right">Cant.</th>
                      <th className="p-2 text-right">Preț unit.</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offer.products?.map((p: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{p.name}</td>
                        <td className="p-2 text-right">{p.quantity}</td>
                        <td className="p-2 text-right">{p.finalPrice?.toFixed(2)} RON</td>
                        <td className="p-2 text-right font-medium">{p.lineTotal?.toFixed(2)} RON</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="p-2 text-right">Subtotal:</td>
                      <td className="p-2 text-right font-medium">{offer.subtotal?.toFixed(2)} RON</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="p-2 text-right">TVA 19%:</td>
                      <td className="p-2 text-right">{offer.tva?.toFixed(2)} RON</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="p-2 text-right font-bold">TOTAL:</td>
                      <td className="p-2 text-right font-bold text-lg">{offer.total?.toFixed(2)} RON</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Benefits */}
              {offer.benefits && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">✓ Beneficii</h4>
                  <ul className="text-sm space-y-1">
                    {offer.benefits.map((b: string, i: number) => (
                      <li key={i}>• {b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Terms */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-gray-600">Livrare</p>
                  <p className="font-medium">{offer.deliveryTerms}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-gray-600">Plată</p>
                  <p className="font-medium">{offer.paymentTerms}</p>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="font-medium text-blue-800">{offer.callToAction}</p>
                <p className="text-sm text-blue-600 mt-1">
                  Valabilă până la {new Date(offer.validUntil).toLocaleDateString("ro-RO")}
                </p>
              </div>

              {/* Personalized Note */}
              {offer.personalizedNote && (
                <div className="bg-purple-50 p-3 rounded-lg text-sm">
                  <p className="text-purple-800">{offer.personalizedNote}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">📋</p>
              <p>Completează datele și generează oferta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
