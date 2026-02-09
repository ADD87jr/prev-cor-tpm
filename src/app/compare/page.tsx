"use client";

import { useCompare } from "@/app/_components/CompareContext";
import { useLanguage } from "@/app/_components/LanguageContext";
import Image from "next/image";
import Link from "next/link";

export default function ComparePage() {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const { language } = useLanguage();
  
  const txt = {
    title: language === "en" ? "Compare products" : "Compară produse",
    noProducts: language === "en" ? "No products to compare" : "Nu ai produse de comparat",
    addUpTo: language === "en" ? "Add up to 3 products to compare them" : "Adaugă până la 3 produse pentru a le compara",
    explore: language === "en" ? "Explore shop" : "Explorează magazinul",
    clearAll: language === "en" ? "Clear all" : "Șterge tot",
    feature: language === "en" ? "Feature" : "Caracteristică",
    remove: language === "en" ? "Remove" : "Elimină",
    removeFromCompare: language === "en" ? "Remove from comparison" : "Elimină din comparație",
    image: language === "en" ? "Image" : "Imagine",
    name: language === "en" ? "Name" : "Nume",
    price: language === "en" ? "Price" : "Preț",
    brand: language === "en" ? "Brand" : "Brand",
    productCode: language === "en" ? "Product code" : "Cod produs",
    stock: language === "en" ? "Stock" : "Stoc",
    inStock: language === "en" ? "In stock" : "În stoc",
    outOfStock: language === "en" ? "Out of stock" : "Stoc epuizat",
    actions: language === "en" ? "Actions" : "Acțiuni",
    viewDetails: language === "en" ? "View details" : "Vezi detalii",
    canAddMore: language === "en" ? "You can add" : "Poți adăuga încă",
    moreProducts: language === "en" ? "more products for comparison" : "produse pentru comparație",
    moreProduct: language === "en" ? "more product for comparison" : "produs pentru comparație",
    addProducts: language === "en" ? "+ Add products" : "+ Adaugă produse",
  };

  if (compareItems.length === 0) {
    return (
      <main className="container mx-auto py-10 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-700">{txt.title}</h1>
        <div className="text-center py-20 bg-gray-50 rounded-xl">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">{txt.noProducts}</h2>
          <p className="text-gray-500 mb-6">{txt.addUpTo}</p>
          <Link 
            href="/magazin" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {txt.explore}
          </Link>
        </div>
      </main>
    );
  }

  // Collect all unique spec keys
  const allSpecKeys = new Set<string>();
  compareItems.forEach(item => {
    if (item.specs && Array.isArray(item.specs)) {
      item.specs.forEach(spec => {
        const key = spec.split(":")[0]?.trim();
        if (key) allSpecKeys.add(key);
      });
    }
  });

  const getSpecValue = (product: typeof compareItems[0], key: string): string => {
    if (!product.specs || !Array.isArray(product.specs)) return "-";
    const spec = product.specs.find(s => s.startsWith(key + ":"));
    if (spec) {
      return spec.split(":")[1]?.trim() || "-";
    }
    return "-";
  };

  return (
    <main className="container mx-auto py-10 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-700">{txt.title}</h1>
        <button
          onClick={clearCompare}
          className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-2"
        >
          <span>🗑️</span> {txt.clearAll}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white shadow-lg rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-4 text-left text-gray-600 font-semibold w-48">{txt.feature}</th>
              {compareItems.map(item => (
                <th key={item.id} className="p-4 text-center min-w-[250px]">
                  <button
                    onClick={() => removeFromCompare(item.id)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition"
                    title={txt.removeFromCompare}
                  >
                    ✕
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Product Images */}
            <tr className="border-b">
              <td className="p-4 font-semibold text-gray-700">{txt.image}</td>
              {compareItems.map(item => (
                <td key={item.id} className="p-4 text-center">
                  <div className="relative mx-auto w-40 h-40">
                    <Image
                      src={item.image || "/products/placeholder.png"}
                      alt={item.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <button
                    onClick={() => removeFromCompare(item.id)}
                    className="mt-2 text-sm text-red-500 hover:text-red-600"
                  >
                    ✕ {txt.remove}
                  </button>
                </td>
              ))}
            </tr>

            {/* Product Name */}
            <tr className="border-b bg-gray-50">
              <td className="p-4 font-semibold text-gray-700">{txt.name}</td>
              {compareItems.map(item => (
                <td key={item.id} className="p-4 text-center">
                  <Link 
                    href={`/shop/${item.id}`} 
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {item.name}
                  </Link>
                </td>
              ))}
            </tr>

            {/* Price */}
            <tr className="border-b">
              <td className="p-4 font-semibold text-gray-700">{txt.price}</td>
              {compareItems.map(item => (
                <td key={item.id} className="p-4 text-center">
                  <div className="text-xl font-bold text-green-600">{item.price.toFixed(2)} RON</div>
                  {item.listPrice && item.listPrice > item.price && (
                    <div className="text-sm text-gray-400 line-through">{item.listPrice.toFixed(2)} RON</div>
                  )}
                </td>
              ))}
            </tr>

            {/* Brand */}
            <tr className="border-b bg-gray-50">
              <td className="p-4 font-semibold text-gray-700">{txt.brand}</td>
              {compareItems.map(item => (
                <td key={item.id} className="p-4 text-center">
                  {item.brand || "-"}
                </td>
              ))}
            </tr>

            {/* SKU */}
            <tr className="border-b">
              <td className="p-4 font-semibold text-gray-700">{txt.productCode}</td>
              {compareItems.map(item => (
                <td key={item.id} className="p-4 text-center font-mono text-sm">
                  {item.sku || "-"}
                </td>
              ))}
            </tr>

            {/* Stock */}
            <tr className="border-b bg-gray-50">
              <td className="p-4 font-semibold text-gray-700">{txt.stock}</td>
              {compareItems.map(item => (
                <td key={item.id} className="p-4 text-center">
                  {item.stock !== undefined ? (
                    item.stock > 0 ? (
                      <span className="text-green-600 font-semibold">✓ {txt.inStock} ({item.stock})</span>
                    ) : (
                      <span className="text-red-500">{txt.outOfStock}</span>
                    )
                  ) : "-"}
                </td>
              ))}
            </tr>

            {/* Dynamic Specs */}
            {Array.from(allSpecKeys).map((key, idx) => (
              <tr key={key} className={idx % 2 === 0 ? "border-b" : "border-b bg-gray-50"}>
                <td className="p-4 font-semibold text-gray-700">{key}</td>
                {compareItems.map(item => (
                  <td key={item.id} className="p-4 text-center">
                    {getSpecValue(item, key)}
                  </td>
                ))}
              </tr>
            ))}

            {/* Action Buttons */}
            <tr className="bg-blue-50">
              <td className="p-4 font-semibold text-gray-700">{txt.actions}</td>
              {compareItems.map(item => (
                <td key={item.id} className="p-4 text-center">
                  <Link
                    href={`/shop/${item.id}`}
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    {txt.viewDetails}
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {compareItems.length < 3 && (
        <div className="mt-8 text-center">
          <p className="text-gray-500 mb-4">
            {txt.canAddMore} {3 - compareItems.length} {compareItems.length === 2 ? txt.moreProduct : txt.moreProducts}
          </p>
          <Link 
            href="/magazin" 
            className="inline-block border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            {txt.addProducts}
          </Link>
        </div>
      )}
    </main>
  );
}
