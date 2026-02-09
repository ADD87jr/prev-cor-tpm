"use client";

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";

interface Order {
  id: number;
  number: string | null;
  date: string;
  total: number;
  status: string;
  items: any[];
  clientData: any;
  paymentMethod: string | null;
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"luna" | "an" | "custom">("luna");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  // Filtru comenzi
  const filteredOrders = orders.filter((o) => {
    const orderDate = new Date(o.date);
    if (period === "luna") {
      return orderDate.getMonth() === selectedMonth && orderDate.getFullYear() === selectedYear;
    } else if (period === "an") {
      return orderDate.getFullYear() === selectedYear;
    } else if (period === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return orderDate >= start && orderDate <= end;
    }
    return true;
  });

  // Statistici
  const totalVenituri = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalComenzi = filteredOrders.length;
  const comandiLivrate = filteredOrders.filter((o) => o.status === "delivered").length;
  const comandiAnulate = filteredOrders.filter((o) => o.status === "cancelled").length;
  const mediaComanda = totalComenzi > 0 ? totalVenituri / totalComenzi : 0;

  // Grupare pe zile/luni
  const groupedByDate = filteredOrders.reduce((acc, o) => {
    const date = new Date(o.date).toLocaleDateString("ro-RO");
    if (!acc[date]) acc[date] = { count: 0, total: 0 };
    acc[date].count++;
    acc[date].total += o.total || 0;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  // Export CSV
  const exportCSV = () => {
    const headers = ["ID", "Numar", "Data", "Client", "Email", "Total", "Status", "Plata"];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.number || "",
      new Date(o.date).toLocaleDateString("ro-RO"),
      o.clientData?.name || o.clientData?.nume || "",
      o.clientData?.email || "",
      o.total.toFixed(2),
      o.status,
      o.paymentMethod || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `raport-vanzari-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Export Excel (TSV)
  const exportExcel = () => {
    const headers = ["ID", "Numar", "Data", "Client", "Email", "Total", "Status", "Plata"];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.number || "",
      new Date(o.date).toLocaleDateString("ro-RO"),
      o.clientData?.name || o.clientData?.nume || "",
      o.clientData?.email || "",
      o.total.toFixed(2),
      o.status,
      o.paymentMethod || "",
    ]);

    const tsv = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    const blob = new Blob(["\uFEFF" + tsv], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `raport-vanzari-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
  };

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 82, 155);
    doc.text("Raport Vanzari - PREV-COR TPM", pageWidth / 2, 20, { align: "center" });
    
    // Perioada
    let perioadaText = "";
    if (period === "luna") {
      perioadaText = `Luna: ${months[selectedMonth]} ${selectedYear}`;
    } else if (period === "an") {
      perioadaText = `Anul: ${selectedYear}`;
    } else if (customStart && customEnd) {
      perioadaText = `${customStart} - ${customEnd}`;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(perioadaText, pageWidth / 2, 30, { align: "center" });
    doc.text(`Generat: ${new Date().toLocaleString("ro-RO")}`, pageWidth / 2, 37, { align: "center" });
    
    // Statistici
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    let y = 50;
    doc.text(`Total Venituri: ${totalVenituri.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON`, 20, y);
    doc.text(`Total Comenzi: ${totalComenzi}`, 120, y);
    y += 8;
    doc.text(`Media/Comanda: ${mediaComanda.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON`, 20, y);
    doc.text(`Livrate: ${comandiLivrate} | Anulate: ${comandiAnulate}`, 120, y);
    
    // Tabel comenzi
    y += 15;
    doc.setFontSize(10);
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 5, pageWidth - 30, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.text("Nr.", 18, y);
    doc.text("Data", 35, y);
    doc.text("Client", 65, y);
    doc.text("Total", 130, y);
    doc.text("Status", 160, y);
    
    y += 8;
    doc.setFontSize(9);
    
    filteredOrders.slice(0, 40).forEach((order, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(order.number || order.id.toString(), 18, y);
      doc.text(new Date(order.date).toLocaleDateString("ro-RO"), 35, y);
      doc.text((order.clientData?.name || order.clientData?.nume || "-").substring(0, 25), 65, y);
      doc.text(`${order.total.toFixed(2)} RON`, 130, y);
      doc.text(order.status, 160, y);
      y += 6;
    });
    
    if (filteredOrders.length > 40) {
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`... si alte ${filteredOrders.length - 40} comenzi (exportati CSV/Excel pentru lista completa)`, 20, y);
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("PREV-COR TPM - Raport generat automat", pageWidth / 2, 290, { align: "center" });
    
    doc.save(`raport-vanzari-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const months = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
  ];

  if (loading) return <div className="p-8">Se încarcă...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Rapoarte Vânzări</h1>

      {/* Filtre perioadă */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold mb-1">Perioadă</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="border rounded px-3 py-2"
            >
              <option value="luna">Lunar</option>
              <option value="an">Anual</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {period === "luna" && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1">Luna</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="border rounded px-3 py-2"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">An</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border rounded px-3 py-2"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {period === "an" && (
            <div>
              <label className="block text-sm font-semibold mb-1">An</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {period === "custom" && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1">De la</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Până la</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>
            </>
          )}

          <div className="ml-auto flex gap-2">
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
            >
              📥 Export CSV
            </button>
            <button
              onClick={exportExcel}
              className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
            >
              📊 Export Excel
            </button>
            <button
              onClick={exportPDF}
              className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700"
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Statistici */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-green-100 rounded-xl p-4 text-center">
          <div className="text-sm text-green-700 font-semibold">Total Venituri</div>
          <div className="text-2xl font-bold text-green-800">{totalVenituri.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON</div>
        </div>
        <div className="bg-blue-100 rounded-xl p-4 text-center">
          <div className="text-sm text-blue-700 font-semibold">Total Comenzi</div>
          <div className="text-2xl font-bold text-blue-800">{totalComenzi}</div>
        </div>
        <div className="bg-purple-100 rounded-xl p-4 text-center">
          <div className="text-sm text-purple-700 font-semibold">Medie/Comandă</div>
          <div className="text-2xl font-bold text-purple-800">{mediaComanda.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON</div>
        </div>
        <div className="bg-emerald-100 rounded-xl p-4 text-center">
          <div className="text-sm text-emerald-700 font-semibold">Livrate</div>
          <div className="text-2xl font-bold text-emerald-800">{comandiLivrate}</div>
        </div>
        <div className="bg-red-100 rounded-xl p-4 text-center">
          <div className="text-sm text-red-700 font-semibold">Anulate</div>
          <div className="text-2xl font-bold text-red-800">{comandiAnulate}</div>
        </div>
      </div>

      {/* Tabel zilnic */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-bold text-gray-700">Detalii pe zile</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Data</th>
              <th className="px-4 py-2 text-right">Nr. Comenzi</th>
              <th className="px-4 py-2 text-right">Total Venituri</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedByDate)
              .sort((a, b) => new Date(b[0].split(".").reverse().join("-")).getTime() - new Date(a[0].split(".").reverse().join("-")).getTime())
              .slice(0, 30)
              .map(([date, data]) => (
                <tr key={date} className="border-b hover:bg-blue-50">
                  <td className="px-4 py-2">{date}</td>
                  <td className="px-4 py-2 text-right">{data.count}</td>
                  <td className="px-4 py-2 text-right font-semibold">{data.total.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON</td>
                </tr>
              ))}
            {Object.keys(groupedByDate).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Nicio comandă în perioada selectată
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
