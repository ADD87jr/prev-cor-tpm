"use client";

import { useLanguage, Language } from "./LanguageContext";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setLanguage("ro")}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          language === "ro"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="Română"
      >
        🇷🇴 RO
      </button>
      <button
        onClick={() => setLanguage("en")}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          language === "en"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="English"
      >
        🇬🇧 EN
      </button>
    </div>
  );
}
