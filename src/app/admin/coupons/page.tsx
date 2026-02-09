"use client";

import { useState, useEffect } from "react";
import Toast from "@/components/Toast";

interface Coupon {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  expires?: string;
}

export default function AdminCouponsPage() {
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }
  const [formErr, setFormErr] = useState("");

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [appliedCode, setAppliedCode] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [form, setForm] = useState<Coupon>({ id: 0, code: "", type: "percent", value: 0, expires: "" });
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
  }, []);

  async function fetchCoupons() {
    const res = await fetch("/admin/api/coupons");
    const data = await res.json();
    setCoupons(data);
  }
  async function fetchProducts() {
    const res = await fetch("/admin/api/products");
    const data = await res.json();
    setProducts(data);
  }
  async function handleDeleteCoupon(id: number) {
    if (!window.confirm("Sigur vrei să ștergi acest cupon?")) return;
    const res = await fetch(`/admin/api/coupons?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Cupon șters cu succes!", "success");
      fetchCoupons();
    } else {
      showToast("Eroare la ștergere cupon!", "error");
    }
  }
  async function handleAddCoupon(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormErr("");
    if (!form.code.trim()) {
      setFormErr("Completează codul cuponului!");
      return;
    }
    if (!form.value || form.value <= 0) {
      setFormErr("Completează valoarea cuponului!");
      return;
    }
    const res = await fetch("/admin/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setForm({ id: 0, code: "", type: "percent", value: 0, expires: "" });
      showToast("Cupon adăugat cu succes!", "success");
      fetchCoupons();
    } else {
      showToast("Eroare la adăugare cupon!", "error");
    }
  }
  async function handleEditCoupon(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editCoupon) return;
    setStatus("");
    const res = await fetch("/admin/api/coupons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editCoupon)
    });
    if (res.ok) {
      showToast("Cupon modificat cu succes!", "success");
      setEditCoupon(null);
      fetchCoupons();
    } else {
      showToast("Eroare la editare cupon!", "error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
      <button onClick={() => window.location.href = '/admin'} className="mb-6 px-4 py-2 bg-blue-600 text-white rounded font-semibold shadow hover:bg-blue-700 transition">&larr; Înapoi la administrare</button>
      <h1 className="text-2xl font-bold mb-4">Administrare cupoane</h1>
      <form onSubmit={handleAddCoupon} className="mb-6 flex flex-wrap gap-2 items-end">
        <input
          type="text"
          placeholder="Cod cupon"
          className="border rounded px-3 py-2"
          value={form.code}
          onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
          required
        />
        <select
          value={form.type}
          onChange={e => setForm({ ...form, type: e.target.value as "percent" | "fixed" })}
          className="border rounded px-2 py-2"
        >
          <option value="percent">Procent (%)</option>
          <option value="fixed">Suma fixă (lei)</option>
        </select>
        <input
          type="number"
          placeholder="Valoare"
          className="border rounded px-3 py-2 w-24"
          value={form.value}
          onChange={e => setForm({ ...form, value: Number(e.target.value) })}
          required
        />
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={form.expires}
          onChange={e => setForm({ ...form, expires: e.target.value })}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">Adaugă cupon</button>
      </form>
      {status && <div className="mb-4 text-green-700 font-semibold">{status}</div>}
      <h2 className="font-bold mb-2">Cupoane existente</h2>
      <table className="w-full border mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Cod</th>
            <th className="p-2 text-left">Tip</th>
            <th className="p-2 text-left">Valoare</th>
            <th className="p-2 text-left">Expiră</th>
            <th className="p-2 text-left">Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          {coupons.length === 0 ? (
            <tr><td colSpan={5} className="p-2 text-center">Niciun cupon.</td></tr>
          ) : (
            coupons.map((coupon: Coupon) => (
              <tr key={coupon.id}>
                <td className="p-2 font-mono">{coupon.code}</td>
                <td className="p-2">{coupon.type === "percent" ? "%" : "lei"}</td>
                <td className="p-2">{coupon.value}</td>
                <td className="p-2">{coupon.expires ? coupon.expires : "-"}</td>
                <td className="p-2">
                  <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => handleDeleteCoupon(coupon.id)}>Șterge</button>
                  <button className="bg-yellow-500 text-white px-2 py-1 rounded ml-2" onClick={() => setEditCoupon(coupon)}>Editează</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {editCoupon && (
        <form onSubmit={handleEditCoupon} className="mb-6 p-4 border rounded bg-yellow-50">
          <h2 className="font-bold mb-2">Editează cuponul <span className="font-mono">{editCoupon.code}</span></h2>
          <div className="flex gap-2 mb-2">
            <select
              value={editCoupon.type}
              onChange={e => setEditCoupon({ ...editCoupon, type: e.target.value as "percent" | "fixed" })}
              className="border rounded px-2 py-2"
            >
              <option value="percent">Procent (%)</option>
              <option value="fixed">Suma fixă (lei)</option>
            </select>
            <input
              type="number"
              className="border rounded px-3 py-2 w-24"
              value={editCoupon.value}
              onChange={e => setEditCoupon({ ...editCoupon, value: Number(e.target.value) })}
              required
            />
            <input
              type="date"
              className="border rounded px-3 py-2"
              value={editCoupon.expires ?? ""}
              onChange={e => setEditCoupon({ ...editCoupon, expires: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-yellow-600 text-white px-4 py-2 rounded font-semibold">Salvează modificările</button>
            <button type="button" className="bg-gray-300 text-gray-700 px-4 py-2 rounded font-semibold" onClick={() => setEditCoupon(null)}>Anulează</button>
          </div>
        </form>
      )}
      <h2 className="font-bold mb-2">Aplică cupon pe produs</h2>
      <div className="flex gap-2 mb-4">
        <select className="border rounded px-3 py-2" value={selectedProduct ?? ""} onChange={e => {
          const val = e.target.value;
          setSelectedProduct(val === "" ? null : Number(val));
        }}>
          <option value="">Selectează produs</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          className="border rounded px-3 py-2"
          value={appliedCode}
          onChange={e => setAppliedCode(e.target.value)}
        >
          <option value="">Selectează cupon</option>
          {coupons.map(c => <option key={c.code} value={c.code}>{c.code} ({c.type === "percent" ? `${c.value}%` : `${c.value} lei`})</option>)}
        </select>
        <button
          type="button"
          className="bg-green-600 text-white px-4 py-2 rounded font-semibold"
          disabled={selectedProduct === null || appliedCode === ""}
          onClick={async () => {
            if (selectedProduct === null || appliedCode === "") {
              setStatus("Selectează produs și cupon!");
              return;
            }
            const coupon = coupons.find(c => c.code === appliedCode);
            if (!coupon) {
              setStatus("Cupon invalid!");
              return;
            }
            // Trimite update la API produse
            const res = await fetch(`/admin/api/products?id=${selectedProduct}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                couponCode: coupon.code,
                discount: coupon.type === "percent" ? coupon.value / 100 : coupon.value,
                discountType: coupon.type
              })
            });
            if (res.ok) {
              setStatus(`Cuponul ${appliedCode} a fost aplicat pe produs!`);
              fetchProducts();
            } else {
              setStatus("Eroare la aplicare cupon!");
            }
          }}
        >Aplică pe produs</button>
      </div>
    </div>
  );
}
