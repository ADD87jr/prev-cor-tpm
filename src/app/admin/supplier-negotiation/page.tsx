"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SupplierNegotiationPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [negotiation, setNegotiation] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-supplier-negotiation");
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateNegotiation() {
    if (!selectedSupplier) return;
    setGenerating(true);
    try {
      const res = await fetch("/admin/api/ai-supplier-negotiation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier: selectedSupplier })
      });
      const data = await res.json();
      setNegotiation(data.negotiation);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  }

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">🤝 Negociere Furnizori</h1>
        <p className="text-gray-600">Strategii și tactici de negociere generate de AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers */}
        <div>
          <div className="mb-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Caută furnizor..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.map((supplier, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedSupplier(supplier)}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedSupplier?.name === supplier.name ? "border-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <div className="font-semibold">{supplier.name}</div>
                  <div className="text-sm text-gray-600">{supplier.category}</div>
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className="px-1 bg-gray-100 rounded">{supplier.productsCount} produse</span>
                    <span className={`px-1 rounded ${
                      supplier.leverage === "HIGH" ? "bg-green-100 text-green-700" :
                      supplier.leverage === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      Leverage: {supplier.leverage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Supplier Details */}
        <div>
          {selectedSupplier ? (
            <div className="space-y-4">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-2">🏢 Furnizor Selectat</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Nume:</strong> {selectedSupplier.name}</div>
                  <div><strong>Categorie:</strong> {selectedSupplier.category}</div>
                  <div><strong>Produse:</strong> {selectedSupplier.productsCount}</div>
                  <div><strong>Volum anual:</strong> {selectedSupplier.annualVolume?.toLocaleString()} RON</div>
                  <div><strong>Relație:</strong> {selectedSupplier.relationshipYears} ani</div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-2">📊 Analiză Leverage</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importanță pentru noi:</span>
                    <div className="flex">
                      {[1,2,3,4,5].map(i => (
                        <span key={i} className={`text-lg ${
                          i <= selectedSupplier.importanceForUs ? "text-yellow-500" : "text-gray-200"
                        }`}>★</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Importanța noastră pentru ei:</span>
                    <div className="flex">
                      {[1,2,3,4,5].map(i => (
                        <span key={i} className={`text-lg ${
                          i <= selectedSupplier.ourImportanceForThem ? "text-yellow-500" : "text-gray-200"
                        }`}>★</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Alternative disponibile:</span>
                    <span className="font-medium">{selectedSupplier.alternativesCount}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={generateNegotiation}
                disabled={generating}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold"
              >
                {generating ? "Se generează..." : "🤖 Generează Strategie Negociere"}
              </button>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              Selectează un furnizor
            </div>
          )}
        </div>

        {/* Negotiation Strategy */}
        <div>
          <h3 className="font-semibold mb-3">📋 Strategie Negociere</h3>
          
          {!negotiation ? (
            <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500 text-sm">
              Generează o strategie pentru furnizorul selectat
            </div>
          ) : (
            <div className="space-y-4">
              {/* Opening Position */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">🎯 Poziție Inițială</h4>
                <div className="text-sm">
                  <div><strong>Discount cerut:</strong> {negotiation.openingPosition?.discountRequest}</div>
                  <div><strong>Termen plată:</strong> {negotiation.openingPosition?.paymentTerms}</div>
                  <div><strong>Volum promis:</strong> {negotiation.openingPosition?.volumeCommitment}</div>
                </div>
              </div>

              {/* Key Arguments */}
              {negotiation.keyArguments && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">💬 Argumente Cheie</h4>
                  <ul className="list-disc ml-4 text-sm space-y-1">
                    {negotiation.keyArguments.map((arg: string, i: number) => (
                      <li key={i}>{arg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* BATNA */}
              {negotiation.batna && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">🔄 BATNA</h4>
                  <p className="text-sm">{negotiation.batna}</p>
                </div>
              )}

              {/* Concessions Ladder */}
              {negotiation.concessionsLadder && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">📈 Concesii Graduale</h4>
                  <div className="space-y-2">
                    {negotiation.concessionsLadder.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded text-xs">
                          Pas {i + 1}
                        </span>
                        <span>{c.concession}</span>
                        <span className="text-gray-500">→</span>
                        <span className="text-green-600">{c.getInReturn}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Template */}
              {negotiation.emailTemplate && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">📧 Template Email</h4>
                  <div className="text-sm bg-white p-2 rounded border">
                    <div className="font-medium mb-1">Subiect: {negotiation.emailTemplate.subject}</div>
                    <div className="text-xs text-gray-600 whitespace-pre-line">
                      {negotiation.emailTemplate.body?.slice(0, 300)}...
                    </div>
                  </div>
                </div>
              )}

              {/* Expected Outcome */}
              {negotiation.expectedOutcome && (
                <div className="border-2 border-green-400 bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-green-600">Rezultat Așteptat</div>
                  <div className="text-xl font-bold text-green-700">
                    -{negotiation.expectedOutcome.savingsPercent}% Cost
                  </div>
                  <div className="text-sm">
                    ~{negotiation.expectedOutcome.savingsAmount?.toLocaleString()} RON/an
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
