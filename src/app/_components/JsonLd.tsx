"use client";

interface ProductJsonLdProps {
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    image: string;
    sku?: string;
    brand?: string;
    manufacturer?: string;
    stock?: number;
    discount?: number;
    discountType?: string;
  };
  reviews?: {
    rating: number;
    count: number;
  };
}

export default function ProductJsonLd({ product, reviews }: ProductJsonLdProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://prev-cor.ro";
  
  // Calculează prețul cu discount dacă există
  let finalPrice = product.price;
  if (product.discount && product.discountType === "percent") {
    finalPrice = product.price * (1 - product.discount / 100);
  } else if (product.discount && product.discountType === "fixed") {
    finalPrice = product.price - product.discount;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image?.startsWith("http") ? product.image : `${baseUrl}${product.image}`,
    sku: product.sku || `PREV-${product.id}`,
    brand: product.brand || product.manufacturer ? {
      "@type": "Brand",
      name: product.brand || product.manufacturer
    } : undefined,
    manufacturer: product.manufacturer ? {
      "@type": "Organization",
      name: product.manufacturer
    } : undefined,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/shop/${product.id}`,
      priceCurrency: "RON",
      price: finalPrice.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 zile
      availability: (product.stock ?? 0) > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "PREV-COR TPM"
      }
    },
    aggregateRating: reviews && reviews.count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: reviews.rating.toFixed(1),
      reviewCount: reviews.count,
      bestRating: "5",
      worstRating: "1"
    } : undefined
  };

  // Remove undefined values
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
    />
  );
}

// JSON-LD pentru pagina de organizație
export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PREV-COR TPM",
    url: "https://prev-cor.ro",
    logo: "https://prev-cor.ro/logo.png",
    description: "Soluții complete pentru echipamente electrice și automatizări industriale",
    address: {
      "@type": "PostalAddress",
      addressLocality: "România",
      addressCountry: "RO"
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "Romanian"
    },
    sameAs: []
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// JSON-LD pentru breadcrumbs
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://prev-cor.ro";
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
