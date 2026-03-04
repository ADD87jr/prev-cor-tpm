"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

interface ClientData {
  clientType?: string;
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  county?: string;
  postalCode?: string;
  cui?: string;
  denumire?: string;
}

interface PlaceOrderData {
  order: DropshipOrder;
  client: ClientData | null;
  supplier: Supplier | null;
  productDetails: DropshipProduct | null;
}

interface ShopProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
}

interface DropshipProduct {
  id: number;
  supplierId: number;
  productId: number | null;
  name: string;
  supplierCode: string | null;
  supplierPrice: number;
  currency: string;
  yourPrice: number;
  marginPercent: number | string;
  category: string | null;
  stock: string;
  stockQuantity: number | null;
  deliveryDays: number;
  status: string;
  autoSync: boolean;
  lastSyncAt: string | null;
}

interface DropshipOrder {
  id: number;
  orderId: number;
  dropshipProductId: number;
  supplierId: number;
  quantity: number;
  supplierOrderId: string | null;
  supplierAwb: string | null;
  courierName: string | null;
  status: string;
  supplierPrice: number;
  clientPrice: number;
  profit: number;
  orderedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  trackingUrl: string | null;
  createdAt: string;
  product: DropshipProduct;
  isPending?: boolean; // Comandă nouă detectată automat (nu e încă în DropshipOrder)
  orderNumber?: string | null;
  productName?: string; // Compatibilitate cu date expandate
}

interface Alert {
  id: number;
  type: string;
  productId: number | null;
  message: string;
  severity: string;
  resolved: boolean;
  createdAt: string;
}

interface Stats {
  products: { total: number; active: number; outOfStock: number };
  orders: { total: number; pending: number; delivered: number };
  financial: { revenue: number; cost: number; profit: number };
  avgMargin: string;
  unresolvedAlerts: number;
}

type TabType = "products" | "orders" | "import" | "reports" | "alerts" | "settings";

