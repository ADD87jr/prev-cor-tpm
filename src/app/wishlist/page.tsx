"use client";
import { useWishlist } from "../_components/WishlistContext";
import { useLanguage } from "../_components/LanguageContext";
import Image from "next/image";

export default function WishlistPage() {
  const { items: wishlist, removeFromWishlist } = useWishlist();
  const { language } = useLanguage();
  
  const txt = {
    title: language === "en" ? "My favorites" : "Favoritele mele",
    empty: language === "en" ? "No favorite products yet." : "Nu ai produse la favorite.",
    viewProduct: language === "en" ? "View product" : "Vezi produs",
    remove: language === "en" ? "Remove" : "Șterge",
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-extrabold mb-8 text-pink-600 tracking-tight">{txt.title}</h1>
      {wishlist.length === 0 ? (
        <div className="mb-8 text-gray-500 text-lg">{txt.empty}</div>
      ) : (
        <ul className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {wishlist.map(item => (
            <li key={item.id} className="flex flex-col items-center bg-pink-50 rounded-xl p-5 border border-pink-200 shadow hover:shadow-xl transition-all duration-200">
              <div className="mb-3">
                <Image src={item.image && item.image.trim() !== "" ? item.image : "/uploads/default.jpg"} alt={item.name} width={80} height={80} className="rounded-full object-cover border-2 border-pink-300 bg-white" />
              </div>
              <span className="font-bold text-lg text-gray-800 text-center mb-2 leading-tight">{item.name}</span>
              <div className="flex gap-3 items-center mt-2">
                <a href={`/shop/${item.id}`} className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-200 transition">{txt.viewProduct}</a>
                <button onClick={() => removeFromWishlist(item.id)} className="px-3 py-1 rounded bg-pink-100 text-pink-600 font-semibold text-sm hover:bg-pink-200 transition">{txt.remove}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
