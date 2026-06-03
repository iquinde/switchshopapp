import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  ClipboardList,
  Edit2,
  Loader2,
  PackagePlus,
  Plus,
  Save,
  Search,
  Trash2,
  X
} from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Purchase, PurchaseItem } from '../types';

interface PurchasesManagerProps {
  products: Product[];
  companyId?: string;
}

interface PurchaseFormItem {
  productId: string;
  quantity: string;
  cost: string;
}

const formatDate = (value: any) => {
  if (!value) return 'Sin fecha';
  if (typeof value === 'string') return new Date(value).toLocaleDateString();
  if (value?.seconds) return new Date(value.seconds * 1000).toLocaleDateString();
  return new Date(value).toLocaleDateString();
};

const getDateInputValue = (value: any) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = typeof value === 'string' ? new Date(value) : value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

const getPurchaseItems = (purchase: Purchase): PurchaseItem[] => {
  if (Array.isArray(purchase.items) && purchase.items.length > 0) {
    return purchase.items;
  }

  if (purchase.productId && purchase.productName && purchase.quantity && purchase.cost) {
    return [{
      productId: purchase.productId,
      productName: purchase.productName,
      quantity: purchase.quantity,
      cost: purchase.cost,
      total: purchase.total || purchase.quantity * purchase.cost
    }];
  }

  return [];
};

const getQuantityByProduct = (items: PurchaseItem[]) => {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
    return acc;
  }, {});
};

const withoutUndefined = <T extends Record<string, unknown>>(data: T) => {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as T;
};

