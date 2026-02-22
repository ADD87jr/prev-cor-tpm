"use client";
import { useEffect, useState } from "react";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

type Coupon = {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  validFrom: string;
  validTo: string;
  active: boolean;
};

export default function CouponAdmin() {
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<number | null>(null);
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<Omit<Coupon, "id">>({
    code: "",
    type: "percent",
    value: 0,
    validFrom: "",
    validTo: "",
    active: true,
  });
  const [editId, setEditId] = useState<number|null>(null);
  const [err, setErr] = useState("");

  function fetchCoupons() {
    fetch("/admin/api/coupons")
      .then(res => res.json())
      .then(setCoupons);
  }
  useEffect(() => { fetchCoupons(); }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!form.code || !form.value || !form.validFrom || !form.validTo) {
      setErr("Toate câmpurile sunt obligatorii!");
      return;
    }
    const method = editId ? "PUT" : "POST";
    const body = editId ? { ...form, id: editId } : form;
    fetch("/admin/api/coupons", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(res => {
        if (res.ok) {
          showToast(editId ? "Cupon salvat cu succes!" : "Cupon adăugat cu succes!", "success");
          return res.json();
        } else {
          showToast("Eroare la salvare cupon!", "error");
          throw new Error("Error");
        }
      })
      .then(() => {
        setForm({ code: "", type: "percent", value: 0, validFrom: "", validTo: "", active: true });
        setEditId(null);
        fetchCoupons();
      })
      .catch(() => {});
  }

  function handleEdit(c: Coupon) {
    setForm({ ...c });
    setEditId(c.id);
  }
  function handleDelete(id: number) {
    setDeleteCouponId(id);
  }
  
  function confirmDelete() {
    if (!deleteCouponId) return;
    fetch("/admin/api/coupons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteCouponId }),
    }).then(res => {
      if (res.ok) {
        showToast("Cupon șters cu succes!", "success");
        fetchCoupons();
      } else {
        showToast("Eroare la ștergere cupon!", "error");
      }
      setDeleteCouponId(null);
    });
  }

  return (
    <div>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end mb-4">
        <input name="code" value={form.code} onChange={handleChange} className="border rounded px-2 py-1" placeholder="Cod cupon" required />
        <select name="type" value={form.type} onChange={handleChange} className="border rounded px-2 py-1">
          <option value="percent">Reducere %</option>
          <option value="fixed">Reducere fixă (lei)</option>
        </select>
        <input name="value" value={form.value} onChange={handleChange} className="border rounded px-2 py-1" placeholder="Valoare" type="number" required min={1} />
        <input name="validFrom" value={form.validFrom} onChange={handleChange} className="border rounded px-2 py-1" type="date" required />
        <input name="validTo" value={form.validTo} onChange={handleChange} className="border rounded px-2 py-1" type="date" required />
        <select name="active" value={form.active ? "true" : "false"} onChange={e => setForm(f => ({ ...f, active: e.target.value === "true" }))} className="border rounded px-2 py-1">
          <option value="true">Activ</option>
          <option value="false">Inactiv</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">{editId ? "Salvează" : "Adaugă"}</button>
        {editId && <button type="button" className="bg-gray-300 px-3 py-1 rounded" onClick={() => { setEditId(null); setForm({ code: "", type: "percent", value: 0, validFrom: "", validTo: "", active: true }); }}>Anulează</button>}
        {err && <span className="text-red-600 text-sm ml-2">{err}</span>}
      </form>
      <table className="min-w-full text-sm border rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Cod</th>
            <th className="p-2">Tip</th>
            <th className="p-2">Valoare</th>
            <th className="p-2">Valabil de la</th>
            <th className="p-2">Până la</th>
            <th className="p-2">Status</th>
            <th className="p-2">Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map(c => (
            <tr key={c.id} className="border-b">
              <td className="p-2 font-mono">{c.code}</td>
              <td className="p-2">{c.type === "percent" ? "%" : "fixă"}</td>
              <td className="p-2">{c.value}</td>
              <td className="p-2">{c.validFrom}</td>
              <td className="p-2">{c.validTo}</td>
              <td className="p-2">{c.active ? <span className="text-green-700 font-bold">Activ</span> : <span className="text-gray-500">Inactiv</span>}</td>
              <td className="p-2 flex gap-2">
                <button onClick={() => handleEdit(c)} className="bg-yellow-500 text-white px-2 py-1 rounded">Editează</button>
                <button onClick={() => handleDelete(c.id)} className="bg-red-600 text-white px-2 py-1 rounded">Șterge</button>
              </td>
            </tr>
          ))}
          {coupons.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-500">Niciun cupon.</td></tr>}
        </tbody>
      </table>

      {/* Modal confirmare ștergere cupon */}
      <ConfirmModal
        isOpen={deleteCouponId !== null}
        title="Ștergere cupon"
        message="Sigur vrei să ștergi acest cupon? Acțiunea este ireversibilă."
        confirmText="Da, șterge"
        cancelText="Anulează"
        confirmColor="red"
        icon="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteCouponId(null)}
      />
    </div>
  );
}
