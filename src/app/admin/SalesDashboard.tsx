import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { exportToCSV, exportToExcel } from "./exportUtils";
import OrderDetailsModal from "./OrderDetailsModal";


type Period = "zile" | "saptamani" | "luni" | "ani";

export default function SalesDashboard({ products, orders, cheltuieli = [] }: { products: any[]; orders: any[]; cheltuieli?: any[] }) {
      const [modalOpen, setModalOpen] = useState(false);
      const [modalOrders, setModalOrders] = useState<any[]>([]);
      const [modalTitle, setModalTitle] = useState<string>("");
    // Extrage toate tipurile și domeniile distincte
    const allTypes = Array.from(new Set(products.map((p: any) => p.type).filter(Boolean)));
    const allDomains = Array.from(new Set(products.map((p: any) => p.domain).filter(Boolean)));

    // Filtre pentru fiecare grafic
    const [typeFilterSales, setTypeFilterSales] = useState<string>("");
    const [domainFilterSales, setDomainFilterSales] = useState<string>("");
    const [typeFilterEntries, setTypeFilterEntries] = useState<string>("");
    const [domainFilterEntries, setDomainFilterEntries] = useState<string>("");
    const [typeFilterExits, setTypeFilterExits] = useState<string>("");
    const [domainFilterExits, setDomainFilterExits] = useState<string>("");
  const [periodAll, setPeriodAll] = useState<Period>("zile");
  const [customAllStart, setCustomAllStart] = useState<string>("");
  const [customAllEnd, setCustomAllEnd] = useState<string>("");
  // General: combină toate categoriile
  let labelsAll = getLabels(periodAll);
  // Dacă există filtru custom, suprascrie labelsAll cu datele din interval
  if (customAllStart && customAllEnd) {
    const start = new Date(customAllStart);
    const end = new Date(customAllEnd);
    labelsAll = [];
    let d = new Date(start);
    while (d <= end) {
      labelsAll.push(formatDate(new Date(d), "zile"));
      d.setDate(d.getDate() + 1);
    }
  }
  const salesAll = labelsAll.map(label => {
    let total = 0;
    orders.forEach((o: any) => {
      if (!o.date) return;
      const d = new Date(o.date);
      if (formatDate(d, "zile") === label) total += o.total || 0;
    });
    return total;
  });
  const entriesAll = labelsAll.map(label => {
    let count = 0;
    products.forEach((p: any) => {
      const d = new Date(p.id);
      if (formatDate(d, "zile") === label) count++;
    });
    return count;
  });
  const exitsAll = labelsAll.map(label => {
    let count = 0;
    orders.forEach((o: any) => {
      if (!o.date) return;
      const d = new Date(o.date);
      if (formatDate(d, "zile") === label && Array.isArray(o.items)) {
        count += o.items.reduce((s: number, it: any) => s + (it.quantity || 0), 0);
      }
    });
    return count;
  });
  // Cheltuieli pe perioadă (folosește aceleași labeluri ca restul)
  const cheltuieliAll = labelsAll.map(label => {
    let total = 0;
    cheltuieli.forEach((c: any) => {
      if (!c.data) return;
      const d = new Date(c.data);
      if (formatDate(d, periodAll) === label) total += c.suma || 0;
    });
    return total;
  });
  const chartDataAll = labelsAll.map((label, i) => ({
    label,
    Vanzari: salesAll[i],
    Intrari: entriesAll[i],
    Iesiri: exitsAll[i],
    Cheltuieli: cheltuieliAll[i],
  }));
  const [periodSales, setPeriodSales] = useState<Period>("zile");
  const [customSalesStart, setCustomSalesStart] = useState<string>("");
  const [customSalesEnd, setCustomSalesEnd] = useState<string>("");
  const [periodEntries, setPeriodEntries] = useState<Period>("zile");
  const [customEntriesStart, setCustomEntriesStart] = useState<string>("");
  const [customEntriesEnd, setCustomEntriesEnd] = useState<string>("");
  const [periodExits, setPeriodExits] = useState<Period>("zile");
  const [customExitsStart, setCustomExitsStart] = useState<string>("");
  const [customExitsEnd, setCustomExitsEnd] = useState<string>("");

  // Helper pentru formatare dată
  function formatDate(date: Date, p: Period) {
    if (p === "zile") return date.toISOString().slice(0, 10);
    if (p === "saptamani") {
      const y = date.getFullYear();
      const w = getWeekNumber(date);
      return `${y}-S${w}`;
    }
    if (p === "luni") return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,"0")}`;
    if (p === "ani") return `${date.getFullYear()}`;
    return "";
  }
  function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil(((d.getTime() - yearStart.getTime())/86400000+1)/7);
  }


  // Helper pentru generare labeluri pe perioadă
  function getLabels(period: Period) {
    const now = new Date();
    if (period === "zile") {
      return Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (13 - i));
        return formatDate(d, period);
      });
    } else if (period === "saptamani") {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (7 * (11 - i)));
        return formatDate(d, period);
      });
    } else if (period === "luni") {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(now.getMonth() - (11 - i));
        return formatDate(d, period);
      });
    } else if (period === "ani") {
      return Array.from({ length: 5 }, (_, i) => {
        const d = new Date(now);
        d.setFullYear(now.getFullYear() - (4 - i));
        return formatDate(d, period);
      });
    }
    return [];
  }

  // Vânzări
  let labelsSales = getLabels(periodSales);
  if (customSalesStart && customSalesEnd) {
    const start = new Date(customSalesStart);
    const end = new Date(customSalesEnd);
    labelsSales = [];
    let d = new Date(start);
    while (d <= end) {
      labelsSales.push(formatDate(new Date(d), "zile"));
      d.setDate(d.getDate() + 1);
    }
  }
  // Filtrare produse și comenzi pentru vânzări
  const filteredOrdersSales = orders.filter((o: any) => {
    if (!o.items || (!typeFilterSales && !domainFilterSales)) return true;
    // Dacă există filtru, cel puțin un item trebuie să corespundă
    return o.items.some((it: any) => {
      const prod = products.find((p: any) => p.id === it.id);
      if (!prod) return false;
      if (typeFilterSales && prod.type !== typeFilterSales) return false;
      if (domainFilterSales && prod.domain !== domainFilterSales) return false;
      return true;
    });
  });
  const sales = labelsSales.map(label => {
    let total = 0;
    filteredOrdersSales.forEach((o: any) => {
      if (!o.date) return;
      const d = new Date(o.date);
      if (formatDate(d, "zile") === label) total += o.total || 0;
    });
    return { label, Vanzari: total };
  });

  // Intrări
  let labelsEntries = getLabels(periodEntries);
  if (customEntriesStart && customEntriesEnd) {
    const start = new Date(customEntriesStart);
    const end = new Date(customEntriesEnd);
    labelsEntries = [];
    let d = new Date(start);
    while (d <= end) {
      labelsEntries.push(formatDate(new Date(d), "zile"));
      d.setDate(d.getDate() + 1);
    }
  }
  // Filtrare produse pentru intrări
  const filteredProductsEntries = products.filter((p: any) => {
    if (typeFilterEntries && p.type !== typeFilterEntries) return false;
    if (domainFilterEntries && p.domain !== domainFilterEntries) return false;
    return true;
  });
  const entries = labelsEntries.map(label => {
    let count = 0;
    filteredProductsEntries.forEach((p: any) => {
      const d = new Date(p.id);
      if (formatDate(d, "zile") === label) count++;
    });
    return { label, Intrari: count };
  });

  // Ieșiri
  let labelsExits = getLabels(periodExits);
  if (customExitsStart && customExitsEnd) {
    const start = new Date(customExitsStart);
    const end = new Date(customExitsEnd);
    labelsExits = [];
    let d = new Date(start);
    while (d <= end) {
      labelsExits.push(formatDate(new Date(d), "zile"));
      d.setDate(d.getDate() + 1);
    }
  }
  // Filtrare comenzi pentru ieșiri
  const filteredOrdersExits = orders.filter((o: any) => {
    if (!o.items || (!typeFilterExits && !domainFilterExits)) return true;
    // Cel puțin un item trebuie să corespundă
    return o.items.some((it: any) => {
      const prod = products.find((p: any) => p.id === it.id);
      if (!prod) return false;
      if (typeFilterExits && prod.type !== typeFilterExits) return false;
      if (domainFilterExits && prod.domain !== domainFilterExits) return false;
      return true;
    });
  });
  const exits = labelsExits.map(label => {
    let count = 0;
    filteredOrdersExits.forEach((o: any) => {
      if (!o.date) return;
      const d = new Date(o.date);
      if (formatDate(d, "zile") === label && Array.isArray(o.items)) {
        count += o.items.reduce((s: number, it: any) => {
          const prod = products.find((p: any) => p.id === it.id);
          if (!prod) return s;
          if (typeFilterExits && prod.type !== typeFilterExits) return s;
          if (domainFilterExits && prod.domain !== domainFilterExits) return s;
          return s + (it.quantity || 0);
        }, 0);
      }
    });
    return { label, Iesiri: count };
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Grafic general */}
      <div className="h-72 w-full flex flex-col gap-2 md:gap-3">
        <div className="flex flex-wrap gap-3 md:gap-4 items-center mb-1">
          <span className="font-bold text-base md:text-lg">Grafic general - Perioadă:</span>
          <div className="relative">
            <select
              value={periodAll}
              onChange={e => setPeriodAll(e.target.value as Period)}
              className="border rounded px-2 py-1 pr-8 focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-colors appearance-none cursor-pointer z-[1000] !pointer-events-auto"
              style={{ zIndex: 1000, pointerEvents: 'auto' }}
              aria-label="Selectează perioada pentru grafic general"
            >
              <option value="zile">Zile</option>
              <option value="saptamani">Săptămâni</option>
              <option value="luni">Luni</option>
              <option value="ani">Ani</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
              ▼
            </span>
          </div>
          <span className="ml-2 font-medium">sau interval personalizat:</span>
          <input type="date" value={customAllStart} onChange={e => setCustomAllStart(e.target.value)} className="border rounded px-2 py-1" />
          <span>-</span>
          <input type="date" value={customAllEnd} onChange={e => setCustomAllEnd(e.target.value)} className="border rounded px-2 py-1" />
          {(customAllStart || customAllEnd) && (
            <button onClick={() => { setCustomAllStart(""); setCustomAllEnd(""); }} className="ml-2 text-red-600 underline text-sm">Resetează</button>
          )}
        </div>
        <div className="flex gap-2 mt-1 mb-2">
          <button onClick={() => exportToCSV(chartDataAll, `grafic_general.csv`)} className="border px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100">Export CSV</button>
          <button onClick={() => exportToExcel(chartDataAll, `grafic_general.xlsx`)} className="border px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 ml-2">Export Excel</button>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartDataAll} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} barCategoryGap={24} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={12} angle={-20} height={60} interval={0} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Vanzari" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Intrari" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Iesiri" fill="#f59e42" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Cheltuieli" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Vânzări */}
      <div className="h-64 w-full flex flex-col gap-2 md:gap-3">
        <div className="flex flex-wrap gap-3 md:gap-4 items-center mb-1">
          <span className="font-bold text-base md:text-lg">Vânzări - Perioadă:</span>
          <div className="relative">
            <select
              value={periodSales}
              onChange={e => setPeriodSales(e.target.value as Period)}
              className="border rounded px-2 py-1 pr-8 focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-colors appearance-none cursor-pointer z-[1000] !pointer-events-auto"
              style={{ zIndex: 1000, pointerEvents: 'auto' }}
              aria-label="Selectează perioada pentru vânzări"
            >
              <option value="zile">Zile</option>
              <option value="saptamani">Săptămâni</option>
              <option value="luni">Luni</option>
              <option value="ani">Ani</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
              ▼
            </span>
          </div>
          <span className="ml-2 font-medium">sau interval personalizat:</span>
          <input type="date" value={customSalesStart} onChange={e => setCustomSalesStart(e.target.value)} className="border rounded px-2 py-1" />
          <span>-</span>
          <input type="date" value={customSalesEnd} onChange={e => setCustomSalesEnd(e.target.value)} className="border rounded px-2 py-1" />
          {(customSalesStart || customSalesEnd) && (
            <button onClick={() => { setCustomSalesStart(""); setCustomSalesEnd(""); }} className="ml-2 text-red-600 underline text-sm">Resetează</button>
          )}
          {/* Filtru tip și domeniu pentru vânzări */}
          <span className="ml-4 font-medium">Filtru categorie:</span>
          <select value={typeFilterSales} onChange={e => setTypeFilterSales(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Toate tipurile</option>
            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="ml-2 font-medium">Domeniu:</span>
          <select value={domainFilterSales} onChange={e => setDomainFilterSales(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Toate domeniile</option>
            {allDomains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex gap-2 mt-1 mb-2">
          <button onClick={() => exportToCSV(sales, `vanzari.csv`)} className="border px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100">Export CSV</button>
          <button onClick={() => exportToExcel(sales, `vanzari.xlsx`)} className="border px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 ml-2">Export Excel</button>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sales}
            margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
            onClick={state => {
              if (!state || !state.activeLabel) return;
              const label = state.activeLabel;
              const filteredOrders = orders.filter((o: any) => {
                if (!o.date) return false;
                const d = new Date(o.date);
                return (formatDate(d, "zile") === label);
              });
              setModalOrders(filteredOrders);
              setModalTitle(`Comenzi vânzări pentru ${label}`);
              setModalOpen(true);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={10} angle={-20} height={60} interval={0} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="Vanzari" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Intrări */}
      <div className="h-64 w-full flex flex-col gap-2 md:gap-3">
        <div className="flex flex-wrap gap-3 md:gap-4 items-center mb-1">
          <span className="font-bold text-base md:text-lg">Intrări - Perioadă:</span>
          <div className="relative">
            <select
              value={periodEntries}
              onChange={e => setPeriodEntries(e.target.value as Period)}
              className="border rounded px-2 py-1 pr-8 focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-colors appearance-none cursor-pointer z-[1000] !pointer-events-auto"
              style={{ zIndex: 1000, pointerEvents: 'auto' }}
              aria-label="Selectează perioada pentru intrări"
            >
              <option value="zile">Zile</option>
              <option value="saptamani">Săptămâni</option>
              <option value="luni">Luni</option>
              <option value="ani">Ani</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
              ▼
            </span>
          </div>
          <span className="ml-2 font-medium">sau interval personalizat:</span>
          <input type="date" value={customEntriesStart} onChange={e => setCustomEntriesStart(e.target.value)} className="border rounded px-2 py-1" />
          <span>-</span>
          <input type="date" value={customEntriesEnd} onChange={e => setCustomEntriesEnd(e.target.value)} className="border rounded px-2 py-1" />
          {(customEntriesStart || customEntriesEnd) && (
            <button onClick={() => { setCustomEntriesStart(""); setCustomEntriesEnd(""); }} className="ml-2 text-red-600 underline text-sm">Resetează</button>
          )}
          {/* Filtru tip și domeniu pentru intrări */}
          <span className="ml-4 font-medium">Filtru categorie:</span>
          <select value={typeFilterEntries} onChange={e => setTypeFilterEntries(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Toate tipurile</option>
            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="ml-2 font-medium">Domeniu:</span>
          <select value={domainFilterEntries} onChange={e => setDomainFilterEntries(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Toate domeniile</option>
            {allDomains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex gap-2 mt-1 mb-2">
          <button onClick={() => exportToCSV(entries, `intrari.csv`)} className="border px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100">Export CSV</button>
          <button onClick={() => exportToExcel(entries, `intrari.xlsx`)} className="border px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 ml-2">Export Excel</button>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={entries} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={10} angle={-20} height={60} interval={0} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="Intrari" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Ieșiri */}
      <div className="h-64 w-full flex flex-col gap-2 md:gap-3">
        <div className="flex flex-wrap gap-3 md:gap-4 items-center mb-1">
          <span className="font-bold text-base md:text-lg">Ieșiri - Perioadă:</span>
          <div className="relative">
            <select
              value={periodExits}
              onChange={e => setPeriodExits(e.target.value as Period)}
              className="border rounded px-2 py-1 pr-8 focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-colors appearance-none cursor-pointer z-[1000] !pointer-events-auto"
              style={{ zIndex: 1000, pointerEvents: 'auto' }}
              aria-label="Selectează perioada pentru ieșiri"
            >
              <option value="zile">Zile</option>
              <option value="saptamani">Săptămâni</option>
              <option value="luni">Luni</option>
              <option value="ani">Ani</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
              ▼
            </span>
          </div>
          <span className="ml-2 font-medium">sau interval personalizat:</span>
          <input type="date" value={customExitsStart} onChange={e => setCustomExitsStart(e.target.value)} className="border rounded px-2 py-1" />
          <span>-</span>
          <input type="date" value={customExitsEnd} onChange={e => setCustomExitsEnd(e.target.value)} className="border rounded px-2 py-1" />
          {(customExitsStart || customExitsEnd) && (
            <button onClick={() => { setCustomExitsStart(""); setCustomExitsEnd(""); }} className="ml-2 text-red-600 underline text-sm">Resetează</button>
          )}
          {/* Filtru tip și domeniu pentru ieșiri */}
          <span className="ml-4 font-medium">Filtru categorie:</span>
          <select value={typeFilterExits} onChange={e => setTypeFilterExits(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Toate tipurile</option>
            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="ml-2 font-medium">Domeniu:</span>
          <select value={domainFilterExits} onChange={e => setDomainFilterExits(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Toate domeniile</option>
            {allDomains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex gap-2 mt-1 mb-2">
          <button onClick={() => exportToCSV(exits, `iesiri.csv`)} className="border px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100">Export CSV</button>
          <button onClick={() => exportToExcel(exits, `iesiri.xlsx`)} className="border px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 ml-2">Export Excel</button>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={exits}
            margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
            onClick={state => {
              if (!state || !state.activeLabel) return;
              const label = state.activeLabel;
              // Găsește comenzile pentru labelul selectat (ieșiri = comenzi cu produse livrate în acea zi)
              const filteredOrders = orders.filter((o: any) => {
                if (!o.date) return false;
                const d = new Date(o.date);
                return (formatDate(d, "zile") === label);
              });
              setModalOrders(filteredOrders);
              setModalTitle(`Comenzi ieșiri pentru ${label}`);
              setModalOpen(true);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={10} angle={-20} height={60} interval={0} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="Iesiri" fill="#f59e42" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <OrderDetailsModal open={modalOpen} onClose={() => setModalOpen(false)} orders={modalOrders} title={modalTitle} />
      
      {/* Top Produse Vândute */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-bold text-lg mb-3">🏆 Top 10 Produse Vândute</h3>
        {(() => {
          const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
          orders.forEach((o: any) => {
            if (!o.items) return;
            (Array.isArray(o.items) ? o.items : []).forEach((item: any) => {
              const key = String(item.id || item.name);
              if (!productSales[key]) productSales[key] = { name: item.name || "Produs", qty: 0, revenue: 0 };
              productSales[key].qty += Number(item.quantity || item.qty || 1);
              productSales[key].revenue += (Number(item.price) || 0) * Number(item.quantity || item.qty || 1);
            });
          });
          const sorted = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
          if (sorted.length === 0) return <p className="text-gray-400 text-sm">Nu există date.</p>;
          const maxRevenue = sorted[0]?.revenue || 1;
          return (
            <div className="space-y-2">
              {sorted.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 text-right font-bold text-gray-400 text-sm">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" title={p.name}>{p.name}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{p.qty} buc</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 mt-1 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600 whitespace-nowrap w-24 text-right">
                    {p.revenue.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Rata de Conversie & Metrici */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">Valoare medie comandă</div>
          <div className="text-2xl font-bold text-blue-600">
            {orders.length > 0
              ? (orders.reduce((s: number, o: any) => s + (o.total || 0), 0) / orders.length).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : "0.00"} RON
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">Rata livrare (din total)</div>
          <div className="text-2xl font-bold text-green-600">
            {orders.length > 0
              ? Math.round((orders.filter((o: any) => o.status === "livrată").length / orders.length) * 100)
              : 0}%
          </div>
          <div className="text-xs text-gray-400">{orders.filter((o: any) => o.status === "livrată").length} din {orders.length} comenzi</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">Număr produse unice vândute</div>
          <div className="text-2xl font-bold text-purple-600">
            {(() => {
              const ids = new Set<string>();
              orders.forEach((o: any) => {
                if (!o.items) return;
                (Array.isArray(o.items) ? o.items : []).forEach((it: any) => ids.add(String(it.id || it.name)));
              });
              return ids.size;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