export default function PurchasesManager({ products, companyId = 'comp-default' }: PurchasesManagerProps) {
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [productFilter, setProductFilter] = React.useState('todos');
  const [pickerSearch, setPickerSearch] = React.useState('');
  const [pickerCategory, setPickerCategory] = React.useState('todos');
  const [firebaseError, setFirebaseError] = React.useState('');
  const [summaryYear, setSummaryYear] = React.useState(new Date().getFullYear());
  const [formData, setFormData] = React.useState({
    lot: '',
    date: new Date().toISOString().slice(0, 10),
    supplier: '',
    notes: ''
  });
  const [formItems, setFormItems] = React.useState<PurchaseFormItem[]>([]);

  const matchesActiveCompany = React.useCallback((record: { companyId?: string }) => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !record.companyId || record.companyId === 'comp-default';
    return record.companyId === companyId;
  }, [companyId]);

  const targetCompanyId = companyId === 'all' ? 'comp-default' : companyId;
  const companyProducts = React.useMemo(() => products.filter(matchesActiveCompany), [products, matchesActiveCompany]);
  const pickerCategories = React.useMemo(() => {
    return Array.from(new Set(companyProducts.map(product => product.category).filter(Boolean))).sort();
  }, [companyProducts]);

  const pickerProducts = React.useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    return companyProducts.filter(product => {
      const matchesSearch = !term ||
        product.name.toLowerCase().includes(term) ||
        (product.sku || '').toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);
      const matchesCategory = pickerCategory === 'todos' || product.category === pickerCategory;
      return matchesSearch && matchesCategory;
    });
  }, [companyProducts, pickerCategory, pickerSearch]);

  const purchaseItems = React.useMemo<PurchaseItem[]>(() => {
    return formItems
      .map(item => {
        const product = companyProducts.find(productItem => productItem.id === item.productId);
        const quantity = Math.max(0, parseInt(item.quantity, 10) || 0);
        const cost = Math.max(0, parseFloat(item.cost) || 0);
        return product ? {
          productId: product.id,
          productName: product.name,
          quantity,
          cost,
          total: quantity * cost
        } : null;
      })
      .filter((item): item is PurchaseItem => Boolean(item));
  }, [companyProducts, formItems]);

  const total = purchaseItems.reduce((sum, item) => sum + item.total, 0);

  React.useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'purchases')), (snapshot) => {
      const data = snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as Purchase[];
      setPurchases(data.sort((a, b) => {
        const dateA = a.date?.seconds ? a.date.seconds * 1000 : new Date(a.date || a.createdAt || 0).getTime();
        const dateB = b.date?.seconds ? b.date.seconds * 1000 : new Date(b.date || b.createdAt || 0).getTime();
        return dateB - dateA;
      }));
      setFirebaseError('');
    }, (error) => {
      console.error('Firestore purchases subscription failed', error);
      setFirebaseError(`No se pudo leer compras desde Firebase: ${error.message}`);
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({
      lot: '',
      date: new Date().toISOString().slice(0, 10),
      supplier: '',
      notes: ''
    });
    setFormItems([]);
    setEditingId(null);
    setIsProductPickerOpen(false);
    setIsFormOpen(false);
  };

  const openCreate = () => {
    const nextLot = `LOT-${String(purchases.length + 1).padStart(3, '0')}`;
    setFormData({
      lot: nextLot,
      date: new Date().toISOString().slice(0, 10),
      supplier: '',
      notes: ''
    });
    setFormItems([]);
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEdit = (purchase: Purchase) => {
    const items = getPurchaseItems(purchase);
    setFormData({
      lot: purchase.lot,
      date: getDateInputValue(purchase.date),
      supplier: purchase.supplier || '',
      notes: purchase.notes || ''
    });
    setFormItems(items.map(item => ({
      productId: item.productId,
      quantity: item.quantity.toString(),
      cost: item.cost.toString()
    })));
    setEditingId(purchase.id);
    setIsFormOpen(true);
  };

  const updateItem = (index: number, patch: Partial<PurchaseFormItem>) => {
    setFormItems(prev => prev.map((item, idx) => idx === index ? { ...item, ...patch } : item));
  };

  const selectProduct = (product: Product) => {
    setFormItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === product.id);
      if (existingIndex !== -1) {
        return prev.map((item, index) => index === existingIndex ? {
          ...item,
          quantity: (Math.max(1, parseInt(item.quantity, 10) || 1) + 1).toString()
        } : item);
      }

      return [...prev, {
        productId: product.id,
        quantity: '1',
        cost: product.costPrice?.toString() || ''
      }];
    });
    setIsProductPickerOpen(false);
    setPickerSearch('');
  };

  const removeItem = (index: number) => {
    setFormItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const applyCloudStockChanges = async (previousItems: PurchaseItem[], nextItems: PurchaseItem[]) => {
    const batch = writeBatch(db);
    const previousQty = getQuantityByProduct(previousItems);
    const nextQty = getQuantityByProduct(nextItems);
    const productIds = Array.from(new Set([...Object.keys(previousQty), ...Object.keys(nextQty)]));

    for (const productId of productIds) {
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) continue;

      const delta = (nextQty[productId] || 0) - (previousQty[productId] || 0);
      const latestItem = [...nextItems].reverse().find(item => item.productId === productId);
      const updateData: Record<string, number> = {
        stock: Math.max(0, (productSnap.data().stock || 0) + delta)
      };
      if (latestItem) {
        updateData.costPrice = latestItem.cost;
      }
      batch.update(productRef, updateData);
    }

    await batch.commit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseItems.length === 0) {
      alert('Agrega al menos un producto a la compra');
      return;
    }
    if (purchaseItems.some(item => item.quantity <= 0 || item.cost <= 0)) {
      alert('Cada producto debe tener cantidad y costo mayores a cero');
      return;
    }

    setIsSaving(true);
    const previousPurchase = editingId ? purchases.find(purchase => purchase.id === editingId) : null;
    const previousItems = previousPurchase ? getPurchaseItems(previousPurchase) : [];
    const purchaseData = withoutUndefined({
      lot: formData.lot.trim(),
      date: formData.date,
      items: purchaseItems,
      total,
      supplier: formData.supplier.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      companyId: targetCompanyId
    });

    try {
      setFirebaseError('');
      const purchaseRef = editingId ? doc(db, 'purchases', editingId) : doc(collection(db, 'purchases'));
      await setDoc(purchaseRef, {
        id: purchaseRef.id,
        ...purchaseData,
        createdAt: previousPurchase?.createdAt || serverTimestamp()
      }, { merge: true });

      try {
        await applyCloudStockChanges(previousItems, purchaseItems);
        alert('Compra guardada exitosamente');
      } catch (stockError) {
        console.warn('Purchase saved, but stock update failed', stockError);
        alert('Compra guardada en la base. No se pudo actualizar el stock por permisos de inventario.');
      }

      resetForm();
    } catch (error: any) {
      console.error('Purchase save failed in Firebase', error);
      const message = error?.message || String(error);
      setFirebaseError(`No se pudo guardar la compra en Firebase: ${message}`);
      alert(`No se pudo guardar la compra en Firebase: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (purchase: Purchase) => {
    if (!confirm('Eliminar esta compra? Se descontaran sus cantidades del inventario.')) return;
    const items = getPurchaseItems(purchase);
    try {
      setFirebaseError('');
      const batch = writeBatch(db);
      batch.delete(doc(db, 'purchases', purchase.id));
      await batch.commit();

      try {
        await applyCloudStockChanges(items, []);
      } catch (stockError) {
        console.warn('Purchase deleted, but stock restore failed', stockError);
        alert('Compra eliminada. No se pudo descontar el stock por permisos de inventario.');
      }
    } catch (error: any) {
      console.error('Purchase delete failed in Firebase', error);
      const message = error?.message || String(error);
      setFirebaseError(`No se pudo eliminar la compra en Firebase: ${message}`);
      alert(`No se pudo eliminar la compra en Firebase: ${message}`);
    }
  };

  const filteredPurchases = purchases
    .filter(matchesActiveCompany)
    .filter(purchase => {
      const items = getPurchaseItems(purchase);
      const matchesSearch = purchase.lot.toLowerCase().includes(searchTerm.toLowerCase()) ||
        items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (purchase.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProduct = productFilter === 'todos' || items.some(item => item.productId === productFilter);
      return matchesSearch && matchesProduct;
    });

  const availableSummaryYears = React.useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    purchases.filter(matchesActiveCompany).forEach(purchase => {
      const date = typeof purchase.date === 'string'
        ? new Date(purchase.date)
        : purchase.date?.seconds
          ? new Date(purchase.date.seconds * 1000)
          : new Date(purchase.date || purchase.createdAt);
      if (!Number.isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [matchesActiveCompany, purchases]);

  const summaryPurchases = filteredPurchases.filter(purchase => {
    const date = typeof purchase.date === 'string'
      ? new Date(purchase.date)
      : purchase.date?.seconds
        ? new Date(purchase.date.seconds * 1000)
        : new Date(purchase.date || purchase.createdAt);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === summaryYear;
  });

  const totalInvested = summaryPurchases.reduce((sum, purchase) => sum + (purchase.total || 0), 0);
  const totalUnits = summaryPurchases.reduce((sum, purchase) => {
    return sum + getPurchaseItems(purchase).reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1 sm:px-0">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900">Compras</h2>
          <p className="text-stone-500 text-xs sm:text-sm">Registra pedidos a proveedores y entradas de stock.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center space-x-2 bg-primary text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold shadow-sm active:scale-95 transition-all w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          <span>Nueva Compra</span>
        </button>
      </div>

      {firebaseError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-xs font-semibold">
          {firebaseError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm space-y-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-primary transition-colors" size={16} />
              <input
                type="text"
                placeholder="Lote, producto o proveedor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border-stone-100 rounded-xl bg-stone-50 text-xs focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Producto</label>
              <select
                value={productFilter}
                onChange={e => setProductFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-100 text-xs font-semibold text-stone-700 outline-none"
              >
                <option value="todos">Todos los productos</option>
                {companyProducts.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-stone-900 text-white p-5 rounded-2xl sm:rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Resumen</span>
              <ClipboardList size={18} className="text-white/70" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-white/45 font-bold">Año</label>
              <select
                value={summaryYear}
                onChange={e => setSummaryYear(Number(e.target.value))}
                className="w-full bg-white/10 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-white/20"
              >
                {availableSummaryYears.map(year => (
                  <option key={year} value={year} className="text-stone-900">{year}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/45 font-bold">Invertido</p>
              <p className="text-2xl font-bold font-mono">${totalInvested.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/45 font-bold">Unidades</p>
              <p className="text-lg font-bold">{totalUnits} u.</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/45 font-bold">Compras</p>
              <p className="text-lg font-bold">{summaryPurchases.length}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest">Lote</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest">Productos</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Fecha</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest">Total</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Ops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredPurchases.map(purchase => {
                    const items = getPurchaseItems(purchase);
                    return (
                      <tr key={purchase.id} className="hover:bg-stone-50/50 transition-colors group">
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <p className="font-mono text-xs font-bold text-stone-900">{purchase.lot}</p>
                          <p className="sm:hidden text-[10px] text-stone-400">{formatDate(purchase.date)}</p>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <p className="text-xs sm:text-sm font-bold text-stone-900 truncate max-w-[170px] sm:max-w-none">
                            {items.length === 1 ? items[0].productName : `${items.length} productos`}
                          </p>
                          <p className="text-[10px] text-stone-400">
                            {items.reduce((sum, item) => sum + item.quantity, 0)} u.
                            {items.length === 1 ? ` x $${items[0].cost.toFixed(2)}` : ''}
                          </p>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 text-sm text-stone-500">{formatDate(purchase.date)}</td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm font-bold text-stone-900">${purchase.total.toFixed(2)}</td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-right">
                          <div className="flex justify-end gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(purchase)} className="p-1.5 sm:p-2 hover:bg-white rounded-lg text-stone-400 hover:text-primary transition-all" title="Editar compra">
                              <Edit2 size={14} className="sm:w-4 sm:h-4" />
                            </button>
                            <button onClick={() => handleDelete(purchase)} className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition-all" title="Eliminar compra">
                              <Trash2 size={14} className="sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredPurchases.length === 0 && (
              <div className="text-center py-12 sm:py-20 text-stone-400 bg-stone-50/30 px-4">
                <PackagePlus size={36} className="mx-auto mb-4 opacity-15" />
                <p className="text-xs sm:text-sm">No hay compras registradas.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.form
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onSubmit={handleSubmit}
              className="bg-white w-full max-w-4xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 sm:p-8 pb-[calc(env(safe-area-inset-bottom)+24px)] sm:pb-8"
            >
              <div className="flex justify-between items-start mb-6 sm:mb-8">
                <div>
                  <h3 className="text-lg sm:text-2xl font-serif font-bold text-stone-900">{editingId ? 'Editar Compra' : 'Nueva Compra'}</h3>
                  <p className="text-stone-500 text-[11px] sm:text-sm">Selecciona productos desde el grid y completa cantidades/costos.</p>
                </div>
                <button onClick={resetForm} type="button" className="p-2 hover:bg-stone-50 rounded-full transition-colors active:bg-stone-100">
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Lote</label>
                  <input required value={formData.lot} onChange={e => setFormData({ ...formData, lot: e.target.value })} className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-mono text-xs sm:text-sm outline-none" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                    <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full pl-9 pr-3 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-xs sm:text-sm outline-none" />
                  </div>
                </div>

                <div className="col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Productos Seleccionados</label>
                    <button type="button" onClick={() => setIsProductPickerOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-[10px] font-bold hover:bg-primary transition-colors">
                      <Plus size={13} />
                      Agregar Producto
                    </button>
                  </div>

                  <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-stone-50 border-b border-stone-100">
                          <tr>
                            <th className="px-3 py-2 text-[9px] font-bold text-stone-400 uppercase tracking-widest">Producto</th>
                            <th className="px-3 py-2 text-[9px] font-bold text-stone-400 uppercase tracking-widest w-28">Cantidad</th>
                            <th className="px-3 py-2 text-[9px] font-bold text-stone-400 uppercase tracking-widest w-32">Costo</th>
                            <th className="px-3 py-2 text-[9px] font-bold text-stone-400 uppercase tracking-widest w-28">Total</th>
                            <th className="px-3 py-2 w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {formItems.map((item, index) => {
                            const lineProduct = companyProducts.find(product => product.id === item.productId);
                            const lineQty = Math.max(0, parseInt(item.quantity, 10) || 0);
                            const lineCost = Math.max(0, parseFloat(item.cost) || 0);
                            return (
                              <tr key={item.productId} className="align-middle">
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-3 min-w-[220px]">
                                    <img src={lineProduct?.image} alt="" className="h-10 w-10 rounded-lg object-cover bg-stone-100" referrerPolicy="no-referrer" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-stone-900 truncate">{lineProduct?.name || 'Producto'}</p>
                                      <p className="text-[10px] text-stone-400">
                                        Stock: <span className="font-bold text-stone-600">{lineProduct?.stock ?? 0} u.</span>
                                        {lineProduct?.sku ? ` · ${lineProduct.sku}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <input type="number" min="1" required value={item.quantity} onChange={e => updateItem(index, { quantity: e.target.value })} className="w-24 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100 focus:ring-2 focus:ring-primary/20 transition-all text-xs outline-none" />
                                </td>
                                <td className="px-3 py-3">
                                  <input type="number" min="0.01" step="0.01" required value={item.cost} onChange={e => updateItem(index, { cost: e.target.value })} className="w-28 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100 focus:ring-2 focus:ring-primary/20 transition-all text-xs outline-none" />
                                </td>
                                <td className="px-3 py-3 text-xs font-mono font-bold text-stone-900">${(lineQty * lineCost).toFixed(2)}</td>
                                <td className="px-3 py-3 text-right">
                                  <button type="button" onClick={() => removeItem(index)} className="h-8 w-8 grid place-items-center rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50" title="Quitar producto">
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {formItems.length === 0 && (
                      <div className="text-center py-10 text-stone-400 bg-stone-50/40">
                        <PackagePlus size={28} className="mx-auto mb-3 opacity-20" />
                        <p className="text-xs">Agrega productos desde el grid.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-2 bg-stone-50 border border-stone-100 rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total de Compra</span>
                  <span className="text-xl font-mono font-bold text-stone-900">${total.toFixed(2)}</span>
                </div>
                <div className="col-span-2 space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Proveedor</label>
                  <input value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} placeholder="Nombre del proveedor" className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none" />
                </div>
                <div className="col-span-2 space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Notas</label>
                  <textarea rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none resize-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-6 sm:pt-8">
                <button type="button" onClick={resetForm} className="flex-1 py-3 sm:py-4 px-4 rounded-xl sm:rounded-2xl font-bold text-stone-500 hover:bg-stone-50 transition-colors text-xs sm:text-base">
                  Descartar
                </button>
                <button type="submit" disabled={isSaving} className="flex-[2] py-3 sm:py-4 px-4 bg-stone-900 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-primary transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-base">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {isSaving ? 'Guardando...' : (editingId ? 'Actualizar Compra' : 'Guardar Compra')}
                </button>
              </div>
            </motion.form>

            <AnimatePresence>
              {isProductPickerOpen && (
                <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 18 }}
                    className="bg-white w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col"
                  >
                    <div className="p-5 sm:p-6 border-b border-stone-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-lg font-serif font-bold text-stone-900">Seleccionar producto</h4>
                        <p className="text-[11px] text-stone-500">Filtra, revisa los datos y agrega el producto a la compra.</p>
                      </div>
                      <button type="button" onClick={() => setIsProductPickerOpen(false)} className="absolute right-4 top-4 sm:static p-2 hover:bg-stone-50 rounded-full">
                        <X size={19} />
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 border-b border-stone-100 grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3">
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-primary transition-colors" size={16} />
                        <input
                          type="text"
                          placeholder="Buscar por nombre, SKU o categoria..."
                          value={pickerSearch}
                          onChange={e => setPickerSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white outline-none"
                        />
                      </div>
                      <select
                        value={pickerCategory}
                        onChange={e => setPickerCategory(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs font-semibold text-stone-700 outline-none"
                      >
                        <option value="todos">Todas las categorias</option>
                        {pickerCategories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pickerProducts.map(product => {
                          const alreadySelected = formItems.some(item => item.productId === product.id);
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => selectProduct(product)}
                              className={`text-left bg-white border rounded-2xl p-3 transition-all hover:shadow-sm active:scale-[0.99] ${
                                alreadySelected ? 'border-primary/40 ring-2 ring-primary/10' : 'border-stone-100 hover:border-stone-200'
                              }`}
                            >
                              <div className="flex gap-3">
                                <img src={product.image} alt="" className="h-16 w-16 rounded-xl object-cover bg-stone-100 shrink-0" referrerPolicy="no-referrer" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-stone-900 line-clamp-2">{product.name}</p>
                                  <p className="mt-1 text-[10px] text-stone-400 font-semibold">{product.category}</p>
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-50 border border-stone-100 text-stone-500 font-bold">Stock {product.stock}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-50 border border-stone-100 text-stone-500 font-bold">Costo ${(product.costPrice || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center justify-between border-t border-stone-50 pt-2">
                                <span className="text-[10px] text-stone-400 font-mono">{product.sku || 'Sin SKU'}</span>
                                <span className={`text-[10px] font-bold ${alreadySelected ? 'text-primary' : 'text-stone-900'}`}>
                                  {alreadySelected ? 'Sumar otra unidad' : 'Agregar'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {pickerProducts.length === 0 && (
                        <div className="text-center py-14 text-stone-400">
                          <PackagePlus size={32} className="mx-auto mb-3 opacity-20" />
                          <p className="text-xs">No hay productos que coincidan.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
