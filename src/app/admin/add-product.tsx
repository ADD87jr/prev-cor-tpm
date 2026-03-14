import React, { useState, useRef, useEffect } from "react";

const categories = [
  "Automatizări",
  "Echipamente",
  "Software",
  "Accesorii",
  "Altele"
];

interface ProductVariant {
  name: string;
  value: string;
  stock: number;
  priceAdjust: number;
}

export default function AddProduct() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    purchasePrice: "",
    manufacturer: "",
    currency: "RON",
    category: "",
    type: "",
    domain: "",
    image: "",
    stock: "",
    onDemand: false,
    sku: "",
    brand: "",
    dimensions: "",
    weight: "",
    specs: "",
    productCode: "",
    techDetails: "",
    advantages: ""
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [newVariant, setNewVariant] = useState<ProductVariant>({ name: "", value: "", stock: 0, priceAdjust: 0 });
  
  useEffect(() => {
    setImagePreview(null);
  }, [fileInputKey]);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, files } = e.target as any;
    if (name === "image") {
      if (files && files[0]) {
        setImagePreview(URL.createObjectURL(files[0]));
        setShowPreview(true);
        // upload automat imagine
        const uploadData = new FormData();
        uploadData.append("file", files[0]);
        try {
          const uploadRes = await fetch("/admin/api/upload", {
            method: "POST",
            body: uploadData
          });
          let uploadJson: { url?: string } = {};
          try {
            uploadJson = await uploadRes.json();
          } catch (err) {
            console.error('[UPLOAD ERROR] Răspuns invalid de la server:', err);
            alert('Eroare la upload imagine! Răspuns invalid de la server.');
            setForm({ ...form, image: "" });
            setImagePreview("");
            setShowPreview(false);
            return;
          }
          console.log('[UPLOAD DEBUG] Răspuns server:', uploadJson);
          if (uploadRes.ok && uploadJson.url && uploadJson.url.startsWith("/uploads/")) {
            setForm({ ...form, image: uploadJson.url });
          } else {
            setForm({ ...form, image: "" });
            setImagePreview("");
            setShowPreview(false);
            alert("Eroare la upload imagine! Imaginea nu a fost salvată pe server.\nVerifică dacă folderul 'public/uploads' există și are permisiuni de scriere.");
          }
        } catch (err) {
          console.error('[UPLOAD ERROR] Eroare la upload:', err);
          setForm({ ...form, image: "" });
          setImagePreview("");
          setShowPreview(false);
          alert("Eroare la upload imagine!\nVerifică dacă folderul 'public/uploads' există și are permisiuni de scriere.");
        }
      } else {
        setForm({ ...form, image: "" });
        setImagePreview("");
        setShowPreview(false);
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // VALIDARE: permite imaginea goală, folosește fallback dacă lipsește
    if (!form.name || !form.price || !form.description || !form.stock || !form.category) {
      let msg = 'Trebuie completate toate câmpurile obligatorii:\n';
      if (!form.name) msg += '- Nume\n';
      if (!form.price) msg += '- Preț\n';
      if (!form.description) msg += '- Descriere\n';
      if (!form.stock) msg += '- Stoc\n';
      if (!form.category) msg += '- Categorie\n';
      alert(msg);
      return;
    }
    // Acceptă orice imagine uploadată cu extensie validă
    let imageUrl = '/uploads/default.jpg';
    if (form.image && typeof form.image === 'string') {
      const validExt = ['.jpg', '.jpeg', '.png', '.gif'];
      const ext = form.image.substring(form.image.lastIndexOf('.')).toLowerCase();
      if (form.image.startsWith('/uploads/') && validExt.includes(ext)) {
        imageUrl = form.image;
      } else if (form.image.startsWith('/uploads/')) {
        alert('Selectează o imagine validă pentru produs! (jpg, png, gif)');
        return;
      }
    }
    console.log('[DEBUG] imageUrl folosit:', imageUrl);

    // Construim payload strict cu câmpurile acceptate de Prisma
    const payload = {
      name: form.name || "Produs nou",
      price: Number(form.price) || 0,
      purchasePrice: Number(form.purchasePrice) || 0,
      currency: form.currency || "RON",
      manufacturer: form.manufacturer || "",
      description: form.description || "Fără descriere",
      image: imageUrl,
      images: galleryImages.length > 0 ? galleryImages : null,
      variants: variants.length > 0 ? variants : null,
      type: form.type || "Altele",
      domain: form.domain || "General",
      stock: Number(form.stock) || 0,
      onDemand: form.onDemand || false,
      sku: form.sku || "",
      brand: form.brand || "",
      dimensions: form.dimensions || "",
      weight: form.weight || "",
      specs: form.specs || "",
      productCode: form.productCode || "",
      techDetails: form.techDetails || "",
      advantages: form.advantages || ""
    };

    try {
      const res = await fetch("/admin/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('[DEBUG] Răspuns server:', data);
      if (!res.ok) {
        console.error('API error:', data);
        alert(`Eroare la adăugare produs!\n${data.error || ''}\nPayload: ${JSON.stringify(data.payload)}\nPrisma: ${JSON.stringify(data.prisma)}`);
        throw new Error(data.error || 'Eroare la adăugare produs!');
      }
      alert("Produsul a fost adăugat!");
      setForm({
        name: "",
        description: "",
        price: "",
        purchasePrice: "",
        manufacturer: "",
        currency: "RON",
        category: "",
        type: "",
        domain: "",
        image: "",
        stock: "",
        onDemand: false,
        sku: "",
        brand: "",
        dimensions: "",
        weight: "",
        specs: "",
        productCode: "",
        techDetails: "",
        advantages: ""
      });
      setImagePreview(null);
      setShowPreview(false);
      setGalleryImages([]);
      setVariants([]);
      setNewVariant({ name: "", value: "", stock: 0, priceAdjust: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.files = null;
      }
      setFileInputKey(k => k + 1);
      console.log('[RESET DEBUG] Imagine și input resetate complet!');
    } catch {
      // eroarea e deja afișată mai sus
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-10">
      <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">Adaugă produs nou</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nume produs */}
        <div>
          <label className="block font-semibold mb-1">Nume produs</label>
          <input name="name" type="text" required placeholder="Nume produs" value={form.name} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Cod produs */}
        <div>
          <label className="block font-semibold mb-1">Cod produs</label>
          <input name="productCode" type="text" required placeholder="Cod produs" value={form.productCode} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Preț vânzare */}
        <div>
          <label className="block font-semibold mb-1">Preț vânzare</label>
          <input name="price" type="number" required min="0" placeholder="Preț vânzare" value={form.price} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Descriere */}
        <div>
          <label className="block font-semibold mb-1">Descriere</label>
          <textarea name="description" required placeholder="Descriere scurtă a produsului" value={form.description} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
          <p className="text-xs text-gray-500 mt-1">Scrie câteva detalii relevante despre produs (ex: funcționalitate, avantaje, aplicații).</p>
        </div>
        {/* Preț de intrare */}
        <div>
          <label className="block font-semibold mb-1">Preț de intrare</label>
          <input name="purchasePrice" type="number" required min="0" placeholder="Ex: 800" value={form.purchasePrice} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        {/* Producător */}
        <div>
          <label className="block font-semibold mb-1">Producător</label>
          <input name="manufacturer" type="text" placeholder="Ex: Siemens" value={form.manufacturer} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Monedă */}
        <div>
          <label className="block font-semibold mt-2 mb-1">Monedă</label>
          <select name="currency" value={form.currency} onChange={handleChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 focus:ring-2 focus:ring-blue-400 transition bg-blue-50 font-semibold">
            <option value="RON">RON</option>
            <option value="EUR">EUR</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Alege moneda (RON/EUR) și introdu suma la care vrei să vinzi produsul.</p>
        </div>
        {/* Tip produs */}
        <div>
          <label className="block font-semibold mb-1">Tip produs</label>
          <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 focus:ring-2 focus:ring-blue-400 transition bg-blue-50 font-semibold">
            <option value="">Alege tipul</option>
            {/* Tipuri generale */}
            <option value="PLC">PLC</option>
            <option value="HMI">HMI</option>
            <option value="Senzor">Senzor</option>
            <option value="Gateway">Gateway</option>
            <option value="Service">Service</option>
            <option value="Software industrial">Software industrial</option>
            <option value="Siguranta industriala">Siguranta industriala</option>
            <option value="Robotica">Robotica</option>
            <option value="Pneumatica & hidraulica">Pneumatica & hidraulica</option>
            <option value="Echipamente electrice">Echipamente electrice</option>
            {/* Actuatoare */}
            <option value="Actuatoare">Actuatoare</option>
            <option value="Servomotor">Servomotor</option>
            {/* Siemens / Automatizări clădiri */}
            <option value="Controller automatizare clădiri">Controller automatizare clădiri</option>
            <option value="Controller cameră">Controller cameră</option>
            <option value="Controller universal HVAC">Controller universal HVAC</option>
            <option value="Controller Fancoil">Controller Fancoil</option>
            <option value="Controller cascadă">Controller cascadă</option>
            <option value="Controller temperatură">Controller temperatură</option>
            <option value="Controller încălzire">Controller încălzire</option>
            <option value="Controller hotă">Controller hotă</option>
            <option value="Modul I/O">Modul I/O</option>
            <option value="Modul extensie">Modul extensie</option>
            <option value="Modul extensie I/O">Modul extensie I/O</option>
            <option value="Interfață comunicație">Interfață comunicație</option>
            <option value="Gateway comunicație">Gateway comunicație</option>
            <option value="Web Server BACnet">Web Server BACnet</option>
            <option value="Touch Panel BACnet">Touch Panel BACnet</option>
            <option value="Touch Panel TCP/IP">Touch Panel TCP/IP</option>
            <option value="Panou operare">Panou operare</option>
            <option value="Display universal">Display universal</option>
            <option value="Unitate centrală control">Unitate centrală control</option>
            <option value="Dispozitiv monitorizare">Dispozitiv monitorizare</option>
            <option value="Indicator presiune cameră">Indicator presiune cameră</option>
            <option value="Monitor condiții cameră">Monitor condiții cameră</option>
            <option value="Regulator VAV">Regulator VAV</option>
            <option value="Senzor presiune">Senzor presiune</option>
            <option value="Senzor debit">Senzor debit</option>
            <option value="Convertor semnal">Convertor semnal</option>
            <option value="Transformator">Transformator</option>
            <option value="Licență software">Licență software</option>
            <option value="Accesoriu">Accesoriu</option>
            <option value="Accesoriu montaj">Accesoriu montaj</option>
            <option value="Cadru montaj">Cadru montaj</option>
            <option value="Spare Parts">Spare Parts</option>
            <option value="Echipament automatizare">Echipament automatizare</option>
            {/* Senzori industriali */}
            <option value="Senzori Industriali">Senzori Industriali</option>
            <option value="Senzori capacitivi">Senzori capacitivi</option>
            <option value="Senzori fotoelectrici">Senzori fotoelectrici</option>
            <option value="Senzori inductivi">Senzori inductivi</option>
            <option value="Butoane urgență">Butoane urgență</option>
            <option value="Altele">Altele</option>
          </select>
        </div>
        {/* Domeniu profesional */}
        <div>
          <label className="block font-semibold mb-1">Domeniu profesional</label>
          <select name="domain" value={form.domain} onChange={handleChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 focus:ring-2 focus:ring-blue-400 transition bg-blue-50 font-semibold">
            <option value="">Alege domeniul</option>
            <option value="Automatizare industriala">Automatizare industriala</option>
            <option value="Senzori & IIoT">Senzori & IIoT</option>
            <option value="Siguranta industriala">Siguranta industriala</option>
            <option value="Robotica">Robotica</option>
            <option value="Pneumatica & hidraulica">Pneumatica & hidraulica</option>
            <option value="Echipamente electrice">Echipamente electrice</option>
            <option value="Service">Service</option>
            <option value="Software industrial">Software industrial</option>
            <option value="Altele">Altele</option>
          </select>
        </div>
        {/* Stoc */}
        <div>
          <label className="block font-semibold mb-1">Stoc</label>
          <input name="stock" type="number" required min="0" placeholder="Ex: 10" value={form.stock} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 focus:ring-2 focus:ring-blue-400 transition" />
          <p className="text-xs text-gray-500 mt-1">Numărul de produse disponibile pe stoc.</p>
        </div>
        {/* Produs la comandă */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="onDemand"
            name="onDemand"
            checked={form.onDemand}
            onChange={(e) => setForm({ ...form, onDemand: e.target.checked })}
            className="w-5 h-5 text-orange-500 rounded focus:ring-orange-400"
          />
          <label htmlFor="onDemand" className="font-semibold cursor-pointer">
            <span className="text-orange-600">Produs la comandă</span>
          </label>
          <span className="text-xs text-gray-500">(se aduce doar la cerere, nu are stoc fizic)</span>
        </div>
        {/* Imagine produs */}
        <div>
          <label className="block font-semibold mb-1">Imagine produs</label>
          <input name="image" type="file" accept="image/*" onChange={handleChange} className="w-full" ref={fileInputRef} key={fileInputKey} />
          {showPreview && (
            <img src={fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files[0] ? URL.createObjectURL(fileInputRef.current.files[0]) : (imagePreview || undefined)} alt="Preview" className="mt-2 rounded-lg h-32 object-contain border" />
          )}
        </div>
        
        {/* Galerie imagini */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <label className="block font-semibold mb-2">Galerie imagini (opțional)</label>
          <p className="text-xs text-gray-500 mb-2">Adaugă imagini suplimentare pentru galeria produsului</p>
          <input 
            type="file" 
            accept="image/*" 
            multiple
            ref={galleryInputRef}
            onChange={async (e) => {
              const files = e.target.files;
              if (!files) return;
              
              for (const file of Array.from(files)) {
                const uploadData = new FormData();
                uploadData.append("file", file);
                try {
                  const res = await fetch("/admin/api/upload", { method: "POST", body: uploadData });
                  const data = await res.json();
                  if (res.ok && data.url) {
                    setGalleryImages(prev => [...prev, data.url]);
                  }
                } catch (err) {
                  console.error("Eroare upload galerie:", err);
                }
              }
            }}
            className="w-full"
          />
          {galleryImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {galleryImages.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={img} alt={`Gallery ${idx}`} className="h-20 w-20 object-cover rounded border" />
                  <button
                    type="button"
                    onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs hover:bg-red-600"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Variante produs */}
        <div className="bg-green-50 p-4 rounded-lg">
          <label className="block font-semibold mb-2">Variante produs (opțional)</label>
          <p className="text-xs text-gray-500 mb-2">Ex: Mărime (S, M, L), Culoare (Roșu, Albastru)</p>
          
          <div className="grid grid-cols-4 gap-2 mb-2">
            <input
              type="text"
              placeholder="Proprietate (ex: Mărime)"
              value={newVariant.name}
              onChange={(e) => setNewVariant({...newVariant, name: e.target.value})}
              className="border rounded px-2 py-1 text-sm"
            />
            <input
              type="text"
              placeholder="Valoare (ex: XL)"
              value={newVariant.value}
              onChange={(e) => setNewVariant({...newVariant, value: e.target.value})}
              className="border rounded px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="Stoc"
              value={newVariant.stock || ""}
              onChange={(e) => setNewVariant({...newVariant, stock: Number(e.target.value)})}
              className="border rounded px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (newVariant.name && newVariant.value) {
                  setVariants([...variants, newVariant]);
                  setNewVariant({ name: "", value: "", stock: 0, priceAdjust: 0 });
                }
              }}
              className="bg-green-600 text-white rounded px-3 py-1 text-sm hover:bg-green-700"
            >+ Adaugă</button>
          </div>
          
          {variants.length > 0 && (
            <div className="space-y-1 mt-2">
              {variants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white px-2 py-1 rounded text-sm">
                  <span className="font-semibold">{v.name}:</span>
                  <span>{v.value}</span>
                  <span className="text-gray-500">(Stoc: {v.stock})</span>
                  <button
                    type="button"
                    onClick={() => setVariants(prev => prev.filter((_, i) => i !== idx))}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Cod produs / SKU și Brand */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Cod produs / SKU</label>
            <input name="sku" type="text" required placeholder="Ex: SENZ-001" value={form.sku} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Brand</label>
            <input name="brand" type="text" placeholder="Ex: Siemens" value={form.brand} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
          </div>
        </div>
        {/* Dimensiuni și Greutate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Dimensiuni</label>
            <input name="dimensions" type="text" placeholder="Ex: 10x5x3 cm" value={form.dimensions} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Greutate</label>
            <input name="weight" type="text" placeholder="Ex: 0.5 kg" value={form.weight} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
          </div>
        </div>
        {/* Specificații tehnice */}
        <div>
          <label className="block font-semibold mb-1">Specificații tehnice</label>
          <input name="specs" type="text" placeholder="Ex: IP67, 24V DC" value={form.specs} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Detalii tehnice */}
        <div>
          <label className="block font-semibold mb-1">Detalii tehnice</label>
          <textarea name="techDetails" placeholder="Detalii tehnice extinse, caracteristici, standarde, etc." value={form.techDetails} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Avantaje */}
        <div>
          <label className="block font-semibold mb-1">Avantaje</label>
          <textarea name="advantages" placeholder="Avantaje competitive, beneficii, aplicații" value={form.advantages} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-700 text-white font-bold py-3 rounded-lg shadow hover:bg-blue-800 transition"
          disabled={!form.name || !form.price || !form.stock}
        >Adaugă produs</button>
      </form>
    </div>
  );
}
