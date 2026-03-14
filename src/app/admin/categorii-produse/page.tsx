'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaChevronDown, FaChevronRight, FaSync } from 'react-icons/fa';
import Toast from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

interface Subcategory {
  id: number;
  name: string;
}

interface CategoryItem {
  id: number;
  name: string;
  domainId?: number; // Pentru legarea tipurilor la domenii
  subcategories?: Subcategory[];
}

interface ProductCategories {
  domains: CategoryItem[];
  types: CategoryItem[];
  manufacturers: CategoryItem[];
}

export default function CategoriiProdusePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ProductCategories>({
    domains: [],
    types: [],
    manufacturers: [],
  });
  
  // Expanded categories (to show subcategories)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  
  // New item inputs
  const [newDomain, setNewDomain] = useState('');
  const [newType, setNewType] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newSubcategory, setNewSubcategory] = useState<{ parentId: number; value: string } | null>(null);
  
  // Editing state
  const [editing, setEditing] = useState<{ 
    category: string; 
    id: number; 
    isSubcategory?: boolean;
    parentId?: number;
    value: string 
  } | null>(null);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadCategories = async () => {
    try {
      const res = await fetch('/admin/api/product-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setToast({ message: 'Eroare la încărcare', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpanded(newExpanded);
  };

  const apiCall = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/admin/api/product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (res.ok) {
        setCategories(prev => ({ ...prev, [body.category as string]: result.data }));
        return { success: true, message: result.message, productsUpdated: result.productsUpdated };
      } else {
        setToast({ message: result.error || 'Eroare', type: 'error' });
        return { success: false };
      }
    } catch (error) {
      console.error('API error:', error);
      setToast({ message: 'Eroare de conexiune', type: 'error' });
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (category: 'domains' | 'types' | 'manufacturers', value: string, clearFn: () => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    
    const result = await apiCall({ action: 'add', category, name: trimmed });
    if (result.success) {
      setToast({ message: 'Adăugat cu succes', type: 'success' });
      clearFn();
    }
  };

  const handleAddSubcategory = async (category: string, parentId: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    const result = await apiCall({ action: 'addSub', category, parentId, name: trimmed });
    if (result.success) {
      setToast({ message: 'Subcategorie adăugată', type: 'success' });
      setNewSubcategory(null);
    }
  };

  const handleUpdate = async (category: string, id: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    const result = await apiCall({ action: 'update', category, id, name: trimmed });
    if (result.success) {
      const msg = result.message ? `Salvat! ${result.message}` : 'Salvat cu succes';
      setToast({ message: msg, type: 'success' });
      setEditing(null);
    }
  };

  const handleUpdateSubcategory = async (category: string, parentId: number, subId: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    const result = await apiCall({ action: 'updateSub', category, parentId, subId, name: trimmed });
    if (result.success) {
      const msg = result.message ? `Salvat! ${result.message}` : 'Salvat cu succes';
      setToast({ message: msg, type: 'success' });
      setEditing(null);
    }
  };

  const handleDelete = (category: string, id: number, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmare ștergere',
      message: `Sigur doriți să ștergeți "${name}"? ${category === 'types' ? 'Acest lucru va șterge și toate subcategoriile.' : ''} Produsele asociate vor fi mutate la "Altele".`,
      onConfirm: async () => {
        const result = await apiCall({ action: 'delete', category, id });
        if (result.success) {
          const msg = result.message ? `Șters! ${result.message}` : 'Șters cu succes';
          setToast({ message: msg, type: 'success' });
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const handleImportFromProducts = async () => {
    setSaving(true);
    try {
      const res = await fetch('/admin/api/product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'importFromProducts', category: 'domains' }),
      });
      const result = await res.json();
      if (res.ok) {
        setCategories({
          domains: result.domains,
          types: result.types,
          manufacturers: result.manufacturers
        });
        setToast({ message: result.message || 'Import realizat cu succes', type: 'success' });
      } else {
        setToast({ message: result.error || 'Eroare la import', type: 'error' });
      }
    } catch (error) {
      console.error('Import error:', error);
      setToast({ message: 'Eroare de conexiune', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubcategory = (category: string, parentId: number, subId: number, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmare ștergere',
      message: `Sigur doriți să ștergeți subcategoria "${name}"? Produsele asociate vor fi mutate la categoria părinte.`,
      onConfirm: async () => {
        const result = await apiCall({ action: 'deleteSub', category, parentId, subId });
        if (result.success) {
          const msg = result.message ? `Șters! ${result.message}` : 'Șters cu succes';
          setToast({ message: msg, type: 'success' });
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const handleSetDomain = async (typeId: number, domainId: number | undefined) => {
    setSaving(true);
    try {
      const res = await fetch('/admin/api/product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'setDomain', category: 'types', id: typeId, domainId }),
      });
      const result = await res.json();
      if (res.ok) {
        setCategories(prev => ({ ...prev, types: result.data }));
        const domainName = categories.domains.find(d => d.id === domainId)?.name || 'Toate';
        setToast({ message: `Tip asociat la: ${domainName}`, type: 'success' });
      } else {
        setToast({ message: result.error || 'Eroare', type: 'error' });
      }
    } catch (error) {
      console.error('Error setting domain:', error);
      setToast({ message: 'Eroare de conexiune', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderSimpleCategory = (
    title: string,
    items: CategoryItem[],
    categoryKey: 'domains' | 'manufacturers',
    newValue: string,
    setNewValue: (v: string) => void
  ) => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd(categoryKey, newValue, () => setNewValue(''))}
          placeholder={`Adaugă...`}
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => handleAdd(categoryKey, newValue, () => setNewValue(''))}
          disabled={!newValue.trim() || saving}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          <FaPlus />
        </button>
      </div>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-gray-500 italic">Nu există {title.toLowerCase()}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              {editing?.category === categoryKey && editing?.id === item.id && !editing?.isSubcategory ? (
                <>
                  <input
                    type="text"
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(categoryKey, item.id, editing.value);
                      if (e.key === 'Escape') setEditing(null);
                    }}
                    className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(categoryKey, item.id, editing.value)} className="p-2 text-green-600 hover:bg-green-100 rounded"><FaSave /></button>
                  <button onClick={() => setEditing(null)} className="p-2 text-gray-600 hover:bg-gray-200 rounded"><FaTimes /></button>
                </>
              ) : (
                <>
                  <span className="flex-1">{item.name}</span>
                  <button onClick={() => setEditing({ category: categoryKey, id: item.id, value: item.name })} className="p-2 text-blue-600 hover:bg-blue-100 rounded"><FaEdit /></button>
                  <button onClick={() => handleDelete(categoryKey, item.id, item.name)} className="p-2 text-red-600 hover:bg-red-100 rounded"><FaTrash /></button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderTypesWithSubcategories = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Tipuri Produse</h2>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd('types', newType, () => setNewType(''))}
          placeholder="Adaugă categorie principală..."
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => handleAdd('types', newType, () => setNewType(''))}
          disabled={!newType.trim() || saving}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          <FaPlus />
        </button>
      </div>
      
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {categories.types.length === 0 ? (
          <p className="text-gray-500 italic">Nu există tipuri</p>
        ) : (
          categories.types.map((type) => {
            const isExpanded = expanded.has(`type-${type.id}`);
            const hasSubcategories = type.subcategories && type.subcategories.length > 0;
            
            return (
              <div key={type.id} className="border rounded">
                {/* Main category row */}
                <div className="flex items-center gap-2 p-3 bg-gray-50">
                  <button 
                    onClick={() => toggleExpand(`type-${type.id}`)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                  </button>
                  
                  {editing?.category === 'types' && editing?.id === type.id && !editing?.isSubcategory ? (
                    <>
                      <input
                        type="text"
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate('types', type.id, editing.value);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button onClick={() => handleUpdate('types', type.id, editing.value)} className="p-2 text-green-600 hover:bg-green-100 rounded"><FaSave /></button>
                      <button onClick={() => setEditing(null)} className="p-2 text-gray-600 hover:bg-gray-200 rounded"><FaTimes /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{type.name}</span>
                      <select
                        value={type.domainId || ''}
                        onChange={(e) => handleSetDomain(type.id, e.target.value ? parseInt(e.target.value) : undefined)}
                        className="text-xs border rounded px-2 py-1 bg-white"
                        title="Domeniu"
                      >
                        <option value="">Toate domeniile</option>
                        {categories.domains.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      {hasSubcategories && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {type.subcategories!.length} subcategorii
                        </span>
                      )}
                      <button onClick={() => setEditing({ category: 'types', id: type.id, value: type.name })} className="p-2 text-blue-600 hover:bg-blue-100 rounded"><FaEdit /></button>
                      <button onClick={() => handleDelete('types', type.id, type.name)} className="p-2 text-red-600 hover:bg-red-100 rounded"><FaTrash /></button>
                    </>
                  )}
                </div>
                
                {/* Subcategories */}
                {isExpanded && (
                  <div className="border-t bg-white p-3 pl-8 space-y-2">
                    {/* Add subcategory input */}
                    {newSubcategory?.parentId === type.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubcategory.value}
                          onChange={(e) => setNewSubcategory({ ...newSubcategory, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddSubcategory('types', type.id, newSubcategory.value);
                            if (e.key === 'Escape') setNewSubcategory(null);
                          }}
                          placeholder="Nume subcategorie..."
                          className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          autoFocus
                        />
                        <button 
                          onClick={() => handleAddSubcategory('types', type.id, newSubcategory.value)}
                          disabled={!newSubcategory.value.trim() || saving}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                        >
                          <FaSave />
                        </button>
                        <button onClick={() => setNewSubcategory(null)} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"><FaTimes /></button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setNewSubcategory({ parentId: type.id, value: '' })}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <FaPlus className="w-3 h-3" /> Adaugă subcategorie
                      </button>
                    )}
                    
                    {/* Subcategories list */}
                    {type.subcategories && type.subcategories.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                        {editing?.isSubcategory && editing?.parentId === type.id && editing?.id === sub.id ? (
                          <>
                            <input
                              type="text"
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateSubcategory('types', type.id, sub.id, editing.value);
                                if (e.key === 'Escape') setEditing(null);
                              }}
                              className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button onClick={() => handleUpdateSubcategory('types', type.id, sub.id, editing.value)} className="p-1 text-green-600 hover:bg-green-100 rounded"><FaSave /></button>
                            <button onClick={() => setEditing(null)} className="p-1 text-gray-600 hover:bg-gray-200 rounded"><FaTimes /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 ml-2">• {sub.name}</span>
                            <button 
                              onClick={() => setEditing({ category: 'types', id: sub.id, isSubcategory: true, parentId: type.id, value: sub.name })} 
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            >
                              <FaEdit className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => handleDeleteSubcategory('types', type.id, sub.id, sub.name)} 
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {(!type.subcategories || type.subcategories.length === 0) && !newSubcategory && (
                      <p className="text-gray-400 italic text-sm ml-2">Nu există subcategorii</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Categorii Produse</h1>
          <div className="flex gap-2">
            <button
              onClick={handleImportFromProducts}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              title="Importă categorii din produsele existente"
            >
              <FaSync className={saving ? 'animate-spin' : ''} />
              Import din produse
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Înapoi la Admin
            </button>
          </div>
        </div>

        {saving && (
          <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">
            Se salvează...
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {renderSimpleCategory('Domenii', categories.domains, 'domains', newDomain, setNewDomain)}
          <div className="lg:col-span-2">
            {renderTypesWithSubcategories()}
          </div>
          {renderSimpleCategory('Producători', categories.manufacturers, 'manufacturers', newManufacturer, setNewManufacturer)}
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Șterge"
        confirmColor="red"
      />
    </div>
  );
}
