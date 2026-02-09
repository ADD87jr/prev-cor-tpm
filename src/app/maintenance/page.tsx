"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COMPANY_CONFIG_CLIENT, fetchCompanyConfig } from "@/lib/companyConfigClient";

export default function MaintenancePage() {
  const [config, setConfig] = useState(COMPANY_CONFIG_CLIENT);
  
  useEffect(() => {
    fetchCompanyConfig().then(setConfig);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated gear icon */}
        <div className="mb-8">
          <svg
            className="w-32 h-32 mx-auto text-blue-300 animate-spin-slow"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ animationDuration: "8s" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={0.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={0.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Suntem în mentenanță
        </h1>

        <p className="text-xl text-blue-200 mb-8">
          Site-ul nostru este temporar indisponibil pentru îmbunătățiri.
          <br />
          Vom reveni în curând!
        </p>

        <div className="bg-blue-800/50 rounded-xl p-6 mb-8 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-3 text-blue-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Estimăm finalizarea în scurt timp</span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-blue-300 text-sm">
            Pentru urgențe, ne poți contacta la:
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-white">
            <a
              href={`mailto:${config.email}`}
              className="flex items-center gap-2 hover:text-blue-300 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {config.email}
            </a>
            <a
              href={`tel:+${config.phoneClean}`}
              className="flex items-center gap-2 hover:text-blue-300 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {config.phone}
            </a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-blue-700">
          <Link
            href="/admin"
            className="text-blue-400 hover:text-blue-300 text-sm transition"
          >
            Acces Admin →
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
