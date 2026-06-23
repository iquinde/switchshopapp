import React from 'react';
import { Check, Edit2, MapPin, Plus, Save, Search, Trash2, Truck, X } from 'lucide-react';
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { LogisticsLocation, ShippingRate } from '../types';
import { logisticsLocations } from '../data/ciudades';
import { motion } from 'motion/react';

interface LogisticsManagerProps {
  companyId?: string;
}

const getTargetCompanyId = (companyId?: string) => companyId && companyId !== 'all' ? companyId : 'comp-default';

export default function LogisticsManager({ companyId = 'comp-default' }: LogisticsManagerProps) {
  const targetCompanyId = getTargetCompanyId(companyId);
  const [shippingRates, setShippingRates] = React.useState<ShippingRate[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [locationSearch, setLocationSearch] = React.useState('');
  const [selectedLocationId, setSelectedLocationId] = React.useState('');
  const [shippingCost, setShippingCost] = React.useState('');
  const [editingRateId, setEditingRateId] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    const ratesQuery = query(collection(db, 'shippingRates'), where('companyId', '==', targetCompanyId));
    const unsubscribe = onSnapshot(ratesQuery, (snapshot) => {
      const rates = snapshot.docs
        .map(rateDoc => ({ id: rateDoc.id, ...rateDoc.data() } as ShippingRate))
        .sort((a, b) => a.locationLabel.localeCompare(b.locationLabel));
      setShippingRates(rates);
    }, (error) => {
      console.warn('Error al cargar tarifas de envio:', error);
      setShippingRates([]);
    });

    return () => unsubscribe();
  }, [targetCompanyId]);

  const filteredLocations = React.useMemo(() => {
    const term = locationSearch.trim().toLowerCase();
    return logisticsLocations
      .filter(location => !term || location.label.toLowerCase().includes(term))
      .slice(0, 50);
  }, [locationSearch]);

  const filteredRates = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return shippingRates.filter(rate => !term || rate.locationLabel.toLowerCase().includes(term));
  }, [searchTerm, shippingRates]);

  const selectedLocation = React.useMemo(() => {
    return logisticsLocations.find(location => location.id === selectedLocationId) || null;
  }, [selectedLocationId]);

  const resetForm = () => {
    setLocationSearch('');
    setSelectedLocationId('');
    setShippingCost('');
    setEditingRateId(null);
    setIsEditing(false);
  };

  const openCreate = () => {
    resetForm();
    setIsEditing(true);
  };

  const openEdit = (rate: ShippingRate) => {
    setEditingRateId(rate.id);
    setSelectedLocationId(rate.locationId);
    setLocationSearch(rate.locationLabel);
    setShippingCost(rate.cost.toFixed(2));
    setIsEditing(true);
  };

  const handleSaveRate = async (event: React.FormEvent) => {
    event.preventDefault();
    const cost = parseFloat(shippingCost);

    if (!selectedLocation) {
      alert('Selecciona una ciudad o parroquia.');
      return;
    }

    if (!Number.isFinite(cost) || cost < 0) {
      alert('Ingresa un costo de envio valido.');
      return;
    }

    const rateId = editingRateId || `${targetCompanyId}_${selectedLocation.id}`;
    const payload: ShippingRate = {
      id: rateId,
      companyId: targetCompanyId,
      locationId: selectedLocation.id,
      locationLabel: selectedLocation.label,
      province: selectedLocation.province,
      canton: selectedLocation.canton,
      parish: selectedLocation.parish,
      cost,
      updatedAt: serverTimestamp(),
    };

    setIsSaving(true);
    try {
      await setDoc(doc(db, 'shippingRates', rateId), {
        ...payload,
        createdAt: shippingRates.find(rate => rate.id === rateId)?.createdAt || serverTimestamp(),
      }, { merge: true });
      alert('Costo de envio guardado');
      resetForm();
    } catch (error: any) {
      console.error('Error al guardar costo de envio:', error);
      alert('Error al guardar costo de envio: ' + (error?.message || String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRate = async (rate: ShippingRate) => {
    if (!confirm(`Eliminar el costo de envio para "${rate.locationLabel}"?`)) return;

    try {
      await deleteDoc(doc(db, 'shippingRates', rate.id));
      alert('Costo de envio eliminado');
    } catch (error: any) {
      console.error('Error al eliminar costo de envio:', error);
      alert('Error al eliminar costo de envio: ' + (error?.message || String(error)));
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900">Logistica</h2>
          <p className="text-stone-500 text-xs sm:text-sm">Configura provincias, ciudades y costos de envio para pedidos de venta.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center justify-center gap-2 bg-stone-900 hover:bg-primary text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-sm font-bold shadow-sm active:scale-95 transition-all"
          >
            <Plus size={18} />
            <span>Costo de Envio</span>
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
        <input
          type="text"
          placeholder="Buscar tarifa por ciudad..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-4 py-2.5 w-full bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all font-medium"
        />
      </div>

      <section className="bg-white border border-stone-100 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-stone-700" />
            <h3 className="font-serif font-bold text-lg text-stone-900">Tarifas configuradas</h3>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">{shippingRates.length} tarifas</span>
        </div>

        {filteredRates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredRates.map(rate => (
              <div key={rate.id} className="border border-stone-100 rounded-xl p-4 flex items-start justify-between gap-3 bg-stone-50/60">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-stone-900 truncate">{rate.canton}</p>
                  <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">{rate.province}</p>
                  <p className="mt-3 text-lg font-serif font-bold text-stone-950">${rate.cost.toFixed(2)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(rate)}
                    className="p-2 text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg transition-colors"
                    title="Editar tarifa"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRate(rate)}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar tarifa"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-4 py-10 text-center text-xs font-semibold text-stone-400">
            No hay costos de envio configurados.
          </div>
        )}
      </section>

      {isEditing && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {editingRateId ? 'Editar Costo de Envio' : 'Nuevo Costo de Envio'}
              </h3>
              <button onClick={resetForm} className="text-stone-400 hover:text-stone-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block">
                  Provincia / Ciudad <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-stone-400" size={15} />
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      setSelectedLocationId('');
                    }}
                    placeholder="Buscar por provincia o ciudad..."
                    className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-medium"
                  />
                </div>
                {!selectedLocationId && (
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-stone-100 bg-stone-50">
                    {filteredLocations.map(location => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => {
                          setSelectedLocationId(location.id);
                          setLocationSearch(location.label);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-stone-600 hover:bg-white border-b border-stone-100 last:border-b-0"
                      >
                        {location.label}
                      </button>
                    ))}
                  </div>
                )}
                {selectedLocation && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                    <Check size={14} />
                    <span className="truncate">{selectedLocation.label}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 block mb-1">
                  Costo de envio <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 font-bold"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-stone-900 text-white hover:bg-primary font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow disabled:opacity-70"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
