export function getLowStockProducts(threshold: number = 5) {
  return products.filter(p => p.stock <= threshold);
}
// Acest fișier va acționa ca un "database" temporar în memorie pentru produse (doar pentru demo/dezvoltare)
export type Product = {
  id: number;
  name: string;
  listPrice: number; // preț de listă (fără discount)
  price: number; // preț cu discount
  purchasePrice?: number; // preț de intrare
  description: string;
  image: string;
  type: string;
  domain: string;
  stock: number;
  couponCode?: string; // cod cupon asociat
  discount?: number;   // reducere procentuală (ex: 0.15 pentru 15%) sau sumă fixă
  discountType?: "percent" | "fixed"; // tip reducere
};

let products: Product[] = [
  {
    id: 1,
    name: "Lampă semnalizare",
    listPrice: 12,
    price: 10, // preț cu discount
    purchasePrice: 7.5,
    description: "Lampă semnalizare industrială, test reducere.",
    image: "/products/lampa.jpg",
    type: "Echipament",
    domain: "Automatizări",
    stock: 10, // resetat la 10 pentru test
    couponCode: undefined,
    discount: 15,
    discountType: "percent",
  },
  {
    id: 2,
    name: "Senzor industrial multifuncțional",
    listPrice: 25,
    price: 20, // preț cu discount
    purchasePrice: 15,
    description: "Senzor pentru monitorizare procese industriale, test reducere.",
    image: "/products/senzor-industrial.jpg",
    type: "Echipament",
    domain: "Monitorizare",
    stock: 25,
    couponCode: undefined,
    discount: 20,
    discountType: "percent"
  },
  {
    id: 20,
    name: "Lampa LED albastru 220V AC",
    listPrice: 20,
    price: 18,
    purchasePrice: 10,
    description: "Lampă LED albastru pentru panouri, 220V AC.",
    image: "/products/lampa-led-albastru.jpg",
    type: "Echipament",
    domain: "Semnalizare",
    stock: 10,
    couponCode: "PROMO10",
    discount: 10,
    discountType: "percent"
  }
  // ...poți adăuga mai multe produse aici
];

// Corectare discount procentual pentru toate produsele din memorie
products = products.map(p => {
  if (
    p.discountType === 'percent' &&
    typeof p.discount === 'number' &&
    p.discount > 0 &&
    p.discount < 1
  ) {
    return { ...p, discount: Math.round(p.discount * 100) };
  }
  return p;
});

export function getProducts() {
  return products;
}

export function addProduct(product: Omit<Product, "id">) {
  const newProduct = { ...product, id: Date.now(), couponCode: product.couponCode ?? undefined, discount: product.discount ?? 0, discountType: product.discountType ?? "percent" };
  products.push(newProduct);
  return newProduct;
}

export function updateProduct(id: number, data: Partial<Omit<Product, "id">>) {
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...data };
  // Permite actualizarea cuponului și reducerii
  if (data.couponCode !== undefined) products[idx].couponCode = data.couponCode;
  if (data.discount !== undefined) products[idx].discount = data.discount;
  if (data.discountType !== undefined) products[idx].discountType = data.discountType;
  return products[idx];
}

export function deleteProduct(id: number) {
  products = products.filter(p => p.id !== id);
}

export function decreaseStock(productId: number, quantity: number) {
  const idx = products.findIndex(p => p.id === productId);
  if (idx === -1) return false;
  if (products[idx].stock < quantity) return false;
  products[idx].stock -= quantity;
  return true;
}
