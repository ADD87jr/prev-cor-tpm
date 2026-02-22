"use client";
import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useCart } from "../../_components/CartContext";
import { useWishlist } from "../../_components/WishlistContext";
import { useRecentlyViewed } from "../../_components/RecentlyViewedContext";
import { useLanguage } from "../../_components/LanguageContext";
import RecentlyViewed from "../../_components/RecentlyViewed";
import ProductJsonLd, { BreadcrumbJsonLd } from "../../_components/JsonLd";
import { useState, use, useEffect } from "react";
// Componentă pentru produse recomandate
function RecommendedProducts({ currentProduct }: { currentProduct: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const txt = {
    loading: language === "en" ? "Loading recommendations..." : "Se încarcă recomandările...",
    title: language === "en" ? "Recommended products" : "Produse recomandate",
  };
  
  const getProductName = (p: any) => {
    if (language === "en" && p?.nameEn) return p.nameEn;
    return p?.name || "";
  };
  
  const getProductDescription = (p: any) => {
    if (language === "en" && p?.descriptionEn) return p.descriptionEn;
    return p?.description || "";
  };

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        // Recomandă produse cu același tip sau domeniu, dar nu produsul curent
        const recommended = (data || []).filter((p: any) =>
          p.id !== currentProduct.id &&
          (p.type === currentProduct.type || p.domain === currentProduct.domain)
        ).slice(0, 4); // max 4 recomandări
        setProducts(recommended);
      })
      .finally(() => setLoading(false));
  }, [currentProduct.id, currentProduct.type, currentProduct.domain]);

  if (loading) return <div className="mt-12">{txt.loading}</div>;
  if (!products.length) return null;
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-4">{txt.title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {products.map(product => (
          <a key={product.id} href={`/shop/${product.id}`} className="block bg-white border rounded-xl shadow hover:shadow-lg transition p-4 text-center group">
            <div className="flex items-center justify-center mb-2 h-32">
              <Image src={product.image || '/products/default.jpg'} alt={getProductName(product)} width={120} height={90} className="object-contain rounded bg-white" />
            </div>
            <div className="font-semibold text-lg group-hover:text-blue-700 transition-colors mb-1">{getProductName(product)}</div>
            <div className="text-gray-600 text-sm line-clamp-2 mb-2">{getProductDescription(product)}</div>
            <div className="font-bold text-blue-700 text-xl">{product.price} RON</div>
          </a>
        ))}
      </div>
    </div>
  );
}
import Image from "next/image";
export default function ProductDetail({ params }: { params: Promise<{ productId: string }> }) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addViewed } = useRecentlyViewed();
  const { language } = useLanguage();
  const [added, setAdded] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [form, setForm] = React.useState({ nume: "", email: "", mesaj: "" });
  const [sent, setSent] = React.useState(false);
  const actualParams = React.use(params);
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  
  // Variante din baza de date (ProductVariant)
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [selectedDbVariant, setSelectedDbVariant] = useState<any | null>(null); // varianta selectată din DB
  const [selectedDbVariants, setSelectedDbVariants] = useState<any[]>([]); // variantele selectate pentru coș (multi-select)
  const viewedAddedRef = React.useRef(false); // track if product was added to recently viewed
  
  const txt = {
    loading: language === "en" ? "Loading..." : "Se încarcă...",
    productCode: language === "en" ? "Product code:" : "Cod produs:",
    availableStock: language === "en" ? "Available stock:" : "Stoc disponibil:",
    outOfStock: language === "en" ? "Out of stock" : "Stoc epuizat",
    deliveryTime: language === "en" ? "Delivery time:" : "Termen de livrare:",
    onRequest: language === "en" ? "On request" : "La cerere",
    couponNote: language === "en" ? "Have a coupon code? Use it at checkout in your cart!" : "Ai un cod de cupon? Îl poți folosi la finalizarea comenzii în coș!",
    added: language === "en" ? "Added!" : "Adăugat!",
    addToCart: language === "en" ? "Add to cart" : "Adaugă în coș",
    requestQuote: language === "en" ? "Request quote" : "Cere ofertă",
    inFavorites: language === "en" ? "In favorites ❤️" : "În favorite ❤️",
    addToFavorites: language === "en" ? "Add to favorites 🤍" : "Adaugă la favorite 🤍",
    specifications: language === "en" ? "Technical specifications" : "Specificații tehnice",
    advantages: language === "en" ? "Advantages" : "Avantaje",
    downloadPdf: language === "en" ? "Download technical sheet (PDF)" : "Descarcă fișa tehnică (PDF)",
    safetySheet: language === "en" ? "🔒 Download safety data sheet (SDS/MSDS)" : "🔒 Descarcă fișa de securitate (SDS/MSDS)",
    availableOptions: language === "en" ? "Available options:" : "Opțiuni disponibile:",
    unavailable: language === "en" ? "(Unavailable)" : "(Indisponibil)",
    stockFor: language === "en" ? "Stock for" : "Stoc pentru",
    pcs: language === "en" ? "pcs" : "buc",
    productVariants: language === "en" ? "Product Variants" : "Variante Produs",
    code: language === "en" ? "Code" : "Cod",
    compatibility: language === "en" ? "Compatibility" : "Compatibilitate",
    weight: language === "en" ? "Weight (kg)" : "Greutate (kg)",
    stock: language === "en" ? "Stock" : "Stoc",
    price: language === "en" ? "Price" : "Preț",
    packaging: language === "en" ? "Packaging" : "Ambalare",
    description: language === "en" ? "Description" : "Descriere",
    requestCustomQuote: language === "en" ? "Request custom quote" : "Cere ofertă personalizată",
    requestSent: language === "en" ? "Request sent successfully!" : "Cererea a fost trimisă cu succes!",
    fullName: language === "en" ? "Full name" : "Nume și prenume",
    email: "Email",
    message: language === "en" ? "Message (e.g.: quantity, technical details, application)" : "Mesaj (ex: cantitate, detalii tehnice, aplicație)",
    sendRequest: language === "en" ? "Send request" : "Trimite cererea",
    close: language === "en" ? "Close" : "Închide",
    customerReviews: language === "en" ? "Customer reviews" : "Recenzii clienți",
    home: language === "en" ? "Home" : "Acasă",
    shop: language === "en" ? "Shop" : "Magazin",
    backToShop: language === "en" ? "← Back to shop" : "← Înapoi la magazin",
    products: language === "en" ? "Products" : "Produse",
    selectVariant: language === "en" ? "Select variant" : "Selectează varianta",
    selectedVariant: language === "en" ? "Selected variant" : "Varianta selectată",
    variantRequired: language === "en" ? "Please select a variant" : "Te rugăm să selectezi o variantă",
    clearSelection: language === "en" ? "Clear selection" : "Anulează selecția",
    selectAll: language === "en" ? "Select all" : "Selectează toate",
    deselectAll: language === "en" ? "Deselect all" : "Deselectează",
    variantsSelected: language === "en" ? "variants selected" : "variante selectate",
    onDemand: language === "en" ? "On order" : "Pe comandă",
    availableOnDemand: language === "en" ? "Available on order" : "Disponibil pe comandă",
    fromPrice: language === "en" ? "from" : "de la",
    // Câmpuri tehnice variante
    variantDetails: language === "en" ? "Variant Technical Details" : "Detalii Tehnice Variantă",
    sizeLabel: language === "en" ? "Size" : "Mărime",
    detectionDistance: language === "en" ? "Detection distance" : "Distanță sesizare",
    outputType: language === "en" ? "Output type" : "Tip ieșire",
    contactType: language === "en" ? "Contact type" : "Tip contact",
    voltage: language === "en" ? "Voltage" : "Tensiune",
    current: language === "en" ? "Current" : "Curent",
    protection: language === "en" ? "Protection class" : "Clasă protecție",
    material: language === "en" ? "Material" : "Material",
    cable: language === "en" ? "Cable" : "Cablu",
  };

  // Funcții helper pentru traducerea produselor
  const getProductName = (p: any) => {
    if (language === "en" && p?.nameEn) return p.nameEn;
    return p?.name || "";
  };
  
  const getProductDescription = (p: any) => {
    if (language === "en" && p?.descriptionEn) return p.descriptionEn;
    return p?.description || "";
  };

  const getSpecs = (p: any) => {
    if (language === "en" && p?.specsEn && Array.isArray(p.specsEn) && p.specsEn.length > 0) return p.specsEn;
    return p?.specs || [];
  };

  const getAdvantages = (p: any) => {
    if (language === "en" && p?.advantagesEn && Array.isArray(p.advantagesEn) && p.advantagesEn.length > 0) return p.advantagesEn;
    return p?.advantages || [];
  };

  const getDeliveryTime = (p: any) => {
    if (language === "en" && p?.deliveryTimeEn) return p.deliveryTimeEn;
    return p?.deliveryTime || null;
  };

  useEffect(() => {
    setLoading(true);
    viewedAddedRef.current = false; // Reset when product changes
    fetch(`/admin/api/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const found = data.find((p: any) => p.id.toString() === actualParams.productId);
          setProduct(found || null);
        } else {
          setProduct(null);
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [actualParams.productId]);

  // Track viewed product - simple save, prices are updated by RecentlyViewed component from API
  useEffect(() => {
    if (product && !viewedAddedRef.current) {
      viewedAddedRef.current = true;
      addViewed({
        id: product.id,
        name: product.name,
        nameEn: product.nameEn || undefined,
        slug: product.id.toString(),
        image: product.image || '/products/default.jpg',
        price: product.price, // Will be updated by RecentlyViewed API call
      });
    }
  }, [product, addViewed]);

  // Încarcă variantele din baza de date
  useEffect(() => {
    if (product && product.id) {
      setVariantsLoading(true);
      fetch(`/admin/api/products/variants?productId=${product.id}`)
        .then(res => res.json())
        .then(data => {
          setProductVariants(Array.isArray(data) ? data : []);
        })
        .catch(() => setProductVariants([]))
        .finally(() => setVariantsLoading(false));
    }
  }, [product?.id]);

  if (loading) return <div>{txt.loading}</div>;
  if (!product) return notFound();

  // Normalizare discount percent
  let discountPercent = 0;
  if (product.discount && product.discountType === "percent") {
    discountPercent = Number(product.discount);
    if (discountPercent > 0 && discountPercent < 1) {
      discountPercent = Math.round(discountPercent * 100);
    } else {
      discountPercent = Math.round(discountPercent);
    }
  }
  // Calcul preț cu discount
  let basePrice = product.price;
  let priceWithDiscount = basePrice;
  if (discountPercent > 0) {
    priceWithDiscount = Math.round(basePrice * (1 - discountPercent / 100));
  } else if (product.discount && product.discountType === "fixed") {
    priceWithDiscount = (basePrice - product.discount).toFixed(2);
  }

  function handleAdd() {
    if (!product) return;
    
    // Dacă produsul are variante în DB
    if (productVariants.length > 0) {
      // Multi-select: adaugă toate variantele selectate
      if (selectedDbVariants.length > 0) {
        selectedDbVariants.forEach(variant => {
          const variantPrice = variant.pret ?? product.price;
          const variantListPrice = variant.listPrice ?? product.listPrice;
          addToCart({ 
            id: product.id, 
            name: product.name, 
            nameEn: product.nameEn, 
            price: Number(variantPrice), // Prețul de vânzare (discount deja inclus)
            listPrice: variantListPrice ? Number(variantListPrice) : undefined,
            discount: product.discount ? Number(product.discount) : undefined,
            purchasePrice: product.purchasePrice ?? variantPrice,
            deliveryTime: product.deliveryTime,
            variantId: variant.id,
            variantCode: variant.code,
            variantInfo: variant.compatibil || variant.descriere || '',
            onDemand: (variant as any).onDemand || product.onDemand || false
          });
        });
        setSelectedDbVariants([]); // Reset selecția
        setSelectedDbVariant(null);
      } else if (selectedDbVariant) {
        // Fallback: o singură variantă selectată
        const variantPrice = selectedDbVariant.pret ?? product.price;
        const variantListPrice = selectedDbVariant.listPrice ?? product.listPrice;
        addToCart({ 
          id: product.id, 
          name: product.name, 
          nameEn: product.nameEn, 
          price: Number(variantPrice), // Prețul de vânzare (discount deja inclus)
          listPrice: variantListPrice ? Number(variantListPrice) : undefined,
          discount: product.discount ? Number(product.discount) : undefined,
          purchasePrice: product.purchasePrice ?? variantPrice,
          deliveryTime: product.deliveryTime,
          variantId: selectedDbVariant.id,
          variantCode: selectedDbVariant.code,
          variantInfo: selectedDbVariant.compatibil || selectedDbVariant.descriere || '',
          onDemand: (selectedDbVariant as any).onDemand || product.onDemand || false
        });
      } else {
        alert(txt.variantRequired);
        return;
      }
    } else {
      // Produs fără variante - comportament normal
      addToCart({ 
        id: product.id, 
        name: product.name, 
        nameEn: product.nameEn, 
        price: Number(product.price), // Prețul de vânzare (discount deja inclus)
        listPrice: product.listPrice ? Number(product.listPrice) : undefined,
        discount: product.discount ? Number(product.discount) : undefined,
        purchasePrice: product.purchasePrice, 
        deliveryTime: product.deliveryTime,
        onDemand: product.onDemand || false
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }
  function handleCereOferta(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setShowModal(false);
      setSent(false);
      setForm({ nume: "", email: "", mesaj: "" });
    }, 2000);
  }
  return (
    <main className="container mx-auto py-10 px-4">
      {/* JSON-LD pentru SEO */}
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd items={[
        { name: txt.home, url: "/" },
        { name: txt.shop, url: "/shop" },
        { name: product.domain || txt.products, url: `/shop?domain=${product.domain}` },
        { name: getProductName(product), url: `/shop/${product.id}` }
      ]} />
      
      {/* Breadcrumbs vizuale */}
      <nav className="text-sm mb-4 text-gray-500">
        <Link href="/" className="hover:text-blue-600">{txt.home}</Link>
        <span className="mx-2">/</span>
        <Link href="/shop" className="hover:text-blue-600">{txt.shop}</Link>
        {product.domain && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/shop?domain=${product.domain}`} className="hover:text-blue-600">{product.domain}</Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-700 font-medium">{getProductName(product)}</span>
      </nav>
      
      <Link href="/shop" className="text-blue-600 hover:underline mb-4 inline-block">{txt.backToShop}</Link>
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-1/2">
          <div className="bg-white rounded shadow border p-6 sticky top-24">
            <h1 className="text-3xl font-bold mb-2 whitespace-nowrap overflow-visible max-w-4xl">{getProductName(product)}</h1>
            {product.sku && (
              <div className="mb-2 text-sm text-gray-500 font-mono">{txt.productCode} {product.sku}</div>
            )}
            <div className="mb-2 text-lg text-gray-700">{getProductDescription(product)}</div>
            {/* Preț cu discount */}
            {(() => {
              // Dacă e selectată o variantă cu prețuri
              if (selectedDbVariant) {
                const vListPrice = selectedDbVariant.listPrice;
                const vPrice = selectedDbVariant.pret;
                
                // Dacă varianta are preț de listă și preț de vânzare
                if (vListPrice && vPrice && vListPrice > vPrice) {
                  const exactDiscount = (1 - vPrice / vListPrice) * 100;
                  const variantDiscount = Number.isInteger(exactDiscount) ? exactDiscount : Math.round(exactDiscount);
                  return (
                    <div className="mb-2">
                      <span className="line-through text-gray-400 text-lg mr-2">{vListPrice.toFixed(2)} RON</span>
                      <span className="font-bold text-2xl text-green-700 mr-2">{vPrice.toFixed(2)} RON</span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-semibold">-{variantDiscount}%</span>
                      <span className="ml-2 text-sm text-blue-600 font-medium">({selectedDbVariant.code})</span>
                    </div>
                  );
                }
                // Varianta are doar preț de vânzare
                if (vPrice) {
                  return (
                    <div className="mb-2">
                      <span className="font-bold text-2xl">{vPrice.toFixed(2)} RON</span>
                      <span className="ml-2 text-sm text-blue-600 font-medium">({selectedDbVariant.code})</span>
                    </div>
                  );
                }
              }
              
              // Dacă are variante dar nu e selectată niciuna - arată "de la X RON"
              const variantsWithPrices = productVariants.filter(v => v.pret && v.pret > 0);
              if (variantsWithPrices.length > 0 && !selectedDbVariant) {
                const minPrice = Math.min(...variantsWithPrices.map(v => v.pret));
                // Verifică dacă vreuna are și listPrice pentru a calcula discount
                const variantWithMinPrice = variantsWithPrices.find(v => v.pret === minPrice);
                const hasListPrice = variantWithMinPrice?.listPrice && variantWithMinPrice.listPrice > minPrice;
                
                if (hasListPrice) {
                  const exactDiscount = (1 - minPrice / variantWithMinPrice.listPrice) * 100;
                  const discount = Number.isInteger(exactDiscount) ? exactDiscount : Math.round(exactDiscount);
                  return (
                    <div className="mb-2">
                      <span className="text-gray-500 mr-1">{txt.fromPrice}</span>
                      <span className="line-through text-gray-400 text-lg mr-2">{variantWithMinPrice.listPrice.toFixed(2)} RON</span>
                      <span className="font-bold text-2xl text-green-700 mr-2">{minPrice.toFixed(2)} RON</span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-semibold">-{discount}%</span>
                    </div>
                  );
                }
                return (
                  <div className="mb-2">
                    <span className="text-gray-500 mr-1">{txt.fromPrice}</span>
                    <span className="font-bold text-2xl">{minPrice.toFixed(2)} RON</span>
                  </div>
                );
              }
              
              // Produs fără variante - folosește prețul produsului cu discount-ul produsului
              if (discountPercent > 0) {
                const finalPrice = Math.round(product.price * (1 - discountPercent / 100));
                return (
                  <div className="mb-2">
                    <span className="line-through text-gray-400 text-lg mr-2">{product.price} RON</span>
                    <span className="font-bold text-2xl text-green-700 mr-2">{finalPrice} RON</span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-semibold">-{discountPercent}%</span>
                  </div>
                );
              } else if (product.listPrice && product.listPrice > product.price) {
                const exactDiscount = (1 - product.price / product.listPrice) * 100;
                const discount = Number.isInteger(exactDiscount) ? exactDiscount : Math.round(exactDiscount);
                return (
                  <div className="mb-2">
                    <span className="line-through text-gray-400 text-lg mr-2">{product.listPrice} RON</span>
                    <span className="font-bold text-2xl text-green-700 mr-2">{product.price} RON</span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-semibold">-{discount}%</span>
                  </div>
                );
              }
              
              return (
                <div className="mb-2">
                  <span className="font-bold text-2xl">{product.price} RON</span>
                </div>
              );
            })()}
            <div className="mb-4 text-sm">
              {/* Afișare stoc bazat pe variante, produs la comandă sau produs normal */}
              {product.onDemand ? (
                <span className="text-orange-600 font-semibold">{txt.availableOnDemand}</span>
              ) : productVariants.length > 0 ? (
                selectedDbVariants.length > 0 ? (
                  <span className="text-blue-600 font-semibold">
                    {selectedDbVariants.length} {txt.variantsSelected}
                  </span>
                ) : selectedDbVariant ? (
                  <span>
                    {txt.availableStock} <span className={selectedDbVariant.stoc > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                      {selectedDbVariant.stoc > 0 ? selectedDbVariant.stoc : txt.outOfStock}
                    </span>
                    <span className="text-gray-500 ml-2">({txt.selectedVariant}: {selectedDbVariant.code})</span>
                  </span>
                ) : (
                  <span className="text-orange-600 font-medium">{txt.selectVariant}</span>
                )
              ) : (
                <span>
                  {txt.availableStock} {(product.stock ?? 0) > 0 ? product.stock : <span className="text-red-600 font-semibold">{txt.outOfStock}</span>}
                </span>
              )}
            </div>
            <div className="mb-2 text-lg text-blue-700 font-semibold">
              {txt.deliveryTime} {getDeliveryTime(product) ?? txt.onRequest}
            </div>
            <div className="mt-4 text-sm text-blue-700 bg-blue-50 rounded p-2">{txt.couponNote}</div>
            <div className="flex gap-4 mb-6">
              <button
                onClick={handleAdd}
                className={`px-6 py-2 rounded disabled:opacity-60 ${
                  productVariants.length > 0 && selectedDbVariants.length === 0 && !selectedDbVariant 
                    ? "bg-orange-500 hover:bg-orange-600 text-white" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                disabled={
                  added || 
                  (product.onDemand 
                    ? false 
                    : (productVariants.length > 0 
                        ? (selectedDbVariants.length === 0 && !selectedDbVariant)
                        : (product.stock ?? 0) === 0))
                }
              >
                {product.onDemand ? (
                  added ? txt.added : (selectedDbVariants.length > 1 ? `${txt.addToCart} (${selectedDbVariants.length})` : txt.addToCart)
                ) : productVariants.length > 0 ? (
                  selectedDbVariants.length === 0 && !selectedDbVariant
                    ? txt.selectVariant 
                    : (added ? txt.added : (selectedDbVariants.length > 1 ? `${txt.addToCart} (${selectedDbVariants.length})` : txt.addToCart))
                ) : (
                  (product.stock ?? 0) === 0 ? txt.outOfStock : (added ? txt.added : txt.addToCart)
                )}
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded border hover:bg-gray-300"
                type="button"
              >
                {txt.requestQuote}
              </button>
              <button
                onClick={() => isInWishlist(product.id)
                  ? removeFromWishlist(product.id)
                  : addToWishlist({ id: product.id, name: product.name, image: (product.image && typeof product.image === 'string' && product.image.trim() !== "") ? product.image : "/uploads/default.jpg" })}
                className={`px-6 py-2 rounded border font-semibold transition ${isInWishlist(product.id) ? "bg-pink-100 text-pink-600 border-pink-400" : "bg-white text-gray-700 border-gray-300 hover:bg-pink-50"}`}
                type="button"
              >
                {isInWishlist(product.id) ? txt.inFavorites : txt.addToFavorites}
              </button>
            </div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-1">{txt.specifications}</h2>
              {Array.isArray(getSpecs(product)) && getSpecs(product).length > 0 ? (
                <ul className="list-disc ml-6 text-gray-700 space-y-1 max-w-2xl">
                  {getSpecs(product).map((spec: string, idx: number) => (
                    <li key={idx} className="break-words whitespace-pre-line text-base">{spec}</li>
                  ))}
                </ul>
              ) : (
                <div className="ml-2 text-gray-700">{getSpecs(product) || '-'}</div>
              )}
            </div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-1">{txt.advantages}</h2>
              {Array.isArray(getAdvantages(product)) && getAdvantages(product).length > 0 ? (
                <ul className="list-disc ml-6 text-gray-700 space-y-1 max-w-2xl">
                  {getAdvantages(product).map((adv: string, idx: number) => (
                    <li key={idx} className="break-words whitespace-pre-line text-base">{adv}</li>
                  ))}
                </ul>
              ) : (
                <div className="ml-2 text-gray-700">{getAdvantages(product) || '-'}</div>
              )}
            </div>
            {(product.pdfUrl || product.pdfUrlEn) && (
              <div className="mb-4">
                <a
                  href={(language === "en" && product.pdfUrlEn) ? product.pdfUrlEn : product.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline hover:text-blue-900"
                >
                  {txt.downloadPdf}
                </a>
              </div>
            )}
            {(product.safetySheetUrl || product.safetySheetUrlEn) && (
              <div className="mb-4">
                <a
                  href={(language === "en" && product.safetySheetUrlEn) ? product.safetySheetUrlEn : product.safetySheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline hover:text-blue-900"
                >
                  {txt.safetySheet}
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="w-full md:w-1/2 mb-4 md:mb-0">
          {/* Imagine principală */}
          <div className="h-64 relative mb-4">
            {(selectedImage || product.image) ? (
              <Image
                src={selectedImage || product.image}
                alt={product.name}
                fill
                className="object-contain rounded bg-white border"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <Image
                src="/uploads/default.jpg"
                alt="Imagine implicită produs"
                fill
                className="object-contain rounded bg-white border"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            )}
          </div>
          
          {/* Galerie thumbnails */}
          {product.images && Array.isArray(product.images) && product.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-2">
              <button
                onClick={() => setSelectedImage(product.image)}
                className={`flex-shrink-0 w-16 h-16 border-2 rounded overflow-hidden ${
                  selectedImage === product.image || !selectedImage ? "border-blue-500" : "border-gray-200"
                }`}
              >
                <Image src={product.image} alt="Main" width={64} height={64} className="object-cover w-full h-full" />
              </button>
              {product.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`flex-shrink-0 w-16 h-16 border-2 rounded overflow-hidden ${
                    selectedImage === img ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  <Image src={img} alt={`Gallery ${idx + 1}`} width={64} height={64} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
          
          {/* Variante din baza de date - Tabel detaliat cu selecție multiplă */}
          {!variantsLoading && productVariants.length > 0 && (
            <div className="mt-6 bg-white border border-gray-300 rounded-lg p-4 overflow-x-auto">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">{txt.productVariants}</h3>
                <div className="flex gap-2 items-center">
                  {selectedDbVariants.length > 0 && (
                    <span className="text-sm text-blue-600 font-medium">
                      {selectedDbVariants.length} {txt.variantsSelected}
                    </span>
                  )}
                  {(() => {
                    const availableVariants = productVariants.filter(v => v.stoc > 0 || product.onDemand);
                    const allSelected = availableVariants.length > 0 && selectedDbVariants.length === availableVariants.length;
                    return (
                      <button 
                        onClick={() => {
                          if (allSelected) {
                            setSelectedDbVariants([]);
                            setSelectedDbVariant(null);
                          } else {
                            setSelectedDbVariants(availableVariants);
                            setSelectedDbVariant(availableVariants[0] || null);
                          }
                        }}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                      >
                        {allSelected ? txt.deselectAll : txt.selectAll}
                      </button>
                    );
                  })()}
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3">{txt.selectVariant}:</p>
              <table className="w-full text-sm border-collapse min-w-max">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-2 py-2 text-center font-semibold w-10">
                      <input 
                        type="checkbox" 
                        checked={(() => {
                          const availableVariants = productVariants.filter(v => v.stoc > 0 || product.onDemand);
                          return availableVariants.length > 0 && selectedDbVariants.length === availableVariants.length;
                        })()}
                        onChange={(e) => {
                          const availableVariants = productVariants.filter(v => v.stoc > 0 || product.onDemand);
                          if (e.target.checked) {
                            setSelectedDbVariants(availableVariants);
                            setSelectedDbVariant(availableVariants[0] || null);
                          } else {
                            setSelectedDbVariants([]);
                            setSelectedDbVariant(null);
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{txt.code}</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{txt.compatibility}</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{txt.weight}</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{txt.stock}</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{txt.price}</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{txt.packaging}</th>
                  </tr>
                </thead>
                <tbody>
                  {productVariants.map((variant, idx) => {
                    const isChecked = selectedDbVariants.some(v => v.id === variant.id);
                    const isSelected = selectedDbVariant?.id === variant.id;
                    const isOutOfStock = variant.stoc <= 0 && !product.onDemand;
                    return (
                      <tr 
                        key={variant.id} 
                        onClick={() => {
                          if (isOutOfStock) return;
                          // Toggle selection în lista de multi-select
                          if (isChecked) {
                            setSelectedDbVariants(prev => prev.filter(v => v.id !== variant.id));
                            if (isSelected) setSelectedDbVariant(null);
                          } else {
                            setSelectedDbVariants(prev => [...prev, variant]);
                            setSelectedDbVariant(variant);
                          }
                        }}
                        className={`cursor-pointer transition ${
                          isChecked 
                            ? "bg-blue-100 border-l-4 border-blue-500" 
                            : isOutOfStock 
                              ? "bg-gray-100 opacity-60 cursor-not-allowed"
                              : idx % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-gray-50 hover:bg-blue-50"
                        }`}
                      >
                        <td className="px-2 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            disabled={isOutOfStock}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (isOutOfStock) return;
                              if (e.target.checked) {
                                setSelectedDbVariants(prev => [...prev, variant]);
                                setSelectedDbVariant(variant);
                              } else {
                                setSelectedDbVariants(prev => prev.filter(v => v.id !== variant.id));
                                if (isSelected) setSelectedDbVariant(null);
                              }
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 font-semibold text-blue-700 whitespace-nowrap">{variant.code}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{(language === "en" && variant.compatibilEn) ? variant.compatibilEn : (variant.compatibil || '-')}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{variant.greutate ? `${variant.greutate} kg` : '-'}</td>
                        <td className={`px-3 py-2 font-semibold whitespace-nowrap ${product.onDemand ? 'text-orange-600' : (variant.stoc <= 0 ? 'text-red-600' : 'text-green-600')}`}>
                          {product.onDemand ? txt.onDemand : (variant.stoc <= 0 ? txt.outOfStock : variant.stoc)}
                        </td>
                        <td className="px-3 py-2 font-semibold text-green-700 whitespace-nowrap">{variant.pret ? `${variant.pret.toFixed(2)} RON` : '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{(language === "en" && variant.modAmbalareEn) ? variant.modAmbalareEn : (variant.modAmbalare || '-')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {productVariants.some((v: any) => v.descriere || v.descriereEn) && (
                <div className="mt-3 text-sm text-gray-600">
                  <p className="font-semibold mb-2">{txt.description}:</p>
                  {productVariants.map((v: any) => {
                    const desc = (language === "en" && v.descriereEn) ? v.descriereEn : v.descriere;
                    return desc ? (
                      <div key={v.id} className="mb-1">
                        <span className="font-semibold">{v.code}:</span> {desc}
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              
              {/* Panel detalii tehnice varianta selectată */}
              {selectedDbVariant && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">{selectedDbVariant.code}</span>
                    {txt.variantDetails}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {((language === "en" && selectedDbVariant.marimeEn) || selectedDbVariant.marime) && (
                      <div className="bg-white rounded p-2 border">
                        <span className="text-gray-500 block text-xs">{txt.sizeLabel}</span>
                        <span className="font-semibold">{(language === "en" && selectedDbVariant.marimeEn) ? selectedDbVariant.marimeEn : selectedDbVariant.marime}</span>
                      </div>
                    )}
                    {selectedDbVariant.distantaSesizare && (
                      <div className="bg-white rounded p-2 border">
                        <span className="text-gray-500 block text-xs">{txt.detectionDistance}</span>
                        <span className="font-semibold">{selectedDbVariant.distantaSesizare}</span>
                      </div>
                    )}
                    {selectedDbVariant.tipIesire && (
                      <div className="bg-white rounded p-2 border">
                        <span className="text-gray-500 block text-xs">{txt.outputType}</span>
                        <span className="font-semibold">{selectedDbVariant.tipIesire}</span>
                      </div>
                    )}
                    {selectedDbVariant.tipContact && (
                      <div className="bg-white rounded p-2 border">
                        <span className="text-gray-500 block text-xs">{txt.contactType}</span>
                        <span className="font-semibold">{selectedDbVariant.tipContact}</span>
                      </div>
                    )}
                    {selectedDbVariant.tensiune && (
                      <div className="bg-white rounded p-2 border">
                        <span className="text-gray-500 block text-xs">{txt.voltage}</span>
                        <span className="font-semibold">{selectedDbVariant.tensiune}</span>
                      </div>
                    )}
                    {selectedDbVariant.curent && (
                      <div className="bg-white rounded p-2 border">
                        <span className="text-gray-500 block text-xs">{txt.current}</span>
                        <span className="font-semibold">{selectedDbVariant.curent}</span>
                      </div>
                    )}
                    {selectedDbVariant.protectie && (
                      <div className="bg-white rounded p-2 border">
                        <span className="text-gray-500 block text-xs">{txt.protection}</span>
                        <span className="font-semibold">{selectedDbVariant.protectie}</span>
                      </div>
                    )}
                    {selectedDbVariant.material && (
                      <div className="bg-white rounded p-2 border">
                        <span className="text-gray-500 block text-xs">{txt.material}</span>
                        <span className="font-semibold">{selectedDbVariant.material}</span>
                      </div>
                    )}
                    {selectedDbVariant.cablu && (
                      <div className="bg-white rounded p-2 border">
                        <span className="text-gray-500 block text-xs">{txt.cable}</span>
                        <span className="font-semibold">{selectedDbVariant.cablu}</span>
                      </div>
                    )}
                    {((language === "en" && selectedDbVariant.compatibilEn) || selectedDbVariant.compatibil) && (
                      <div className="bg-white rounded p-2 border col-span-2 md:col-span-3">
                        <span className="text-gray-500 block text-xs">{txt.compatibility}</span>
                        <span className="font-semibold">{(language === "en" && selectedDbVariant.compatibilEn) ? selectedDbVariant.compatibilEn : selectedDbVariant.compatibil}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Variante produs */}
          {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">{txt.availableOptions}</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-3 py-2 border rounded-lg text-sm transition ${
                      selectedVariant?.value === v.value 
                        ? "bg-blue-600 text-white border-blue-600" 
                        : "bg-white hover:bg-blue-50 border-gray-300"
                    } ${v.stock <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={v.stock <= 0}
                  >
                    <span className="font-medium">{v.name}: </span>
                    <span>{v.value}</span>
                    {v.stock <= 0 && <span className="ml-1 text-red-500">{txt.unavailable}</span>}
                  </button>
                ))}
              </div>
              {selectedVariant && (
                <p className="text-sm text-gray-500 mt-2">
                  {txt.stockFor} {selectedVariant.name} {selectedVariant.value}: {selectedVariant.stock} {txt.pcs}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal pentru cerere ofertă */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl"
              onClick={() => setShowModal(false)}
              aria-label={txt.close}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">{txt.requestCustomQuote}</h2>
            {sent ? (
              <div className="text-green-700 font-semibold text-center py-8">{txt.requestSent}</div>
            ) : (
              <form onSubmit={handleCereOferta} className="flex flex-col gap-4">
                <input
                  type="text"
                  required
                  placeholder={txt.fullName}
                  className="border rounded px-3 py-2"
                  value={form.nume}
                  onChange={e => setForm(f => ({ ...f, nume: e.target.value }))}
                />
                <input
                  type="email"
                  required
                  placeholder={txt.email}
                  className="border rounded px-3 py-2"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
                <textarea
                  required
                  placeholder={txt.message}
                  className="border rounded px-3 py-2"
                  rows={4}
                  value={form.mesaj}
                  onChange={e => setForm(f => ({ ...f, mesaj: e.target.value }))}
                />
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded mt-2">{txt.sendRequest}</button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Recenzii produs */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">{txt.customerReviews}</h2>
        <ProductReviews productId={product.id} />
      </div>
      {/* Recomandări */}
      <RecommendedProducts currentProduct={product} />
      {/* Produse vizualizate recent */}
      <RecentlyViewed />
    </main>
  );
}

// Componentă recenzii produs
function ProductReviews({ productId }: { productId: number }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user: "", rating: 5, text: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { language } = useLanguage();
  
  const txt = {
    loading: language === "en" ? "Loading reviews..." : "Se încarcă recenziile...",
    noReviews: language === "en" ? "No reviews for this product yet." : "Nu există recenzii pentru acest produs.",
    leaveReview: language === "en" ? "Leave a review:" : "Lasă o recenzie:",
    yourName: language === "en" ? "Your name" : "Numele tău",
    stars: language === "en" ? "stars" : "stele",
    writeOpinion: language === "en" ? "Write your opinion about the product..." : "Scrie părerea ta despre produs...",
    sending: language === "en" ? "Sending..." : "Se trimite...",
    sendReview: language === "en" ? "Send review" : "Trimite recenzia",
    reviewSent: language === "en" ? "Review sent!" : "Recenzia a fost trimisă!",
  };

  useEffect(() => {
    fetch(`/shop/${productId}/api/reviews?productId=${productId}`)
      .then(res => res.json())
      .then(setReviews)
      .finally(() => setLoading(false));
  }, [productId, sent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await fetch(`/shop/${productId}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, productId }),
    });
    setForm({ user: "", rating: 5, text: "" });
    setSent(true);
    setSending(false);
    setTimeout(() => setSent(false), 2000);
  }

  return (
    <div>
      {loading ? (
        <div>{txt.loading}</div>
      ) : reviews.length === 0 ? (
        <div className="text-gray-500 mb-4">{txt.noReviews}</div>
      ) : (
        <ul className="mb-6">
          {reviews.map((r, idx) => (
            <li key={idx} className="mb-4 border-b pb-2">
              <div className="font-semibold">{r.user} <span className="text-yellow-500">{'★'.repeat(r.rating)}</span></div>
              <div className="text-gray-700">{language === "en" && r.textEn ? r.textEn : r.text}</div>
              <div className="text-xs text-gray-400">{r.date}</div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="bg-gray-50 rounded p-4 flex flex-col gap-2 max-w-md">
        <div className="font-semibold mb-1">{txt.leaveReview}</div>
        <input
          type="text"
          required
          placeholder={txt.yourName}
          className="border rounded px-3 py-2"
          value={form.user}
          onChange={e => setForm(f => ({ ...f, user: e.target.value }))}
        />
        <select
          required
          className="border rounded px-3 py-2"
          value={form.rating}
          onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))}
        >
          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} {txt.stars}</option>)}
        </select>
        <textarea
          required
          placeholder={txt.writeOpinion}
          className="border rounded px-3 py-2"
          rows={3}
          value={form.text}
          onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded mt-2 disabled:opacity-60" disabled={sending}>{sending ? txt.sending : txt.sendReview}</button>
        {sent && <div className="text-green-700 text-sm">{txt.reviewSent}</div>}
      </form>
    </div>
  );
}
