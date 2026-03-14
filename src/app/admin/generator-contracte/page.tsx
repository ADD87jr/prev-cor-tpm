"use client";

import { useState, useEffect } from "react";

interface Client {
  name: string;
  company: string;
  email: string;
  cui: string;
  totalOrders: number;
  totalValue: number;
}

interface ContractClause {
  number: string;
  title: string;
  content: string;
}

interface GeneratedContract {
  title: string;
  contractNumber: string;
  parties?: {
    supplier: { name: string; cui: string; address: string };
    client: { name: string; cui: string; address: string };
  };
  clauses: ContractClause[];
  duration: string;
  signatureDate: string;
  fullText: string;
}

export default function AIContractGeneratorPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [contract, setContract] = useState<GeneratedContract | null>(null);
  
  // Form state
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientCui, setClientCui] = useState("");
  const [contractType, setContractType] = useState("furnizare");
  const [products, setProducts] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [paymentTerms, setPaymentTerms] = useState("30 zile");
  const [duration, setDuration] = useState("12 luni");

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-contract-generator");
      const data = await res.json();
      setClients(data.clients || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const selectClient = (client: Client) => {
    setClientName(client.name);
    setClientCompany(client.company);
    setClientCui(client.cui);
  };

  const generateContract = async () => {
    if (!clientCompany) {
      alert("Selectează sau introdu datele clientului!");
      return;
    }

    setGenerating(true);
    setContract(null);

    try {
      const res = await fetch("/admin/api/ai-contract-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientCompany,
          clientCui,
          contractType,
          products,
          discountPercent: parseFloat(discountPercent),
          paymentTerms,
          duration
        })
      });
      const data = await res.json();
      setContract(data);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Contract copiat în clipboard!");
  };

  const downloadAsDoc = () => {
    if (!contract) return;
    const blob = new Blob([contract.fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contract.contractNumber || "contract"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📄 AI Generator Contracte B2B</h1>
      <p className="text-gray-600 mb-6">
        Generează contracte profesionale personalizate pentru clienții business.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formular */}
          <div className="space-y-4">
            {/* Clienți existenți */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Clienți Existenți</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {clients.slice(0, 10).map((client, i) => (
                  <div 
                    key={i}
                    className="border rounded p-2 cursor-pointer hover:bg-indigo-50 text-sm"
                    onClick={() => selectClient(client)}
                  >
                    <p className="font-medium">{client.company || client.name}</p>
                    <p className="text-xs text-gray-500">{client.totalOrders} cmd • {client.totalValue?.toFixed(0)} RON</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Date client */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Date Client</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nume contact"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Nume companie *"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={clientCui}
                  onChange={(e) => setClientCui(e.target.value)}
                  placeholder="CUI / CIF"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Termeni contract */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Termeni Contract</h3>
              <div className="space-y-3">
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="furnizare">Contract furnizare</option>
                  <option value="cadru">Acord cadru</option>
                  <option value="distributie">Contract distribuție</option>
                  <option value="parteneriat">Parteneriat</option>
                </select>
                <textarea
                  value={products}
                  onChange={(e) => setProducts(e.target.value)}
                  placeholder="Produse/servicii (opțional)"
                  rows={2}
                  className="w-full border rounded px-3 py-2 text-sm resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="Discount %"
                    className="border rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Durată"
                    className="border rounded px-3 py-2 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Termeni plată"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={generateContract}
                  disabled={generating || !clientCompany}
                  className="w-full bg-indigo-600 text-white py-2 rounded font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generating ? "Generez contract..." : "📄 Generează Contract"}
                </button>
              </div>
            </div>
          </div>

          {/* Contract generat */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Contract Generat</h2>
              {contract && (
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(contract.fullText)}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                  >
                    📋 Copiază
                  </button>
                  <button
                    onClick={downloadAsDoc}
                    className="text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded"
                  >
                    📥 Descarcă
                  </button>
                </div>
              )}
            </div>

            {generating ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-600">Generez contractul...</p>
                <p className="text-xs text-gray-400 mt-2">Poate dura 30-60 secunde</p>
              </div>
            ) : contract ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-indigo-50 rounded p-4 text-center">
                  <p className="font-bold text-lg text-indigo-800">{contract.title}</p>
                  <p className="text-sm text-indigo-600">Nr. {contract.contractNumber}</p>
                  <p className="text-xs text-indigo-500 mt-1">Durată: {contract.duration}</p>
                </div>

                {/* Părți */}
                {contract.parties && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500 mb-1">FURNIZOR</p>
                      <p className="font-medium text-sm">{contract.parties.supplier?.name}</p>
                      <p className="text-xs text-gray-600">{contract.parties.supplier?.cui}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500 mb-1">CLIENT</p>
                      <p className="font-medium text-sm">{contract.parties.client?.name}</p>
                      <p className="text-xs text-gray-600">{contract.parties.client?.cui}</p>
                    </div>
                  </div>
                )}

                {/* Clauze */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {contract.clauses?.map((clause, i) => (
                    <div key={i} className="border rounded p-3">
                      <p className="font-semibold text-gray-800 text-sm mb-1">
                        Art. {clause.number}. {clause.title}
                      </p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{clause.content}</p>
                    </div>
                  ))}
                </div>

                {/* Full text */}
                {contract.fullText && !contract.clauses?.length && (
                  <div className="border rounded p-4 max-h-[500px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans">{contract.fullText}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500">Completează datele și generează contractul</p>
                <p className="text-xs text-gray-400 mt-2">Contracte profesionale conforme cu legislația română</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
