"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageContext";

export interface BreadcrumbItem {
  label: string;
  labelEn?: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const { language } = useLanguage();

  return (
    <nav aria-label="breadcrumb" className="text-sm text-gray-500 mb-4">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="hover:text-blue-600 transition-colors">
            {language === "en" ? "Home" : "Acasă"}
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <span className="mx-1">/</span>
            {item.href && index < items.length - 1 ? (
              <Link href={item.href} className="hover:text-blue-600 transition-colors">
                {language === "en" && item.labelEn ? item.labelEn : item.label}
              </Link>
            ) : (
              <span className="text-gray-800 font-medium">
                {language === "en" && item.labelEn ? item.labelEn : item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
