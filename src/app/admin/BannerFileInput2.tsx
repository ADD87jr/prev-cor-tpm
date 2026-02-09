import React, { useRef } from "react";

export default function BannerFileInput({ bannerFile, setBannerFile }: { bannerFile: File | null, setBannerFile: (f: File | null) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="max-w-md mx-auto">
      <label className="block font-semibold mb-1 text-blue-900" htmlFor="banner-upload-demo">Imagine banner</label>
      <div className="bg-blue-50 border rounded-lg px-4 py-2 flex items-center gap-2">
        <input
          id="banner-upload-demo"
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0] || null;
            console.log('BannerFileInput2 selected file:', file);
            setBannerFile(file);
          }}
        />
        <input
          type="text"
          readOnly
          value={bannerFile ? bannerFile.name : ''}
          placeholder="Alegeți fișierul"
          className="w-full bg-blue-50 focus:outline-blue-500 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        />
        <button
          type="button"
          className="border rounded px-4 py-2 bg-white text-blue-900 font-semibold hover:bg-blue-100 transition"
          onClick={() => fileInputRef.current?.click()}
        >
          Selectează
        </button>
      </div>
    </div>
  );
}