export default function DropshippingPage() {
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [products, setProducts] = useState<DropshipProduct[]>([]);
  const [orders, setOrders] = useState<DropshipOrder[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  
  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSupplier, setImportSupplier] = useState("");
  const [importMargin, setImportMargin] = useState("25");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; errors: { row: number; error: string }[] } | null>(null);

  // Settings state
  const [settings, setSettings] = useState({
    defaultMarginPercent: 25,
    minMarginPercent: 10,
    autoUpdatePrices: true,
    autoOrderEnabled: false,
    syncIntervalHours: 24,
    lowStockThreshold: 5,
    emailNotifications: true,
  });
  const [settingsSupplier, setSettingsSupplier] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Exchange rate (curs BNR)
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; date: string; source: string } | null>(null);
  const [refreshingRate, setRefreshingRate] = useState(false);

  // Place Supplier Order Modal
  const [showPlaceOrderModal, setShowPlaceOrderModal] = useState(false);
  const [placeOrderData, setPlaceOrderData] = useState<PlaceOrderData | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [supplierAwb, setSupplierAwb] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  
  // Opțiuni protecție dropshipping
  const [blindShipping, setBlindShipping] = useState(true);
  const [noInvoiceInPackage, setNoInvoiceInPackage] = useState(true);
  const [useMyBranding, setUseMyBranding] = useState(false);

  // Modal AWB profesional
  const [showAwbModal, setShowAwbModal] = useState(false);
  const [awbModalOrder, setAwbModalOrder] = useState<DropshipOrder | null>(null);
  const [awbInput, setAwbInput] = useState("");
  const [savingAwb, setSavingAwb] = useState(false);

  // Toast notification system
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" | "info"; details?: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info", details?: string) => {
    setToast({ show: true, message, type, details });
    setTimeout(() => setToast(null), type === "error" ? 6000 : 4000);
  };

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DropshipProduct | null>(null);
  const [marginPercent, setMarginPercent] = useState("");
  const [newProduct, setNewProduct] = useState({
    supplierId: "",
    productId: "",
    name: "",
    supplierCode: "",
    supplierPrice: "",
    currency: "EUR",
    yourPrice: "",
    category: "",
    deliveryDays: "7",
    stock: "in_stock",
  });

  const loadExchangeRate = useCallback(async () => {
    try {
      const res = await fetch("/admin/api/exchange-rate");
      if (res.ok) {
        const data = await res.json();
        setExchangeRate(data);
      }
    } catch (error) {
      console.error("Error loading exchange rate:", error);
    }
  }, []);

  const refreshExchangeRate = async () => {
    setRefreshingRate(true);
    try {
      const res = await fetch("/admin/api/exchange-rate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setExchangeRate({ rate: data.rate, date: data.date, source: "bnr" });
      }
    } catch (error) {
      console.error("Error refreshing rate:", error);
    } finally {
      setRefreshingRate(false);
    }
  };

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/admin/api/furnizori");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  }, []);

  const loadShopProducts = useCallback(async () => {
    try {
      const res = await fetch("/admin/api/products?limit=1000");
      if (res.ok) {
        const data = await res.json();
        setShopProducts(Array.isArray(data) ? data : data.products || []);
      }
    } catch (error) {
      console.error("Error loading shop products:", error);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (selectedSupplier !== "all") params.set("supplierId", selectedSupplier);
      if (searchTerm) params.set("search", searchTerm);
      
      const res = await fetch(`/admin/api/dropship-products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  }, [statusFilter, selectedSupplier, searchTerm]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/admin/api/dropship-orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/admin/api/dropship-alerts?resolved=false");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/admin/api/dropship-stats?type=overview");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadSuppliers(), loadShopProducts(), loadProducts(), loadOrders(), loadAlerts(), loadStats(), loadExchangeRate()]);
      setLoading(false);
    };
    loadAll();
  }, [loadSuppliers, loadShopProducts, loadProducts, loadOrders, loadAlerts, loadStats, loadExchangeRate]);

  useEffect(() => {
    if (!loading) {
      loadProducts();
    }
  }, [statusFilter, selectedSupplier, searchTerm, loading, loadProducts]);

  const toggleProductStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const res = await fetch("/admin/api/dropship-products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        loadProducts();
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Sigur vrei sa stergi acest produs?")) return;
    try {
      const res = await fetch(`/admin/api/dropship-products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        loadProducts();
        loadStats();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleImport = async () => {
    if (!importFile || !importSupplier) {
      showToast("Selectează fișierul și furnizorul", "info");
      return;
    }
    
    setImporting(true);
    setImportResult(null);
    
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("supplierId", importSupplier);
      formData.append("defaultMargin", importMargin);
      
      const res = await fetch("/admin/api/dropship-import", {
        method: "POST",
        body: formData,
      });
      
      if (res.ok) {
        const result = await res.json();
        setImportResult(result);
        loadProducts();
        loadStats();
      } else {
        const error = await res.json();
        showToast(error.error || "Eroare la import", "error");
      }
    } catch (error) {
      console.error("Error importing:", error);
      showToast("Eroare la import", "error");
    } finally {
      setImporting(false);
    }
  };

  const loadSettings = async (supplierId: string) => {
    if (!supplierId) return;
    try {
      const res = await fetch(`/admin/api/dropship-settings?supplierId=${supplierId}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const saveSettings = async () => {
    if (!settingsSupplier) {
      showToast("Selectează furnizorul", "info");
      return;
    }
    
    setSavingSettings(true);
    try {
      const res = await fetch("/admin/api/dropship-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: settingsSupplier, ...settings }),
      });
      
      if (res.ok) {
        showToast("Setări salvate cu succes!", "success");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast("Eroare la salvare setări", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const runSync = async (supplierId: string) => {
    try {
      const res = await fetch("/admin/api/dropship-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, syncType: "full" }),
      });
      
      if (res.ok) {
        const result = await res.json();
        showToast("Sincronizare completă!", "success", `${result.productsUpdated} produse actualizate.`);
        loadProducts();
      }
    } catch (error) {
      console.error("Error syncing:", error);
      showToast("Eroare la sincronizare", "error");
    }
  };

  const resolveAlert = async (id: number) => {
    try {
      const res = await fetch("/admin/api/dropship-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolved: true }),
      });
      if (res.ok) {
        loadAlerts();
        loadStats();
      }
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const addProduct = async () => {
    if (!newProduct.supplierId || !newProduct.name || !newProduct.supplierPrice) {
      showToast("Completează toate câmpurile obligatorii", "info");
      return;
    }
    
    try {
      const res = await fetch("/admin/api/dropship-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });
      
      if (res.ok) {
        setShowAddModal(false);
        setMarginPercent("");
        setNewProduct({
          supplierId: "",
          productId: "",
          name: "",
          supplierCode: "",
          supplierPrice: "",
          currency: "EUR",
          yourPrice: "",
          category: "",
          deliveryDays: "7",
          stock: "in_stock",
        });
        loadProducts();
        loadStats();
      }
    } catch (error) {
      console.error("Error adding product:", error);
      showToast("Eroare la adăugare produs", "error");
    }
  };

  const startEditProduct = (product: DropshipProduct) => {
    setEditingProduct(product);
    setMarginPercent(String(product.marginPercent));
    setShowEditModal(true);
  };

  const updateProduct = async () => {
    if (!editingProduct) return;
    
    try {
      const res = await fetch("/admin/api/dropship-products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct),
      });
      
      if (res.ok) {
        setShowEditModal(false);
        setEditingProduct(null);
        setMarginPercent("");
        loadProducts();
        loadStats();
      }
    } catch (error) {
      console.error("Error updating product:", error);
      showToast("Eroare la actualizare produs", "error");
    }
  };

  // Calcul automat pret din marja
  const calculateYourPrice = (supplierPrice: string, margin: string) => {
    const price = parseFloat(supplierPrice);
    const m = parseFloat(margin);
    if (!isNaN(price) && !isNaN(m) && price > 0) {
      return (price * (1 + m / 100)).toFixed(2);
    }
    return "";
  };

  // Calcul automat marja din preturi
  const calculateMargin = (supplierPrice: string, yourPrice: string) => {
    const sp = parseFloat(supplierPrice);
    const yp = parseFloat(yourPrice);
    if (!isNaN(sp) && !isNaN(yp) && sp > 0) {
      return ((yp - sp) / sp * 100).toFixed(1);
    }
    return "";
  };

  // Deschide modalul de plasare comandă la furnizor
  const openPlaceOrderModal = async (order: DropshipOrder) => {
    try {
      // Încarcă datele clientului din Order
      const orderRes = await fetch(`/admin/api/orders/${order.orderId}`);
      let clientData: ClientData | null = null;
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        clientData = orderData.clientData || null;
      }
      
      // Găsește furnizorul
      const supplier = suppliers.find(s => s.id === order.supplierId) || null;
      
      // Găsește detaliile produsului
      const productDetails = products.find(p => p.id === order.dropshipProductId) || null;
      
      setPlaceOrderData({
        order,
        client: clientData,
        supplier,
        productDetails,
      });
      setSupplierOrderId("");
      setSupplierAwb("");
      setOrderNotes("");
      setShowPlaceOrderModal(true);
    } catch (error) {
      console.error("Error loading order details:", error);
      showToast("Eroare la încărcarea detaliilor comenzii", "error");
    }
  };

  // Confirmă și plasează comanda la furnizor
  const confirmAndPlaceOrder = async () => {
    if (!placeOrderData) return;
    
    setPlacingOrder(true);
    try {
      const { order } = placeOrderData;
      
      // Construiește notele cu opțiunile de protecție
      const protectionNotes: string[] = [];
      if (blindShipping) protectionNotes.push("⚠️ BLIND SHIPPING: Vă rugăm să NU includeți facturi sau prețuri în colet.");
      if (noInvoiceInPackage) protectionNotes.push("⚠️ Factura să fie trimisă doar către noi, NU în colet.");
      if (useMyBranding) protectionNotes.push("📦 Dacă e posibil, pe eticheta de retur să apară 'PREV-COR TPM'.");
      
      const fullNotes = [
        ...protectionNotes,
        orderNotes ? `Note: ${orderNotes}` : ""
      ].filter(Boolean).join("\n");
      
      // Dacă e comandă nouă (isPending), o creăm mai întâi
      if (order.isPending || order.id < 0) {
        const createRes = await fetch("/admin/api/dropship-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.orderId,
            dropshipProductId: order.dropshipProductId,
            quantity: order.quantity,
            supplierOrderId: supplierOrderId || null,
            supplierAwb: supplierAwb || null,
            notes: fullNotes || null,
            status: supplierOrderId ? "ordered" : "pending",
          }),
        });
        
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || "Nu s-a putut crea comanda");
        }
      } else {
        // Actualizează comanda existentă
        const updateRes = await fetch("/admin/api/dropship-orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: order.id,
            supplierOrderId: supplierOrderId || null,
            supplierAwb: supplierAwb || null,
            notes: fullNotes || null,
            status: supplierOrderId ? "ordered" : "pending",
          }),
        });
        
        if (!updateRes.ok) {
          const err = await updateRes.json();
          throw new Error(err.error || "Nu s-a putut actualiza comanda");
        }
      }
      
      setShowPlaceOrderModal(false);
      setPlaceOrderData(null);
      loadOrders();
      loadStats();
      
      // Show professional success toast
      const supplierName = placeOrderData.supplier?.name || "furnizor";
      showToast(
        "Comandă plasată cu succes!",
        "success",
        `Comanda #${order.orderId} a fost înregistrată la ${supplierName}. ${supplierOrderId ? `Nr. comandă: ${supplierOrderId}` : "Adaugă numărul comenzii când îl primești."}`
      );
    } catch (error) {
      console.error("Error placing order:", error);
      showToast(
        "Eroare la plasare comandă",
        "error",
        error instanceof Error ? error.message : "Nu s-a putut plasa comanda"
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const updateOrderStatus = async (id: number, status: string, awb?: string) => {
    try {
      const res = await fetch("/admin/api/dropship-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, supplierAwb: awb }),
      });
      if (res.ok) {
        loadOrders();
        loadStats();
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "products", label: "Produse", icon: "📦" },
    { id: "orders", label: "Comenzi", icon: "🚚" },
    { id: "import", label: "Import", icon: "📥" },
    { id: "reports", label: "Rapoarte", icon: "📊" },
    { id: "alerts", label: `Alerte ${alerts.length > 0 ? `(${alerts.length})` : ""}`, icon: "🔔" },
    { id: "settings", label: "Setari", icon: "⚙️" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && toast.show && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right duration-300">
          <div className={`
            rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md border-l-4
            ${toast.type === "success" ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-500" : ""}
            ${toast.type === "error" ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-500" : ""}
            ${toast.type === "info" ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500" : ""}
          `}>
            <div className="flex items-start gap-3">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0
                ${toast.type === "success" ? "bg-green-100 text-green-600" : ""}
                ${toast.type === "error" ? "bg-red-100 text-red-600" : ""}
                ${toast.type === "info" ? "bg-blue-100 text-blue-600" : ""}
              `}>
                {toast.type === "success" && "✓"}
                {toast.type === "error" && "✕"}
                {toast.type === "info" && "ℹ"}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${
                  toast.type === "success" ? "text-green-800" :
                  toast.type === "error" ? "text-red-800" : "text-blue-800"
                }`}>
                  {toast.message}
                </p>
                {toast.details && (
                  <p className="text-sm text-gray-600 mt-1">{toast.details}</p>
                )}
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📦 Dropshipping Manager</h1>
          <p className="text-gray-600">Gestioneaza produsele si comenzile dropshipping</p>
        </div>
        <Link href="/admin/supply-chain-hub">
          <span className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
            ← Inapoi
          </span>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-2xl font-bold text-gray-800">{stats.products.total}</p>
            <p className="text-sm text-gray-500">Produse totale</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-2xl font-bold text-gray-800">{stats.products.active}</p>
            <p className="text-sm text-gray-500">Produse active</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <p className="text-2xl font-bold text-gray-800">{stats.avgMargin}%</p>
            <p className="text-sm text-gray-500">Marja medie</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-2xl font-bold text-gray-800">{stats.orders.pending}</p>
            <p className="text-sm text-gray-500">Comenzi in asteptare</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
            <p className="text-2xl font-bold text-gray-800">{stats.financial.profit.toFixed(0)} RON</p>
            <p className="text-sm text-gray-500">Profit total</p>
          </div>
          {/* Curs BNR */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {exchangeRate ? exchangeRate.rate.toFixed(4) : "..."} 
                </p>
                <p className="text-sm text-gray-500">Curs EUR/RON</p>
                {exchangeRate && <p className="text-xs text-gray-400">{exchangeRate.date}</p>}
              </div>
              <button
                onClick={refreshExchangeRate}
                disabled={refreshingRate}
                className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                title="Actualizeaza cursul BNR"
              >
                {refreshingRate ? "⏳" : "🔄"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
              activeTab === tab.id
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Cauta produs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border rounded px-3 py-2 w-48"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="all">Toate statusurile</option>
                <option value="active">Active</option>
                <option value="paused">Pauzate</option>
                <option value="out_of_stock">Fara stoc</option>
              </select>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="all">Toti furnizorii</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              + Adauga Produs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Produs</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Pret Furnizor</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Pretul Tau</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Marja</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Stoc</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Livrare</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Actiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{product.name}</div>
                      {product.supplierCode && (
                        <div className="text-xs text-gray-500">Cod: {product.supplierCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {product.supplierPrice.toFixed(2)} {product.currency || "EUR"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {product.yourPrice.toFixed(2)} {product.currency || "EUR"}
                      {product.currency === "EUR" && (
                        <div className="text-xs text-gray-500">
                          ≈ {(product.yourPrice * 4.97).toFixed(2)} RON
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded text-sm ${
                        parseFloat(String(product.marginPercent)) >= 30 ? "bg-green-100 text-green-800" :
                        parseFloat(String(product.marginPercent)) >= 20 ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {product.marginPercent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${
                        product.stock === "in_stock" ? "text-green-600" :
                        product.stock === "limited" ? "text-yellow-600" :
                        "text-red-600"
                      }`}>
                        {product.stock === "in_stock" ? "In stoc" :
                         product.stock === "limited" ? "Limitat" :
                         product.stock === "out_of_stock" ? "Epuizat" : "Necunoscut"}
                        {product.stockQuantity !== null && ` (${product.stockQuantity})`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {product.deliveryDays} zile
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        product.status === "active" ? "bg-green-100 text-green-800" :
                        product.status === "paused" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {product.status === "active" ? "Activ" :
                         product.status === "paused" ? "Pauzat" : "Fara stoc"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => startEditProduct(product)}
                          className="px-2 py-1 rounded bg-blue-500 text-white text-xs hover:bg-blue-600"
                          title="Editeaza"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => toggleProductStatus(product.id, product.status)}
                          className={`px-2 py-1 rounded text-white text-xs ${
                            product.status === "active" ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-500 hover:bg-green-600"
                          }`}
                          title={product.status === "active" ? "Pauzeaza" : "Activeaza"}
                        >
                          {product.status === "active" ? "⏸️" : "▶️"}
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="px-2 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600"
                          title="Sterge"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {products.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nu au fost gasite produse dropshipping.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">🚚 Comenzi Dropship</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Comanda</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Produs</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Cant.</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Cost Furn.</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Pret Client</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Profit</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">AWB</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Actiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">#{order.orderId}</div>
                      <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">{order.product?.name || `Produs ${order.dropshipProductId}`}</td>
                    <td className="px-4 py-3 text-center">{order.quantity}</td>
                    <td className="px-4 py-3 text-right">{order.supplierPrice.toFixed(2)} RON</td>
                    <td className="px-4 py-3 text-right">{order.clientPrice.toFixed(2)} RON</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      +{order.profit?.toFixed(2)} RON
                    </td>
                    <td className="px-4 py-3 text-center">
                      {order.supplierAwb ? (
                        <span className="text-sm text-blue-600">{order.supplierAwb}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        order.status === "delivered" ? "bg-green-100 text-green-800" :
                        order.status === "shipped" ? "bg-blue-100 text-blue-800" :
                        order.status === "ordered" ? "bg-yellow-100 text-yellow-800" :
                        order.status === "cancelled" ? "bg-red-100 text-red-800" :
                        order.status === "new" ? "bg-purple-100 text-purple-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {order.status === "new" ? "Nouă" :
                         order.status === "pending" ? "În așteptare" :
                         order.status === "ordered" ? "Comandat" :
                         order.status === "shipped" ? "Expediat" :
                         order.status === "delivered" ? "Livrat" :
                         order.status === "cancelled" ? "Anulat" : order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {(order.status === "new" || order.isPending) && (
                          <button
                            onClick={() => openPlaceOrderModal(order)}
                            className="px-2 py-1 rounded bg-purple-500 text-white text-xs hover:bg-purple-600"
                            title="Plasează comanda la furnizor"
                          >
                            📦 Plasează
                          </button>
                        )}
                        {order.status === "pending" && (
                          <button
                            onClick={() => openPlaceOrderModal(order)}
                            className="px-2 py-1 rounded bg-yellow-500 text-white text-xs hover:bg-yellow-600"
                            title="Plasează comanda la furnizor"
                          >
                            📦 Plasează
                          </button>
                        )}
                        {order.status === "ordered" && (
                          <button
                            onClick={() => {
                              setAwbModalOrder(order);
                              setAwbInput(order.supplierAwb || "");
                              setShowAwbModal(true);
                            }}
                            className="px-2 py-1 rounded bg-blue-500 text-white text-xs hover:bg-blue-600"
                            title="Marchează expediat"
                          >
                            🚚
                          </button>
                        )}
                        {order.status === "shipped" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "delivered")}
                            className="px-2 py-1 rounded bg-green-500 text-white text-xs hover:bg-green-600"
                            title="Marchează livrat"
                          >
                            ✅
                          </button>
                        )}
                        {order.status === "delivered" && (
                          <button
                            onClick={() => openPlaceOrderModal(order)}
                            className="px-2 py-1 rounded bg-gray-500 text-white text-xs hover:bg-gray-600"
                            title="Vezi detalii comandă"
                          >
                            👁️ Detalii
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {orders.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nu exista comenzi dropship.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === "import" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-lg mb-4">📥 Import Produse din CSV/Excel</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Furnizor *</label>
                  <select
                    value={importSupplier}
                    onChange={(e) => setImportSupplier(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Selecteaza furnizor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marja implicita (%)</label>
                  <input
                    type="number"
                    value={importMargin}
                    onChange={(e) => setImportMargin(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fisier CSV/Excel *</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                
                <button
                  onClick={handleImport}
                  disabled={importing || !importFile || !importSupplier}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {importing ? "Se importa..." : "Importa Produse"}
                </button>
              </div>
              
              {importResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold text-green-700">Import finalizat!</h3>
                  <p>✅ {importResult.imported} produse importate</p>
                  <p>🔄 {importResult.updated} produse actualizate</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-red-600">
                      <p>❌ {importResult.errors.length} erori:</p>
                      <ul className="text-sm mt-1">
                        {importResult.errors.slice(0, 5).map((e, i) => (
                          <li key={i}>Rand {e.row}: {e.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">📋 Format fisier</h3>
              <p className="text-sm text-blue-700 mb-3">
                Fisierul trebuie sa contina urmatoarele coloane:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li><code>name</code> / <code>nume</code> / <code>produs</code> - Numele produsului *</li>
                <li><code>supplierCode</code> / <code>cod</code> / <code>SKU</code> - Cod furnizor</li>
                <li><code>supplierPrice</code> / <code>pret</code> - Pretul furnizorului *</li>
                <li><code>yourPrice</code> - Pretul tau (optional, se calculeaza din marja)</li>
                <li><code>category</code> / <code>categorie</code> - Categoria</li>
                <li><code>description</code> / <code>descriere</code> - Descriere</li>
                <li><code>stock</code> / <code>stoc</code> - Stoc (Da/Nu/Limitat)</li>
                <li><code>deliveryDays</code> / <code>livrare</code> - Zile livrare</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <ReportsSection />
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-lg">🔔 Alerte Active</h2>
            <button
              onClick={async () => {
                setCheckingAlerts(true);
                try {
                  const res = await fetch("/admin/api/dropship-alerts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "check" }),
                  });
                  if (res.ok) {
                    const result = await res.json();
                    loadAlerts();
                    loadStats();
                    showToast(
                      "Verificare completă!",
                      result.alertsCreated > 0 ? "info" : "success",
                      result.alertsCreated > 0 
                        ? `S-au generat ${result.alertsCreated} alerte noi.`
                        : "Nu s-au găsit probleme noi."
                    );
                  }
                } catch (error) {
                  console.error("Error checking alerts:", error);
                  showToast("Eroare la verificare", "error");
                } finally {
                  setCheckingAlerts(false);
                }
              }}
              disabled={checkingAlerts}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
            >
              {checkingAlerts ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span>Se verifică...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Verifică Acum</span>
                </>
              )}
            </button>
          </div>
          <div className="divide-y">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 flex items-center justify-between ${
                alert.severity === "critical" ? "bg-red-50" :
                alert.severity === "warning" ? "bg-yellow-50" : "bg-blue-50"
              }`}>
                <div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold mr-2 ${
                    alert.severity === "critical" ? "bg-red-200 text-red-800" :
                    alert.severity === "warning" ? "bg-yellow-200 text-yellow-800" :
                    "bg-blue-200 text-blue-800"
                  }`}>
                    {alert.type === "low_stock" ? "Stoc scazut" :
                     alert.type === "out_of_stock" ? "Fara stoc" :
                     alert.type === "margin_low" ? "Marja scazuta" :
                     alert.type === "price_change" ? "Schimbare pret" : alert.type}
                  </span>
                  <span className="text-gray-800">{alert.message}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  ✓ Rezolvat
                </button>
              </div>
            ))}
            
            {alerts.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                🎉 Nu ai alerte active!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-lg mb-4">⚙️ Setari Dropshipping</h2>
          
          <div className="max-w-2xl">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Furnizor</label>
              <select
                value={settingsSupplier}
                onChange={(e) => {
                  setSettingsSupplier(e.target.value);
                  loadSettings(e.target.value);
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Selecteaza furnizor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {settingsSupplier && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marja implicita (%)</label>
                    <input
                      type="number"
                      value={settings.defaultMarginPercent}
                      onChange={(e) => setSettings({ ...settings, defaultMarginPercent: parseFloat(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marja minima alertare (%)</label>
                    <input
                      type="number"
                      value={settings.minMarginPercent}
                      onChange={(e) => setSettings({ ...settings, minMarginPercent: parseFloat(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interval sincronizare (ore)</label>
                    <input
                      type="number"
                      value={settings.syncIntervalHours}
                      onChange={(e) => setSettings({ ...settings, syncIntervalHours: parseInt(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prag stoc scazut</label>
                    <input
                      type="number"
                      value={settings.lowStockThreshold}
                      onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.autoUpdatePrices}
                      onChange={(e) => setSettings({ ...settings, autoUpdatePrices: e.target.checked })}
                      className="rounded"
                    />
                    <span>Actualizare automata preturi</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.autoOrderEnabled}
                      onChange={(e) => setSettings({ ...settings, autoOrderEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <span>Plasare automata comenzi la furnizor</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                      className="rounded"
                    />
                    <span>Notificari email pentru alerte</span>
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={saveSettings}
                    disabled={savingSettings}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {savingSettings ? "Se salveaza..." : "Salveaza Setari"}
                  </button>
                  <button
                    onClick={() => runSync(settingsSupplier)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    🔄 Sincronizeaza Acum
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Adauga Produs Dropship</h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Furnizor *</label>
                  <select
                    value={newProduct.supplierId}
                    onChange={(e) => setNewProduct({ ...newProduct, supplierId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Selecteaza</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leaga de produs magazin</label>
                  <select
                    value={newProduct.productId}
                    onChange={(e) => setNewProduct({ ...newProduct, productId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">-- Nu e legat --</option>
                    {shopProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nume produs *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cod furnizor</label>
                <input
                  type="text"
                  value={newProduct.supplierCode}
                  onChange={(e) => setNewProduct({ ...newProduct, supplierCode: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pret furnizor *</label>
                  <input
                    type="number"
                    value={newProduct.supplierPrice}
                    onChange={(e) => {
                      const sp = e.target.value;
                      setNewProduct({ ...newProduct, supplierPrice: sp });
                      if (marginPercent) {
                        setNewProduct(prev => ({ ...prev, supplierPrice: sp, yourPrice: calculateYourPrice(sp, marginPercent) }));
                      }
                    }}
                    className="w-full border rounded px-3 py-2"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select
                    value={newProduct.currency}
                    onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="EUR">EUR</option>
                    <option value="RON">RON</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marja dorita (%)</label>
                  <input
                    type="number"
                    value={marginPercent}
                    onChange={(e) => {
                      const m = e.target.value;
                      setMarginPercent(m);
                      if (newProduct.supplierPrice) {
                        setNewProduct(prev => ({ ...prev, yourPrice: calculateYourPrice(prev.supplierPrice, m) }));
                      }
                    }}
                    className="w-full border rounded px-3 py-2 bg-yellow-50"
                    step="0.1"
                    placeholder="ex: 25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pretul tau (calculat)</label>
                  <input
                    type="number"
                    value={newProduct.yourPrice}
                    onChange={(e) => {
                      const yp = e.target.value;
                      setNewProduct({ ...newProduct, yourPrice: yp });
                      if (newProduct.supplierPrice) {
                        setMarginPercent(calculateMargin(newProduct.supplierPrice, yp));
                      }
                    }}
                    className="w-full border rounded px-3 py-2 font-semibold"
                    step="0.01"
                  />
                  {newProduct.currency === "EUR" && newProduct.yourPrice && (
                    <p className="text-xs text-green-600 mt-1">
                      ≈ {(parseFloat(newProduct.yourPrice) * 4.97).toFixed(2)} RON (curs: 4.97)
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zile livrare</label>
                  <input
                    type="number"
                    value={newProduct.deliveryDays}
                    onChange={(e) => setNewProduct({ ...newProduct, deliveryDays: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stoc</label>
                  <select
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="in_stock">In stoc</option>
                    <option value="limited">Limitat</option>
                    <option value="out_of_stock">Epuizat</option>
                    <option value="unknown">Necunoscut</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={addProduct}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Adauga
              </button>
              <button
                onClick={() => { setShowAddModal(false); setMarginPercent(""); }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Anuleaza
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Editeaza Produs Dropship</h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Furnizor</label>
                  <select
                    value={editingProduct.supplierId}
                    onChange={(e) => setEditingProduct({ ...editingProduct, supplierId: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leaga de produs magazin</label>
                  <select
                    value={editingProduct.productId || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, productId: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">-- Nu e legat --</option>
                    {shopProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nume produs</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cod furnizor</label>
                <input
                  type="text"
                  value={editingProduct.supplierCode || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, supplierCode: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pret furnizor</label>
                  <input
                    type="number"
                    value={editingProduct.supplierPrice}
                    onChange={(e) => {
                      const sp = parseFloat(e.target.value);
                      setEditingProduct({ ...editingProduct, supplierPrice: sp });
                      if (marginPercent) {
                        const yp = sp * (1 + parseFloat(marginPercent) / 100);
                        setEditingProduct(prev => prev ? { ...prev, supplierPrice: sp, yourPrice: parseFloat(yp.toFixed(2)) } : prev);
                      }
                    }}
                    className="w-full border rounded px-3 py-2"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select
                    value={editingProduct.currency || "EUR"}
                    onChange={(e) => setEditingProduct({ ...editingProduct, currency: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="EUR">EUR</option>
                    <option value="RON">RON</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marja (%)</label>
                  <input
                    type="number"
                    value={marginPercent}
                    onChange={(e) => {
                      const m = e.target.value;
                      setMarginPercent(m);
                      if (editingProduct.supplierPrice) {
                        const yp = editingProduct.supplierPrice * (1 + parseFloat(m) / 100);
                        setEditingProduct(prev => prev ? { ...prev, yourPrice: parseFloat(yp.toFixed(2)) } : prev);
                      }
                    }}
                    className="w-full border rounded px-3 py-2 bg-yellow-50"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pretul tau</label>
                  <input
                    type="number"
                    value={editingProduct.yourPrice}
                    onChange={(e) => {
                      const yp = parseFloat(e.target.value);
                      setEditingProduct({ ...editingProduct, yourPrice: yp });
                      if (editingProduct.supplierPrice > 0) {
                        const m = ((yp - editingProduct.supplierPrice) / editingProduct.supplierPrice * 100).toFixed(1);
                        setMarginPercent(m);
                      }
                    }}
                    className="w-full border rounded px-3 py-2 font-semibold"
                    step="0.01"
                  />
                  {editingProduct.currency === "EUR" && editingProduct.yourPrice > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      ≈ {(editingProduct.yourPrice * 4.97).toFixed(2)} RON (curs: 4.97)
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zile livrare</label>
                  <input
                    type="number"
                    value={editingProduct.deliveryDays}
                    onChange={(e) => setEditingProduct({ ...editingProduct, deliveryDays: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stoc</label>
                  <select
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="in_stock">In stoc</option>
                    <option value="limited">Limitat</option>
                    <option value="out_of_stock">Epuizat</option>
                    <option value="unknown">Necunoscut</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="active">Activ</option>
                    <option value="paused">Pauzat</option>
                    <option value="out_of_stock">Fara stoc</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={updateProduct}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Salveaza
              </button>
              <button
                onClick={() => { setShowEditModal(false); setEditingProduct(null); setMarginPercent(""); }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Anuleaza
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal AWB Profesional */}
      {showAwbModal && awbModalOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚚</span>
                  <div>
                    <h2 className="text-xl font-bold">Marchează Expediat</h2>
                    <p className="text-sm text-blue-100">Comanda #{awbModalOrder.orderId}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAwbModal(false); setAwbModalOrder(null); setAwbInput(""); }}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium mb-1">Produs</div>
                <div className="font-semibold text-gray-800">{awbModalOrder.productName}</div>
                <div className="text-sm text-gray-500 mt-1">Cantitate: {awbModalOrder.quantity} buc</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Număr AWB (tracking)
                </label>
                <input
                  type="text"
                  value={awbInput}
                  onChange={(e) => setAwbInput(e.target.value)}
                  placeholder="Introdu numărul AWB de la curier..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Acest număr va fi folosit pentru tracking-ul coletului
                </p>
              </div>

              {awbModalOrder.supplierOrderId && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Nr. comandă furnizor</div>
                  <div className="font-mono text-gray-700">{awbModalOrder.supplierOrderId}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex gap-3 justify-end">
              <button
                onClick={() => { setShowAwbModal(false); setAwbModalOrder(null); setAwbInput(""); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={async () => {
                  if (!awbInput.trim()) {
                    showToast("Introdu un număr AWB valid", "error");
                    return;
                  }
                  setSavingAwb(true);
                  try {
                    await updateOrderStatus(awbModalOrder.id, "shipped", awbInput.trim());
                    setShowAwbModal(false);
                    setAwbModalOrder(null);
                    setAwbInput("");
                    showToast("Comanda a fost marcată ca expediată!", "success");
                  } catch {
                    showToast("Eroare la salvare", "error");
                  } finally {
                    setSavingAwb(false);
                  }
                }}
                disabled={savingAwb || !awbInput.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {savingAwb ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span>Se salvează...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Confirmă Expediere</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Plasare Comandă la Furnizor */}
      {showPlaceOrderModal && placeOrderData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    📦 Plasare Comandă la Furnizor
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    Comandă #{placeOrderData.order.orderId} • {new Date(placeOrderData.order.createdAt).toLocaleDateString("ro-RO")}
                  </p>
                </div>
                <button
                  onClick={() => setShowPlaceOrderModal(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Grid cu informații */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Produsul comandat */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    🏷️ Produs Comandat
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-gray-900">
                      {placeOrderData.order.product?.name || placeOrderData.productDetails?.name || "N/A"}
                    </p>
                    {placeOrderData.productDetails?.supplierCode && (
                      <p className="text-gray-600">
                        <span className="font-medium">Cod furnizor:</span> {placeOrderData.productDetails.supplierCode}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        Cantitate: <strong>{placeOrderData.order.quantity}</strong>
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        Cost: <strong>{placeOrderData.order.supplierPrice.toFixed(2)} RON</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Datele furnizorului */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    🏢 Furnizor
                  </h3>
                  {placeOrderData.supplier ? (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-gray-900">{placeOrderData.supplier.name}</p>
                      {placeOrderData.supplier.contactPerson && (
                        <p className="text-gray-600">
                          <span className="font-medium">Contact:</span> {placeOrderData.supplier.contactPerson}
                        </p>
                      )}
                      {placeOrderData.supplier.email && (
                        <p className="text-gray-600">
                          <span className="font-medium">Email:</span>{" "}
                          <a href={`mailto:${placeOrderData.supplier.email}`} className="text-blue-600 hover:underline">
                            {placeOrderData.supplier.email}
                          </a>
                        </p>
                      )}
                      {placeOrderData.supplier.phone && (
                        <p className="text-gray-600">
                          <span className="font-medium">Telefon:</span>{" "}
                          <a href={`tel:${placeOrderData.supplier.phone}`} className="text-blue-600 hover:underline">
                            {placeOrderData.supplier.phone}
                          </a>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Furnizor necunoscut</p>
                  )}
                </div>

                {/* Datele clientului - livrare */}
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 md:col-span-2">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    📍 Adresa de Livrare (către clientul nostru)
                  </h3>
                  {placeOrderData.client ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">
                          {placeOrderData.client.companyName || placeOrderData.client.name || placeOrderData.client.denumire}
                        </p>
                        {placeOrderData.client.cui && (
                          <p className="text-gray-600">CUI: {placeOrderData.client.cui}</p>
                        )}
                        <p className="text-gray-600 mt-2">
                          {placeOrderData.client.address}
                        </p>
                        <p className="text-gray-600">
                          {placeOrderData.client.city}{placeOrderData.client.county ? `, jud. ${placeOrderData.client.county}` : ""}
                          {placeOrderData.client.postalCode ? `, ${placeOrderData.client.postalCode}` : ""}
                        </p>
                      </div>
                      <div>
                        {placeOrderData.client.phone && (
                          <p className="text-gray-600">
                            <span className="font-medium">Telefon:</span>{" "}
                            <a href={`tel:${placeOrderData.client.phone}`} className="text-blue-600 hover:underline">
                              {placeOrderData.client.phone}
                            </a>
                          </p>
                        )}
                        {placeOrderData.client.email && (
                          <p className="text-gray-600">
                            <span className="font-medium">Email:</span>{" "}
                            <a href={`mailto:${placeOrderData.client.email}`} className="text-blue-600 hover:underline">
                              {placeOrderData.client.email}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Date client indisponibile</p>
                  )}
                </div>
              </div>

              {/* Formularul de plasare */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border border-green-200">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  ✏️ Detalii Comandă Furnizor
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nr. Comandă Furnizor (opțional)
                    </label>
                    <input
                      type="text"
                      value={supplierOrderId}
                      onChange={(e) => setSupplierOrderId(e.target.value)}
                      placeholder="ex: ORD-12345"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Numărul comenzii primite de la furnizor</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AWB Furnizor (opțional)
                    </label>
                    <input
                      type="text"
                      value={supplierAwb}
                      onChange={(e) => setSupplierAwb(e.target.value)}
                      placeholder="ex: RO123456789"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Poți adăuga AWB-ul mai târziu când îl primești</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note interne (opțional)
                    </label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Note despre comandă..."
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Opțiuni Protecție Dropshipping */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  🛡️ Protecție Confidențialitate
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Aceste opțiuni vor fi incluse în notele comenzii către furnizor
                </p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={blindShipping}
                      onChange={(e) => setBlindShipping(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-700 group-hover:text-blue-600">Blind Shipping</span>
                      <p className="text-xs text-gray-500">Nu trimiteți factură sau documente cu prețuri în colet</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={noInvoiceInPackage}
                      onChange={(e) => setNoInvoiceInPackage(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-700 group-hover:text-blue-600">Fără factură în colet</span>
                      <p className="text-xs text-gray-500">Trimiteți factura separat sau doar la adresa mea</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={useMyBranding}
                      onChange={(e) => setUseMyBranding(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-700 group-hover:text-blue-600">Etichetare cu brandul meu</span>
                      <p className="text-xs text-gray-500">Pe eticheta de retur să apară numele firmei mele (dacă e posibil)</p>
                    </div>
                  </label>
                </div>
                
                {(blindShipping || noInvoiceInPackage || useMyBranding) && (
                  <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-800">
                    <strong>📋 Notă auto-generată pentru furnizor:</strong><br/>
                    {blindShipping && "• BLIND SHIPPING: Vă rugăm să nu includeți facturi sau prețuri în colet."}
                    {blindShipping && <br/>}
                    {noInvoiceInPackage && "• Factura să fie trimisă doar către noi, NU în colet."}
                    {noInvoiceInPackage && <br/>}
                    {useMyBranding && "• Dacă e posibil, pe eticheta de retur să apară 'PREV-COR TPM'."}
                  </div>
                )}
              </div>

              {/* Rezumat financiar */}
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-gray-600">Cost furnizor:</span>
                    <span className="font-semibold ml-2">{placeOrderData.order.supplierPrice.toFixed(2)} RON</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Preț client:</span>
                    <span className="font-semibold ml-2">{placeOrderData.order.clientPrice.toFixed(2)} RON</span>
                  </div>
                  <div className="text-green-600">
                    <span className="font-medium">Profit estimat:</span>
                    <span className="font-bold ml-2">+{placeOrderData.order.profit.toFixed(2)} RON</span>
                  </div>
                </div>
              </div>

              {/* Acțiuni */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  onClick={() => setShowPlaceOrderModal(false)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={confirmAndPlaceOrder}
                  disabled={placingOrder}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {placingOrder ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Se procesează...
                    </>
                  ) : (
                    <>
                      ✓ Confirmă Plasare Comandă
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componenta Rapoarte separata - versiune avansată
function ReportsSection() {
  const [reportType, setReportType] = useState<"by-product" | "by-supplier">("by-product");
  const [periodFilter, setPeriodFilter] = useState<"today" | "week" | "month" | "year" | "all" | "custom">("month");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [reportData, setReportData] = useState<Array<{
    id: number;
    name: string;
    orders: number;
    revenue?: number;
    cost?: number;
    profit: number;
    delivered?: number;
    avgDeliveryDays?: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<{
    totalOrders: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgMargin: number;
  } | null>(null);

  // Calculează datele pentru filtrul de perioadă
  const getDateRange = useCallback(() => {
    const now = new Date();
    let dateFrom = "";
    let dateTo = now.toISOString().split("T")[0];

    switch (periodFilter) {
      case "today":
        dateFrom = dateTo;
        break;
      case "week":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFrom = weekAgo.toISOString().split("T")[0];
        break;
      case "month":
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFrom = monthAgo.toISOString().split("T")[0];
        break;
      case "year":
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFrom = yearAgo.toISOString().split("T")[0];
        break;
      case "custom":
        dateFrom = customDateFrom;
        dateTo = customDateTo || dateTo;
        break;
      case "all":
      default:
        return { dateFrom: "", dateTo: "" };
    }

    return { dateFrom, dateTo };
  }, [periodFilter, customDateFrom, customDateTo]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const { dateFrom, dateTo } = getDateRange();
      const params = new URLSearchParams();
      params.set("type", reportType);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/admin/api/dropship-stats?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);

        // Calculează totalurile
        if (Array.isArray(data)) {
          const totals = data.reduce(
            (acc, row) => ({
              totalOrders: acc.totalOrders + (row.orders || 0),
              totalRevenue: acc.totalRevenue + (row.revenue || 0),
              totalCost: acc.totalCost + (row.cost || 0),
              totalProfit: acc.totalProfit + (row.profit || 0),
            }),
            { totalOrders: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 }
          );
          const avgMargin = totals.totalCost > 0 
            ? ((totals.totalRevenue - totals.totalCost) / totals.totalCost) * 100 
            : 0;
          setOverview({ ...totals, avgMargin });
        }
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  }, [reportType, getDateRange]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Export CSV
  const exportCSV = () => {
    if (reportData.length === 0) return;
    
    const headers = reportType === "by-product"
      ? ["Produs", "Comenzi", "Venituri (RON)", "Costuri (RON)", "Profit (RON)", "Marja (%)"]
      : ["Furnizor", "Comenzi", "Livrate", "Timp Mediu (zile)", "Profit (RON)"];
    
    const rows = reportData.map(row => {
      if (reportType === "by-product") {
        const margin = row.cost && row.cost > 0 ? (((row.revenue || 0) - row.cost) / row.cost * 100).toFixed(1) : "0";
        return [row.name, row.orders, (row.revenue || 0).toFixed(2), (row.cost || 0).toFixed(2), row.profit.toFixed(2), margin];
      } else {
        return [row.name, row.orders, row.delivered || 0, row.avgDeliveryDays || "-", row.profit.toFixed(2)];
      }
    });

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raport-dropship-${reportType}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabels: Record<string, string> = {
    today: "Azi",
    week: "Ultima săptămână",
    month: "Ultima lună",
    year: "Ultimul an",
    all: "Tot timpul",
    custom: "Perioadă personalizată",
  };

  return (
    <div className="space-y-6">
      {/* Filtre */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {/* Tip raport */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Raport:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setReportType("by-product")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  reportType === "by-product" 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📦 Per Produs
              </button>
              <button
                onClick={() => setReportType("by-supplier")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  reportType === "by-supplier" 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                🏢 Per Furnizor
              </button>
            </div>
          </div>

          {/* Filtru perioadă */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Perioadă:</span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as typeof periodFilter)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value="today">Azi</option>
              <option value="week">Ultima săptămână</option>
              <option value="month">Ultima lună</option>
              <option value="year">Ultimul an</option>
              <option value="all">Tot timpul</option>
              <option value="custom">Personalizat</option>
            </select>
          </div>

          {/* Date personalizate */}
          {periodFilter === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          )}

          {/* Export */}
          <button
            onClick={exportCSV}
            disabled={reportData.length === 0}
            className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-2xl font-bold text-gray-800">{overview.totalOrders}</p>
            <p className="text-sm text-gray-500">Comenzi totale</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <p className="text-2xl font-bold text-gray-800">{overview.totalRevenue.toFixed(0)} <span className="text-sm font-normal">RON</span></p>
            <p className="text-sm text-gray-500">Venituri</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <p className="text-2xl font-bold text-gray-800">{overview.totalCost.toFixed(0)} <span className="text-sm font-normal">RON</span></p>
            <p className="text-sm text-gray-500">Costuri furnizori</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-2xl font-bold text-green-600">+{overview.totalProfit.toFixed(0)} <span className="text-sm font-normal">RON</span></p>
            <p className="text-sm text-gray-500">Profit net</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <p className="text-2xl font-bold text-gray-800">{overview.avgMargin.toFixed(1)}%</p>
            <p className="text-sm text-gray-500">Marja medie</p>
          </div>
        </div>
      )}

      {/* Tabel date */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">
            📊 {reportType === "by-product" ? "Raport per Produs" : "Raport per Furnizor"}
          </h2>
          <span className="text-sm text-gray-500">{periodLabels[periodFilter]}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    {reportType === "by-product" ? "Produs" : "Furnizor"}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Comenzi</th>
                  {reportType === "by-product" && (
                    <>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Venituri</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Costuri</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Marja</th>
                    </>
                  )}
                  {reportType === "by-supplier" && (
                    <>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Livrate</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Timp Mediu</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.map((row) => {
                  const margin = row.cost && row.cost > 0 
                    ? (((row.revenue || 0) - row.cost) / row.cost * 100) 
                    : 0;
                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-center">{row.orders}</td>
                      {reportType === "by-product" && (
                        <>
                          <td className="px-4 py-3 text-right">{(row.revenue || 0).toFixed(2)} RON</td>
                          <td className="px-4 py-3 text-right">{(row.cost || 0).toFixed(2)} RON</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              margin >= 30 ? "bg-green-100 text-green-800" :
                              margin >= 15 ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                        </>
                      )}
                      {reportType === "by-supplier" && (
                        <>
                          <td className="px-4 py-3 text-center">{row.delivered || 0}</td>
                          <td className="px-4 py-3 text-center">{row.avgDeliveryDays || "-"} zile</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        +{row.profit.toFixed(2)} RON
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer cu totaluri */}
              {reportData.length > 0 && overview && (
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-center">{overview.totalOrders}</td>
                    {reportType === "by-product" && (
                      <>
                        <td className="px-4 py-3 text-right">{overview.totalRevenue.toFixed(2)} RON</td>
                        <td className="px-4 py-3 text-right">{overview.totalCost.toFixed(2)} RON</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                            {overview.avgMargin.toFixed(1)}%
                          </span>
                        </td>
                      </>
                    )}
                    {reportType === "by-supplier" && (
                      <>
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3 text-center">-</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right text-green-600">+{overview.totalProfit.toFixed(2)} RON</td>
                  </tr>
                </tfoot>
              )}
            </table>
            
            {reportData.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nu există date pentru această perioadă.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
