
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

type Product = {
  name: string;
  price: number;
  stock: number;
  type: string;
  domain: string;
};

export default function StatsPanel({ products }: { products: Product[] }) {
  // Statistici detaliate
  const totalProducts = products.length;
  const totalStock = products.reduce((sum: number, p: Product) => sum + (p.stock || 0), 0);
  const avgPrice = products.length ? (products.reduce((sum: number, p: Product) => sum + (p.price || 0), 0) / products.length).toFixed(2) : 0;
  const lowStock = products.filter((p: Product) => p.stock <= 5).length;
  const totalStockValue = products.reduce((sum: number, p: Product) => sum + (p.price * (p.stock || 0)), 0);
  const maxPrice = products.reduce((max: number, p: Product) => Math.max(max, p.price || 0), 0);
  const minPrice = products.reduce((min: number, p: Product) => Math.min(min, p.price || 0), products.length ? products[0].price : 0);
  const mostExpensive = products.find((p: Product) => p.price === maxPrice);
  const cheapest = products.find((p: Product) => p.price === minPrice);
  const topLowStock = [...products].sort((a: Product, b: Product) => a.stock - b.stock).slice(0, 3);
  const topHighStock = [...products].sort((a: Product, b: Product) => b.stock - a.stock).slice(0, 3);
  // Distribuție pe tip
  const typeDist: Record<string, number> = {};
  products.forEach((p: Product) => { typeDist[p.type] = (typeDist[p.type] || 0) + 1; });
  const typeData = Object.entries(typeDist).map(([type, count]) => ({ type, count }));
  // Distribuție pe domeniu
  const domainDist: Record<string, number> = {};
  products.forEach((p: Product) => { domainDist[p.domain] = (domainDist[p.domain] || 0) + 1; });
  const domainData = Object.entries(domainDist).map(([domain, count]) => ({ domain, count }));
  // Grafic stoc pe produs
  const chartData = products.map((p: Product) => ({ name: p.name, Stoc: p.stock, Valoare: (p.price * (p.stock || 0)) }));
  // Culori pentru pie chart
  const COLORS = ["#2563eb", "#22c55e", "#f59e42", "#e11d48", "#a21caf", "#0e7490", "#fbbf24", "#84cc16", "#f472b6", "#6366f1"];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="font-semibold">Total:</span> {totalProducts}</div>
        <div><span className="font-semibold">Stoc total:</span> {totalStock}</div>
        <div><span className="font-semibold">Valoare totală stoc:</span> {totalStockValue} RON</div>
        <div><span className="font-semibold">Preț mediu:</span> {avgPrice} RON</div>
        <div><span className="font-semibold">Cel mai scump:</span> {mostExpensive?.name} ({maxPrice} RON)</div>
        <div><span className="font-semibold">Cel mai ieftin:</span> {cheapest?.name} ({minPrice} RON)</div>
        <div><span className="font-semibold">Stoc mic (&le;5):</span> {lowStock}</div>
        <div><span className="font-semibold">Top 3 stoc minim:</span> {topLowStock.map(p => p.name + ' (' + p.stock + ')').join(", ")}</div>
        <div><span className="font-semibold">Top 3 stoc maxim:</span> {topHighStock.map(p => p.name + ' (' + p.stock + ')').join(", ")}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grafic stoc pe produs */}
        <div className="h-48">
          <h3 className="font-semibold mb-1 text-sm">Stoc pe produs</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Stoc" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Grafic valoare stoc pe produs */}
        <div className="h-48">
          <h3 className="font-semibold mb-1 text-sm">Valoare stoc pe produs</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Valoare" fill="#f59e42" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Distribuție pe tip */}
        <div className="h-48">
          <h3 className="font-semibold mb-1 text-sm">Distribuție pe tip</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={typeData} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={60} label>
                {typeData.map((entry, idx) => <Cell key={entry.type} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Distribuție pe domeniu */}
        <div className="h-48">
          <h3 className="font-semibold mb-1 text-sm">Distribuție pe domeniu</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={domainData} dataKey="count" nameKey="domain" cx="50%" cy="50%" outerRadius={60} label>
                {domainData.map((entry, idx) => <Cell key={entry.domain} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
  </div>
  );
}

