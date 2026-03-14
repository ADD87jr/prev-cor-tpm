"use client";
import { useEffect, useState } from "react";

export default function MagazinOnline() {
  const produseDemo = [
    // Software industrial
    "SCADA",
    "BMS",
    "MES",
    "Digital twin",
    "Licențe PLC",
    // Service
    "Instalare",
    "Programare",
    "Mentenanță",
    "Retrofit",
    // Siguranta industriala
    "Relay-uri safety",
    "Bariere fotoelectrice",
    "Butoane E-stop",
    // Robotica
    "Roboti industriali",
    "Cobots",
    "End-effectors",
    "AGV/AMR",
    // Pneumatica & hidraulica
    "Cilindri",
    "Valve",
    "Actuatoare",
    "Pompe"
  ];
  const [products, setProducts] = useState<Array<{ id: number; name: string; productCode?: string; price: number; listPrice?: number; purchasePrice?: number; stock: number; type: string; domain: string; image: string; currency: string; discount?: { value: number; type: "percent" | "fixed"; }; }>>([]);
  const [filterType, setFilterType] = useState<string>("");
  const [filterDomain, setFilterDomain] = useState<string>("");
  const [filterCurrency, setFilterCurrency] = useState<string>("");
  const [sortPrice, setSortPrice] = useState<string>("");

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(setProducts);
  }, []);

  // Opțiuni fixe conform specificului firmei
  const typeOptions = [
    // Automatizare industriala
    "PLC",
    "HMI",
    "Panouri",
    "Module I/O",
    "Drive-uri",
    // Senzori & IIoT
    "Senzori",
    "Gateway-uri",
    "Edge computing",
    "Retelistică industrială",
    // Echipamente electrice
    "Contactoare",
    "Protecții",
    "Cabluri industriale",
    "UPS",
    // Pneumatica & hidraulica
    "Cilindri",
    "Valve",
    "Actuatoare",
    "Pompe"
  ];
  const domainOptions = [
    "Automatizare industriala",
    "Senzori & IIoT",
    "Echipamente electrice",
    "Pneumatica & hidraulica",
    "Robotica",
    "Siguranta industriala",
    "Software industrial",
    "Service"
  ];
  const currencyOptions = ["RON", "EUR"];

  // Filtrare și sortare
  let filtered = products.filter(prod =>
    (!filterType || prod.type === filterType) &&
    (!filterDomain || prod.domain === filterDomain) &&
    (!filterCurrency || prod.currency === filterCurrency)
  );
  if (sortPrice === "asc") filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sortPrice === "desc") filtered = [...filtered].sort((a, b) => b.price - a.price);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Magazin Online</h1>
      <div className="flex gap-4 mb-6 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded px-2 py-1">
          <option value="">SUB-DOMENII</option>
          {typeOptions.map(opt => <option key={opt} value={opt}>{opt.toLowerCase()}</option>)}
        </select>
        <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Toate domeniile</option>
          {domainOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Toate monedele</option>
          {currencyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select value={sortPrice} onChange={e => setSortPrice(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Sortare preț</option>
          <option value="asc">Preț crescător</option>
          <option value="desc">Preț descrescător</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map(prod => (
          <div key={prod.id} className="border rounded-xl shadow p-4 flex flex-col items-center">
            {prod.image && <img src={prod.image} alt={prod.name} className="w-32 h-32 object-cover rounded mb-2" />}
            <h2 className="font-semibold text-lg mb-1">{prod.name}</h2>
            {prod.productCode && (
              <div className="mb-1 text-xs text-gray-500 font-mono">Cod produs: {prod.productCode}</div>
            )}
            {/* Preț - price este deja prețul final cu discount aplicat */}
            {prod.listPrice && prod.listPrice > prod.price ? (
              <div className="mb-1">
                <span className="line-through text-gray-400 text-base mr-2">{prod.listPrice} {prod.currency}</span>
                <span className="font-bold text-lg text-green-700 mr-2">
                  {prod.price} {prod.currency}
                </span>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">-{Math.round((1 - prod.price / prod.listPrice) * 100)}%</span>
              </div>
            ) : (
              <div className="mb-1">Preț: {prod.price} {prod.currency}</div>
            )}
            <div className="mb-1">Stoc: {prod.stock}</div>
            <div className="mb-1">Tip: {prod.type}</div>
            <div className="mb-1">Domeniu: {prod.domain}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
