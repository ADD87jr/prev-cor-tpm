"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function PersonalizedCatalogPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [catalog, setCatalog] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-personalized-catalog");
      const data = await res.json();
      setClients(data.clients || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateCatalog() {
    if (!selectedClient) return;
    setGenerating(true);
    try {
      const res = await fetch("/admin/api/ai-personalized-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client: selectedClient })
      });
      const data = await res.json();
      setCatalog(data.catalog);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  }

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">📖 Catalog Personalizat</h1>
        <p className="text-gray-600">Generează cataloage PDF personalizate per client</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Selection */}
        <div>
          <div className="mb-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Caută client..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.slice(0, 50).map(client => (
                <div
                  key={client.email}
                  onClick={() => setSelectedClient(client)}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedClient?.email === client.email ? "border-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <div className="font-semibold">{client.name || client.email}</div>
                  <div className="text-sm text-gray-600">{client.company}</div>
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className="px-1 bg-gray-100 rounded">{client.ordersCount} comenzi</span>
                    <span className="px-1 bg-gray-100 rounded">{client.totalSpent?.toLocaleString()} RON</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Details & Config */}
        <div>
          {selectedClient ? (
            <div className="space-y-4">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-2">👤 Client Selectat</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Nume:</strong> {selectedClient.name}</div>
                  <div><strong>Companie:</strong> {selectedClient.company}</div>
                  <div><strong>Email:</strong> {selectedClient.email}</div>
                  <div><strong>Comenzi:</strong> {selectedClient.ordersCount}</div>
                  <div><strong>Total cumpărături:</strong> {selectedClient.totalSpent?.toLocaleString()} RON</div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-2">📊 Preferințe Detectate</h3>
                <div className="space-y-2 text-sm">
                  {selectedClient.preferences?.categories && (
                    <div>
                      <div className="font-medium">Categorii favorite:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedClient.preferences.categories.map((c: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedClient.preferences?.priceRange && (
                    <div>
                      <div className="font-medium">Interval preț:</div>
                      <div className="text-gray-600">
                        {selectedClient.preferences.priceRange.min} - {selectedClient.preferences.priceRange.max} RON
                      </div>
                    </div>
                  )}
                  {selectedClient.preferences?.brands && (
                    <div>
                      <div className="font-medium">Branduri preferate:</div>
                      <div className="text-gray-600">
                        {selectedClient.preferences.brands.join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={generateCatalog}
                disabled={generating}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold"
              >
                {generating ? "Se generează..." : "🤖 Generează Catalog Personalizat"}
              </button>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              Selectează un client
            </div>
          )}
        </div>

        {/* Generated Catalog Preview */}
        <div>
          <h3 className="font-semibold mb-3">📖 Preview Catalog</h3>
          
          {!catalog ? (
            <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500 text-sm">
              Generează un catalog pentru preview
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cover */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-6 text-white">
                <div className="text-xs opacity-80">Catalog Personalizat</div>
                <div className="text-xl font-bold mt-2">{catalog.title}</div>
                <div className="text-sm mt-1">pentru {selectedClient?.company || selectedClient?.name}</div>
                <div className="text-xs mt-4 opacity-80">
                  {catalog.productCount} produse selectate
                </div>
              </div>

              {/* Personal Message */}
              {catalog.personalMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-600 font-medium">Mesaj Personalizat</div>
                  <div className="text-sm mt-1">{catalog.personalMessage}</div>
                </div>
              )}

              {/* Sections */}
              {catalog.sections?.map((section: any, i: number) => (
                <div key={i} className="bg-white border rounded-lg p-4">
                  <h4 className="font-semibold">{section.title}</h4>
                  <div className="text-xs text-gray-500 mb-2">{section.reason}</div>
                  <div className="space-y-2">
                    {section.products?.slice(0, 3).map((p: any, j: number) => (
                      <div key={j} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="font-bold text-blue-600">{p.price} RON</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Special Offer */}
              {catalog.specialOffer && (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 text-center">
                  <div className="text-green-700 font-bold text-lg">🎁 Ofertă Exclusivă</div>
                  <div className="text-sm mt-1">{catalog.specialOffer.description}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Valabil până la: {catalog.specialOffer.validUntil}
                  </div>
                </div>
              )}

              {/* Download Button */}
              <button
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => alert("PDF-ul ar fi descărcat aici")}
              >
                📥 Descarcă PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
