"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-bold text-red-500 mb-4">500</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Ceva nu a funcționat corect
        </h2>
        <p className="text-gray-600 mb-8">
          Ne pare rău, a apărut o eroare. Te rugăm să încerci din nou.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Încearcă din nou
          </button>
          <a 
            href="/"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Pagina principală
          </a>
        </div>
      </div>
    </div>
  );
}
