import React from 'react';
import { Plus, Trash2, Edit2, X, Save, Image as ImageIcon, Search, Filter, ArrowUpDown, Loader2 } from 'lucide-react';
import { storage, ref, uploadBytes, getDownloadURL, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { getOfflineFallbackActive, offlineDb, setOfflineFallbackActive } from '../lib/offlineDb';

interface InventoryManagerProps {
  products: Product[];
  companyId?: string; // Active companyId ('comp-default', 'comp-1', 'comp-2', etc.)
}

const getProductCompanyId = (product: Product) => product.companyId || 'comp-default';

const getTargetCompanyId = (companyId?: string) => {
  return companyId === 'all' ? 'comp-default' : (companyId || 'comp-default');
};

const getNextSku = (products: Product[], companyId?: string) => {
  const targetCompanyId = getTargetCompanyId(companyId);
  const nextNumber = products
    .filter(product => getProductCompanyId(product) === targetCompanyId)
    .reduce((max, product) => {
      const match = (product.sku || '').trim().match(/^PRO-(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  return `PRO-${String(nextNumber).padStart(3, '0')}`;
};

export default function InventoryManager({ products, companyId = 'comp-default' }: InventoryManagerProps) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);
  const [existingImages, setExistingImages] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<'Todos' | 'Bajo Stock' | 'Inactivos'>('Todos');
  const [alertPercentage, setAlertPercentage] = React.useState(20);

  React.useEffect(() => {
    const loadSettings = () => {
      try {
        const s = offlineDb.getSettings();
        setAlertPercentage(s.stockAlertPercentage ?? 20);
      } catch (err) {
        console.warn('Failed to load settings in InventoryManager:', err);
      }
    };
    loadSettings();
    window.addEventListener('switchshop_offline_change', loadSettings);
    return () => window.removeEventListener('switchshop_offline_change', loadSettings);
  }, []);
  
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    stock: '0',
    minStock: '10',
    category: '',
    sku: '',
    status: 'active' as 'active' | 'inactive'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      costPrice: '',
      stock: '0',
      minStock: '10',
      category: '',
      sku: '',
      status: 'active'
    });
    setSelectedFiles([]);
    setPreviewUrls([]);
    setExistingImages([]);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      costPrice: '',
      stock: '0',
      minStock: '10',
      category: '',
      sku: getNextSku(products, companyId),
      status: 'active'
    });
    setSelectedFiles([]);
    setPreviewUrls([]);
    setExistingImages([]);
    setEditingId(null);
    setIsAdding(true);
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      costPrice: product.costPrice?.toString() || '',
      stock: product.stock.toString(),
      minStock: (product.minStock ?? 10).toString(),
      category: product.category,
      sku: product.sku || '',
      status: product.status || 'active'
    });
    const images = product.images || [product.image];
    setExistingImages(images);
    setPreviewUrls(images);
    setEditingId(product.id);
    setIsAdding(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const availableSlots = 3 - previewUrls.length;
      const filesToProcess = files.slice(0, availableSlots);
      setSelectedFiles(prev => [...prev, ...filesToProcess]);
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrls(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    const isExisting = index < existingImages.length;
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      const fileIndex = index - existingImages.length;
      setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'products';
    setIsUploading(true);
    
    const isOffline = getOfflineFallbackActive();
    const fallbackImage = previewUrls[0] || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600';
    
    // Choose which company this product goes to (defaults to active companyId, or previous value)
    const finalCompanyId = editingId 
      ? (products.find(p => p.id === editingId)?.companyId || getTargetCompanyId(companyId))
      : getTargetCompanyId(companyId);
    const finalSku = formData.sku.trim() || getNextSku(products, finalCompanyId);

    const localProductData = {
      id: editingId || undefined,
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price) || 0,
      costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
      stock: parseInt(formData.stock) || 0,
      minStock: parseInt(formData.minStock) || 0,
      category: formData.category,
      sku: finalSku,
      status: formData.status,
      image: fallbackImage,
      images: previewUrls.length > 0 ? previewUrls : [fallbackImage],
      companyId: finalCompanyId
    };

    if (isOffline) {
      try {
        offlineDb.saveProduct(localProductData);
        alert('Producto guardado exitosamente (Modo Local)');
        resetForm();
      } catch (err: any) {
        alert(err.message || 'Error al guardar localmente');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    try {
      const docRef = editingId ? doc(db, path, editingId) : doc(collection(db, path));
      const productId = docRef.id;
      const uploadedUrls: string[] = [...existingImages];

      if (storage) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const storageRef = ref(storage, `productos/${productId}/foto-${Date.now()}-${i}.jpg`);
          try {
            // Implement a 2.2-second timeout to prevent stalling when Storage is not enabled
            const uploadPromise = uploadBytes(storageRef, file);
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Firebase Storage timeout occurred')), 2200)
            );
            const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
            const url = await getDownloadURL(snapshot.ref);
            uploadedUrls.push(url);
          } catch (stgErr) {
            console.warn("Storage upload failed or timed out, falling back to local base64/placeholder:", stgErr);
            const fileIndex = i;
            if (previewUrls[existingImages.length + fileIndex]) {
              uploadedUrls.push(previewUrls[existingImages.length + fileIndex]);
            }
          }
        }
      } else {
        previewUrls.forEach(url => {
          if (!uploadedUrls.includes(url)) {
            uploadedUrls.push(url);
          }
        });
      }

      const finalProductData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        category: formData.category,
        sku: finalSku,
        status: formData.status,
        image: uploadedUrls[0] || fallbackImage,
        images: uploadedUrls.length > 0 ? uploadedUrls : [fallbackImage],
        companyId: finalCompanyId,
        createdAt: editingId ? (products.find(p => p.id === editingId)?.createdAt || serverTimestamp()) : serverTimestamp()
      };

      await setDoc(docRef, finalProductData, { merge: true });
      resetForm();
      alert('Producto guardado exitosamente');
    } catch (error: any) {
      console.warn("Firestore product save failed, switching to local DB fallback:", error);
      setOfflineFallbackActive(true);
      try {
        offlineDb.saveProduct(localProductData);
        alert('Producto guardado exitosamente (Modo Local Activo)');
        resetForm();
      } catch (err: any) {
        alert(err.message || 'Error al guardar localmente');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    if (getOfflineFallbackActive()) {
      offlineDb.deleteProduct(id);
      alert('Producto eliminado localmente');
      return;
    }
    try {
      await deleteDoc(doc(db, 'products', id));
      alert('Producto eliminado exitosamente');
    } catch (error) {
      console.warn("Delete product failed in cloud, performing local delete:", error);
      setOfflineFallbackActive(true);
      offlineDb.deleteProduct(id);
      alert('Producto eliminado localmente');
    }
  };

  // Filter products belonging to current company context first
  const companyProducts = products.filter(p => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !p.companyId || p.companyId === 'comp-default';
    return p.companyId === companyId;
  });

  const filteredProducts = companyProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeFilter === 'Bajo Stock') {
      const minVal = p.minStock ?? 10;
      const threshold = minVal * (1 + alertPercentage / 100);
      return p.stock <= threshold;
    }
    if (activeFilter === 'Inactivos') {
      return p.status === 'inactive';
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1 sm:px-0">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900">Inventario</h2>
          <p className="text-stone-500 text-xs sm:text-sm">Administra tus niveles de stock.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 bg-primary text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold shadow-sm active:scale-95 transition-all w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          <span>Nuevo Producto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Search and Filters */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm space-y-4 sm:space-y-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="SKU o nombre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border-stone-100 rounded-xl bg-stone-50 text-xs focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white"
              />
            </div>
            
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Filtros</h4>
              <div className="flex flex-wrap sm:flex-col gap-2">
                {(['Todos', 'Bajo Stock', 'Inactivos'] as const).map(f => (
                  <button 
                    key={f} 
                    onClick={() => setActiveFilter(f)}
                    className={`text-left py-1.5 px-3 rounded-lg text-xs transition-colors border ${
                      activeFilter === f 
                        ? 'bg-stone-900 text-white border-stone-900 font-bold' 
                        : 'text-stone-600 hover:bg-stone-50 border-transparent hover:border-stone-100'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest">Producto</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">SKU</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest">Precio</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest">Stock</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Ops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="px-4 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <img 
                            src={product.image} 
                            alt="" 
                            className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover bg-stone-100 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-stone-900 truncate">{product.name}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                product.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-500'
                              }`}>
                                {product.status === 'active' ? 'Activo' : 'Inactivo'}
                              </span>
                              <span className="sm:hidden text-[8px] text-stone-400 font-mono">{product.sku}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 text-sm text-stone-500 font-mono italic">
                        {product.sku || 'N/A'}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 text-[11px] sm:text-sm">
                        <div className="font-bold text-stone-900">${product.price.toFixed(2)}</div>
                        {product.costPrice && (
                          <div className="hidden sm:block text-[10px] text-stone-400">Costo: ${product.costPrice.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex flex-col">
                          {(() => {
                            const minVal = product.minStock ?? 10;
                            const isCritical = product.stock <= minVal;
                            const isLowStock = product.stock <= minVal * (1 + alertPercentage / 100);
                            
                            let textColorClass = 'text-stone-900';
                            let badge = null;
                            
                            if (isCritical) {
                              textColorClass = 'text-red-600 font-extrabold';
                              badge = (
                                <span className="inline-block mt-1 text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-200 w-max leading-none">
                                  Crítico &le; {minVal}
                                </span>
                              );
                            } else if (isLowStock) {
                              textColorClass = 'text-amber-650 font-extrabold';
                              badge = (
                                <span className="inline-block mt-1 text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold border border-amber-200 w-max leading-none">
                                  Bajo Stock ({alertPercentage}%)
                                </span>
                              );
                            } else {
                              badge = (
                                <span className="inline-block mt-1 text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-200 w-max leading-none">
                                  Normal
                                </span>
                              );
                            }
                            
                            return (
                              <>
                                <span className={`text-xs sm:text-sm font-bold ${textColorClass}`}>
                                  {product.stock} u.
                                </span>
                                <span className="text-[10px] text-stone-400">
                                  Mín: {minVal}
                                </span>
                                {badge}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 text-right">
                        <div className="flex justify-end gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(product)} 
                            className="p-1.5 sm:p-2 hover:bg-white rounded-lg text-stone-400 hover:text-primary transition-all"
                            title="Editar Producto"
                          >
                            <Edit2 size={14} className="sm:w-4 sm:h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)} 
                            className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition-all"
                            title="Eliminar Producto"
                          >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 sm:py-20 text-stone-400 bg-stone-50/30 px-4">
                <ImageIcon size={32} className="sm:w-12 sm:h-12 mx-auto mb-4 opacity-10" />
                <p className="text-xs sm:text-sm">No hay productos que coincidan.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.form 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onSubmit={handleSubmit}
              className="bg-white w-full max-w-2xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 sm:p-8 pb-[calc(env(safe-area-inset-bottom)+24px)] sm:pb-8"
            >
              <div className="flex justify-between items-start mb-6 sm:mb-8">
                <div>
                  <h3 className="text-lg sm:text-2xl font-serif font-bold text-stone-900">
                    {editingId ? 'Editar' : 'Nuevo Producto'}
                  </h3>
                  <p className="text-stone-500 text-[11px] sm:text-sm">Información del inventario.</p>
                </div>
                <button onClick={resetForm} type="button" className="p-2 hover:bg-stone-50 rounded-full transition-colors active:bg-stone-100">
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="col-span-2 space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Nombre</label>
                    <input 
                      required 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Categoría</label>
                    <input 
                      required
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      placeholder="Ej. café, pulseras..."
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">SKU</label>
                    <input 
                      value={formData.sku} 
                      onChange={e => setFormData({...formData, sku: e.target.value})}
                      placeholder="PRO-001"
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-mono text-xs sm:text-sm outline-none"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Descripción</label>
                    <textarea 
                      rows={3}
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Ej. Café premium de altura o Pulsera de ojo de tigre resistente..."
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Stock Disponible</label>
                    <input 
                      required type="number"
                      value={formData.stock} 
                      onChange={e => setFormData({...formData, stock: e.target.value})}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Stock Mínimo (Alerta)</label>
                    <input 
                      required type="number"
                      value={formData.minStock} 
                      onChange={e => setFormData({...formData, minStock: e.target.value})}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Venta ($)</label>
                    <input 
                      required type="number" step="0.01"
                      value={formData.price} 
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Costo ($)</label>
                    <input 
                      type="number" step="0.01"
                      value={formData.costPrice} 
                      onChange={e => setFormData({...formData, costPrice: e.target.value})}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-stone-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base outline-none"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Estado</label>
                    <div className="flex gap-2">
                      {['active', 'inactive'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({...formData, status: s as any})}
                          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                            formData.status === s 
                              ? 'bg-stone-900 text-white border-stone-900' 
                              : 'bg-stone-50 text-stone-400 border-stone-100 hover:bg-stone-100'
                          }`}
                        >
                          {s === 'active' ? 'Activo' : 'Inactivo'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Fotos (Máx 3)</label>
                  <div className="flex flex-wrap gap-3">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-lg sm:rounded-2xl overflow-hidden border border-stone-100 group">
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          type="button" 
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {previewUrls.length < 3 && (
                      <label className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg sm:rounded-2xl border-2 border-dashed border-stone-100 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors active:bg-stone-50">
                        <Plus size={16} className="text-stone-300" />
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-6 sm:pt-8">
                  {editingId && (
                    <button 
                      type="button" 
                      onClick={async () => {
                        await handleDelete(editingId);
                        resetForm();
                      }}
                      className="py-3 sm:py-4 px-3 rounded-xl sm:rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-colors text-xs sm:text-base flex items-center justify-center gap-1 border border-red-100"
                      title="Eliminar este producto permanentemente"
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="flex-1 py-3 sm:py-4 px-4 rounded-xl sm:rounded-2xl font-bold text-stone-500 hover:bg-stone-50 transition-colors text-xs sm:text-base"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploading}
                    className="flex-[2] py-3 sm:py-4 px-4 bg-stone-900 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-primary transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-base"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isUploading ? '...' : (editingId ? 'Actualizar' : 'Crear Producto')}
                  </button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
