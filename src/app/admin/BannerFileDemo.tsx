import React, { useRef, useState } from "react";

export default function BannerFileDemo() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="max-w-md mx-auto mt-10">
      <label className="block font-semibold mb-1 text-blue-900" htmlFor="banner-upload-demo">Imagine banner</label>
      <div className="bg-blue-50 border rounded-lg px-4 py-2 flex items-center gap-2">
        <input
          id="banner-upload-demo"
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
        <input
          type="text"
          readOnly
          value={file ? file.name : ''}
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
