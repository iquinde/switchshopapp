import React from 'react';
import { 
  Users, Search, Plus, Phone, Mail, MapPin, DollarSign, Edit2, 
  Trash2, X, Check, Save, UserPlus, CreditCard, ExternalLink, GitMerge
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, onSnapshot, doc, updateDoc, 
  addDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, where
} from 'firebase/firestore';
import { Customer } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { getOfflineFallbackActive, offlineDb, setOfflineFallbackActive, OFFLINE_CHANGE_EVENT } from '../lib/offlineDb';
import { findLogisticsLocation, logisticsLocations } from '../data/ciudades';

interface CustomersManagerProps {
  companyId?: string; // Active companyId ('comp-default', 'comp-1', 'comp-2', etc.)
  defaultTab?: 'approved' | 'requests';
  initialSearch?: string;
  onClearSearch?: () => void;
  prefillCustomer?: { name: string; phone: string; address?: string } | null;
  onClearPrefill?: () => void;
}

export default function CustomersManager({ 
  companyId = 'comp-default',
  defaultTab = 'approved',
  initialSearch = '',
  onClearSearch,
  prefillCustomer = null,
  onClearPrefill
}: CustomersManagerProps) {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = React.useState(initialSearch);
  const [activeTab, setActiveTab] = React.useState<'approved' | 'requests'>(defaultTab);

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  React.useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  React.useEffect(() => {
    if (prefillCustomer) {
      setCurrentCustomer(null);
      setName(prefillCustomer.name);
      setEmail('');
      setPhone(prefillCustomer.phone);
      setCedula('');
      setAddress(prefillCustomer.address || '');
      setLogisticsLocationId('');
      setCitySearch('');
      setIsCityPickerOpen(false);
      setCreditLimit('500');
      setIsEditing(true);
      if (onClearPrefill) {
        onClearPrefill();
      }
    }
  }, [prefillCustomer, onClearPrefill]);
  
  // Create / Edit modal state
  const [isEditing, setIsEditing] = React.useState(false);
  const [currentCustomer, setCurrentCustomer] = React.useState<Customer | null>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [cedula, setCedula] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [logisticsLocationId, setLogisticsLocationId] = React.useState('');
  const [citySearch, setCitySearch] = React.useState('');
  const [isCityPickerOpen, setIsCityPickerOpen] = React.useState(false);
  const [creditLimit, setCreditLimit] = React.useState('500');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Single customer overview ledger
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [mergeSourceCustomer, setMergeSourceCustomer] = React.useState<Customer | null>(null);
  const [mergeTargetId, setMergeTargetId] = React.useState('');
  const [mergeSearch, setMergeSearch] = React.useState('');

  React.useEffect(() => {
    if (getOfflineFallbackActive()) {
      setCustomers(offlineDb.getCustomers());
      return;
    }
    const customersQuery = companyId && companyId !== 'all' && companyId !== 'comp-default'
      ? query(collection(db, 'customers'), where('companyId', '==', companyId))
      : query(collection(db, 'customers'));
    const unsubscribe = onSnapshot(customersQuery, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customersData);
    }, (error) => {
      console.warn("Firestore customers stream failed, using offline fallback", error);
      setOfflineFallbackActive(true);
      setCustomers(offlineDb.getCustomers());
    });
    return () => unsubscribe();
  }, [companyId]);

  React.useEffect(() => {
    const handleSync = () => {
      if (getOfflineFallbackActive()) {
        setCustomers(offlineDb.getCustomers());
      }
    };
    window.addEventListener(OFFLINE_CHANGE_EVENT, handleSync);
    return () => window.removeEventListener(OFFLINE_CHANGE_EVENT, handleSync);
  }, []);

  const filteredCityOptions = React.useMemo(() => {
    const term = citySearch.trim().toLowerCase();
    return logisticsLocations
      .filter(location => !term || location.label.toLowerCase().includes(term))
      .slice(0, 40);
  }, [citySearch]);

  const handleOpenAdd = () => {
    setCurrentCustomer(null);
    setName('');
    setEmail('');
    setPhone('');
    setCedula('');
    setAddress('');
    setLogisticsLocationId('');
    setCitySearch('');
    setIsCityPickerOpen(false);
    setCreditLimit('500');
    setIsEditing(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setCurrentCustomer(customer);
    setName(customer.name);
    setEmail(customer.email || '');
    setPhone(customer.phone || '');
    setCedula(customer.cedula || '');
    setAddress(customer.address || '');
    setLogisticsLocationId(customer.logisticsLocationId || '');
    const selectedLocation = customer.logisticsLocationId ? findLogisticsLocation(customer.logisticsLocationId) : null;
    setCitySearch(selectedLocation?.label || (customer.province && customer.city ? `${customer.province} / ${customer.city}` : customer.city || ''));
    setIsCityPickerOpen(false);
    setCreditLimit(customer.creditLimit?.toString() || '0');
    setIsEditing(true);
  };

  const saveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const parsedCreditLimit = parseFloat(creditLimit) || 0;
    const normalizedCitySearch = citySearch.trim().toLowerCase();
    const selectedLocation = findLogisticsLocation(logisticsLocationId) || logisticsLocations.find(location =>
      location.label.toLowerCase() === normalizedCitySearch ||
      location.canton.toLowerCase() === normalizedCitySearch
    );
    const locationPayload = {
      logisticsLocationId: selectedLocation?.id || undefined,
      city: selectedLocation?.canton || undefined,
      province: selectedLocation?.province || undefined,
    };

    if (getOfflineFallbackActive()) {
      try {
        if (currentCustomer) {
          const updateData: any = {
            id: currentCustomer.id,
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            cedula: cedula.trim() || undefined,
            address: address.trim() || undefined,
            ...locationPayload,
            creditLimit: parsedCreditLimit
          };
          if (currentCustomer.status === 'pending') {
            updateData.status = 'active';
          }
          offlineDb.saveCustomer(updateData);
          alert('Cliente actualizado/aprobado exitosamente (Modo Local)');
        } else {
          offlineDb.saveCustomer({
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            cedula: cedula.trim() || undefined,
            address: address.trim() || undefined,
            ...locationPayload,
            creditLimit: parsedCreditLimit,
            currentDebt: 0,
            totalSpent: 0,
            status: 'active'
          });
          alert('Cliente registrado exitosamente (Modo Local)');
        }
        setIsEditing(false);
      } catch (err) {
        alert('Error al guardar localmente');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      if (currentCustomer) {
        // Update
        const customerRef = doc(db, 'customers', currentCustomer.id);
        const updateData: any = {
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          cedula: cedula.trim() || null,
          address: address.trim() || null,
          logisticsLocationId: selectedLocation?.id || null,
          city: selectedLocation?.canton || null,
          province: selectedLocation?.province || null,
          creditLimit: parsedCreditLimit
        };
        if (currentCustomer.status === 'pending') {
          updateData.status = 'active';
        }
        await updateDoc(customerRef, updateData);
        alert(currentCustomer.status === 'pending' ? 'Cliente aprobado y registrado exitosamente' : 'Cliente registrado exitosamente');
      } else {
        // Create
        const targetCompanyId = companyId === 'all' ? 'comp-default' : companyId;
        await addDoc(collection(db, 'customers'), {
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          cedula: cedula.trim() || null,
          address: address.trim() || null,
          logisticsLocationId: selectedLocation?.id || null,
          city: selectedLocation?.canton || null,
          province: selectedLocation?.province || null,
          creditLimit: parsedCreditLimit,
          currentDebt: 0,
          totalSpent: 0,
          status: 'active',
          companyId: targetCompanyId,
          createdAt: serverTimestamp()
        });
        alert('Cliente registrado y aprobado exitosamente');
      }
      setIsEditing(false);
    } catch (error) {
      console.warn("Error sending customer write to cloud, switching to local DB:", error);
      setOfflineFallbackActive(true);
      // Fallback
      if (currentCustomer) {
        const updateData: any = {
          id: currentCustomer.id,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          cedula: cedula.trim() || undefined,
          address: address.trim() || undefined,
          ...locationPayload,
          creditLimit: parsedCreditLimit
        };
        if (currentCustomer.status === 'pending') {
          updateData.status = 'active';
        }
        offlineDb.saveCustomer(updateData);
        alert('Cliente actualizado y aprobado exitosamente (Modo Local)');
      } else {
        const targetCompanyId = companyId === 'all' ? 'comp-default' : companyId;
        offlineDb.saveCustomer({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          cedula: cedula.trim() || undefined,
          address: address.trim() || undefined,
          ...locationPayload,
          creditLimit: parsedCreditLimit,
          currentDebt: 0,
          totalSpent: 0,
          status: 'active',
          companyId: targetCompanyId
        });
          alert('Cliente registrado exitosamente (Modo Local)');
        }
        setIsEditing(false);
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro que deseas eliminar el cliente "${name}"?`)) return;
    if (getOfflineFallbackActive()) {
      offlineDb.deleteCustomer(id);
      alert('Cliente eliminado (Modo Local)');
      return;
    }
    try {
      await deleteDoc(doc(db, 'customers', id));
      alert('Cliente eliminado');
    } catch (error) {
      console.warn("Delete customer failed in cloud, performing local delete:", error);
      setOfflineFallbackActive(true);
      offlineDb.deleteCustomer(id);
      alert('Cliente eliminado (Modo Local)');
    }
  };

  const handleApproveCustomer = async (id: string) => {
    if (getOfflineFallbackActive()) {
      alert('La aprobación de clientes requiere conexión a internet.');
      return;
    }
    try {
      const customerRef = doc(db, 'customers', id);
      await updateDoc(customerRef, {
        status: 'active'
      });
      alert('Cliente aprobado exitosamente');
    } catch (error) {
      alert('Error al aprobar cliente: ' + error);
    }
  };

  const companyCustomers = customers.filter(c => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !c.companyId || c.companyId === 'comp-default';
    return c.companyId === companyId;
  });

  const approvedCustomers = companyCustomers.filter(c => c.status !== 'pending');
  const pendingCustomers = companyCustomers.filter(c => c.status === 'pending');

  const mergeCandidates = React.useMemo(() => {
    if (!mergeSourceCustomer) return [];
    const term = mergeSearch.trim().toLowerCase();

    return approvedCustomers
      .filter(customer => customer.id !== mergeSourceCustomer.id)
      .filter(customer => {
        const hasDirectMatch =
          Boolean(mergeSourceCustomer.cedula && customer.cedula === mergeSourceCustomer.cedula) ||
          Boolean(mergeSourceCustomer.phone && customer.phone === mergeSourceCustomer.phone) ||
          Boolean(mergeSourceCustomer.email && customer.email?.toLowerCase() === mergeSourceCustomer.email.toLowerCase());

        if (!term) return hasDirectMatch || approvedCustomers.length <= 8;

        return customer.name.toLowerCase().includes(term) ||
          (customer.phone || '').toLowerCase().includes(term) ||
          (customer.cedula || '').toLowerCase().includes(term) ||
          (customer.email || '').toLowerCase().includes(term);
      })
      .slice(0, 10);
  }, [approvedCustomers, mergeSearch, mergeSourceCustomer]);

  const openMergeCustomer = (customer: Customer) => {
    setMergeSourceCustomer(customer);
    setMergeTargetId('');
    setMergeSearch(customer.cedula || customer.phone || customer.email || customer.name || '');
  };

  const handleMergeCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mergeSourceCustomer || !mergeTargetId) return;

    const targetCustomer = companyCustomers.find(customer => customer.id === mergeTargetId);
    if (!targetCustomer) {
      alert('Selecciona un cliente existente para fusionar.');
      return;
    }

    if (!confirm(`Fusionar la solicitud de "${mergeSourceCustomer.name}" con "${targetCustomer.name}"?`)) return;

    if (getOfflineFallbackActive()) {
      alert('La fusión de clientes requiere conexión a internet.');
      return;
    }

    try {
      const batch = writeBatch(db);
      const targetRef = doc(db, 'customers', targetCustomer.id);
      const sourceRef = doc(db, 'customers', mergeSourceCustomer.id);
      const targetCompanyId = targetCustomer.companyId || mergeSourceCustomer.companyId || companyId;

      const targetUpdate: any = {
        status: 'active',
        totalSpent: (targetCustomer.totalSpent || 0) + (mergeSourceCustomer.totalSpent || 0),
        currentDebt: (targetCustomer.currentDebt || 0) + (mergeSourceCustomer.currentDebt || 0),
      };

      if (mergeSourceCustomer.authUid) targetUpdate.authUid = mergeSourceCustomer.authUid;
      if (!targetCustomer.email && mergeSourceCustomer.email) targetUpdate.email = mergeSourceCustomer.email;
      if (!targetCustomer.phone && mergeSourceCustomer.phone) targetUpdate.phone = mergeSourceCustomer.phone;
      if (!targetCustomer.cedula && mergeSourceCustomer.cedula) targetUpdate.cedula = mergeSourceCustomer.cedula;
      if (!targetCustomer.address && mergeSourceCustomer.address) targetUpdate.address = mergeSourceCustomer.address;
      if (!targetCustomer.logisticsLocationId && mergeSourceCustomer.logisticsLocationId) targetUpdate.logisticsLocationId = mergeSourceCustomer.logisticsLocationId;
      if (!targetCustomer.city && mergeSourceCustomer.city) targetUpdate.city = mergeSourceCustomer.city;
      if (!targetCustomer.province && mergeSourceCustomer.province) targetUpdate.province = mergeSourceCustomer.province;
      if (!targetCustomer.companyId && targetCompanyId) targetUpdate.companyId = targetCompanyId;
      if (mergeSourceCustomer.lastPurchase) targetUpdate.lastPurchase = mergeSourceCustomer.lastPurchase;

      batch.update(targetRef, targetUpdate);

      if (targetCompanyId) {
        const relatedOrdersQuery = query(
          collection(db, 'orders'),
          where('companyId', '==', targetCompanyId),
          where('customerId', '==', mergeSourceCustomer.id)
        );
        const relatedOrders = await getDocs(relatedOrdersQuery);
        relatedOrders.docs.forEach(orderDoc => {
          batch.update(doc(db, 'orders', orderDoc.id), {
            customerId: targetCustomer.id,
            customerName: targetCustomer.name,
            customerPhone: targetCustomer.phone || mergeSourceCustomer.phone || null,
            customerCedula: targetCustomer.cedula || mergeSourceCustomer.cedula || null,
          });
        });
      }

      batch.delete(sourceRef);
      await batch.commit();

      setMergeSourceCustomer(null);
      setMergeTargetId('');
      setMergeSearch('');
      alert('Cliente fusionado exitosamente.');
    } catch (error) {
      alert('Error al fusionar cliente: ' + error);
    }
  };

  const filteredCustomers = (activeTab === 'approved' ? approvedCustomers : pendingCustomers).filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone || '').includes(searchTerm) ||
    (c.cedula || '').includes(searchTerm) ||
    (c.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.province || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900 font-serif">Clientes</h2>
          <p className="text-stone-500 text-xs sm:text-sm">Registra y controla el límite de crédito de tus clientes.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 bg-stone-900 hover:bg-primary text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-sm font-bold shadow-sm active:scale-95 transition-all w-full sm:w-auto justify-center"
        >
          <UserPlus size={18} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Tab Selector for Active Clients vs Registration Requests */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'approved'
              ? 'border-stone-900 text-stone-900 font-extrabold'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          <span>🟢 Clientes Activos</span>
          <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {approvedCustomers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-stone-900 text-stone-900 font-extrabold'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          <span>⏳ Solicitudes de Registro</span>
          {pendingCustomers.length > 0 && (
            <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">
              {pendingCustomers.length}
            </span>
          )}
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
        <input 
          type="text" 
          placeholder="Buscar por nombre, teléfono o email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-stone-150 rounded-xl bg-white text-xs text-stone-700 outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Grid of customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => {
          const debt = customer.currentDebt || 0;
          const limit = customer.creditLimit || 0;
          const percentage = limit > 0 ? (debt / limit) * 100 : 0;
          const isPending = customer.status === 'pending';
          
          return (
            <div 
              key={customer.id}
              className={`bg-white p-5 rounded-2xl border ${isPending ? 'border-amber-200 bg-amber-50/5' : 'border-stone-100'} shadow-sm relative group overflow-hidden flex flex-col justify-between hover:border-stone-250 transition-all`}
            >
              <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-serif font-bold text-stone-900 text-base sm:text-lg">{customer.name}</h3>
                        {isPending && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            Por Aprobar
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-400 font-mono mt-0.5">ID: {customer.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="flex gap-1 opacity-65 group-hover:opacity-100 transition-opacity">
                      {!isPending && (
                        <button 
                          onClick={() => handleOpenEdit(customer)}
                          className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-500 hover:text-stone-950 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-500 transition-colors"
                        title={isPending ? "Rechazar Solicitud" : "Eliminar Cliente"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-stone-500 font-medium mb-3">
                    {customer.cedula ? (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] bg-stone-150 text-stone-700 px-1.5 py-0.5 rounded font-mono font-bold leading-none">CÉDULA:</span>
                        <span className="font-mono text-stone-900 font-bold">{customer.cedula}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg w-fit border border-amber-100 text-[10px] mb-1.5">
                        <span>⚠️ Sin Cédula Registrada</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-stone-400" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-stone-400" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.city && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-stone-400" />
                        <span className="truncate max-w-[200px]">{customer.province ? `${customer.province} / ${customer.city}` : customer.city}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-stone-400" />
                        <span className="truncate max-w-[200px]">{customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto">
                  {/* Credit Gauge or pending action banner */}
                  {!isPending ? (
                    <div className="pt-2 border-t border-stone-100 space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-stone-400 uppercase tracking-wider">Crédito Asignado</span>
                        <span className={debt > 0 ? 'text-red-500 font-bold' : 'text-stone-500'}>
                          Deuda: ${debt.toFixed(2)} / ${limit.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-550 ${
                            percentage >= 90 ? 'bg-red-550' : percentage >= 50 ? 'bg-orange-555' : 'bg-green-550'
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-stone-100 flex flex-col gap-2 bg-stone-50/50 p-2.5 rounded-xl">
                      <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Solicitud de Registro</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMergeCustomer(customer)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                        >
                          <GitMerge size={13} />
                          <span>Fusionar</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                        >
                          <Check size={13} />
                          <span>Aprobar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                          className="py-1.5 px-3 bg-stone-100 hover:bg-red-50 border border-stone-200 hover:border-red-200 text-stone-600 hover:text-red-600 font-bold rounded-lg text-xs transition-all active:scale-95 text-center"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Total business spent metrics */}
              {!isPending && (
                <div className="mt-4 pt-3 border-t border-stone-100 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-stone-400 font-bold block text-[9px] uppercase tracking-wider">Total Comprado</span>
                    <span className="font-bold text-stone-900">${(customer.totalSpent || 0).toFixed(2)}</span>
                  </div>
                  {debt > 0 && (
                    <span className="bg-red-550/10 text-red-600 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase animate-pulse">
                      Por Cobrar
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-20 bg-stone-50/20 rounded-3xl border border-stone-100">
          <Users size={36} className="mx-auto mb-4 opacity-20" />
          <p className="text-stone-400 font-serif">
            {activeTab === 'requests' 
              ? 'No hay solicitudes de registro pendientes.' 
              : 'Aún no tienes clientes guardados.'}
          </p>
        </div>
      )}

      {/* Edit Customer Dialog */}
      <AnimatePresence>
        {mergeSourceCustomer && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleMergeCustomer}
              className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-start border-b border-stone-100 pb-4">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1">
                    <GitMerge size={13} />
                    Fusionar cliente
                  </p>
                  <h3 className="font-serif font-bold text-stone-900 text-lg mt-1">
                    {mergeSourceCustomer.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Selecciona el cliente existente que conservara el historial y recibira el acceso digital.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMergeSourceCustomer(null)}
                  className="p-1 hover:bg-stone-50 rounded-full text-stone-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-900">
                <p className="font-bold">Solicitud pendiente</p>
                <p className="mt-1">
                  {mergeSourceCustomer.email || 'Sin email'} · {mergeSourceCustomer.phone || 'Sin telefono'} · {mergeSourceCustomer.city || 'Sin ciudad'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Buscar cliente existente</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                  <input
                    type="text"
                    value={mergeSearch}
                    onChange={e => setMergeSearch(e.target.value)}
                    placeholder="Nombre, cedula, telefono o email"
                    className="w-full pl-9 pr-3 py-2.5 border border-stone-150 rounded-xl bg-stone-50 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-stone-100 divide-y divide-stone-100">
                {mergeCandidates.map(candidate => (
                  <label
                    key={candidate.id}
                    className={`flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-stone-50 ${mergeTargetId === candidate.id ? 'bg-blue-50/60' : 'bg-white'}`}
                  >
                    <input
                      type="radio"
                      name="mergeTarget"
                      value={candidate.id}
                      checked={mergeTargetId === candidate.id}
                      onChange={() => setMergeTargetId(candidate.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-stone-900">{candidate.name}</span>
                      <span className="mt-0.5 block text-[11px] text-stone-500">
                        {candidate.cedula || 'Sin cedula'} · {candidate.phone || 'Sin telefono'} · {candidate.email || 'Sin email'}
                      </span>
                      {candidate.city && (
                        <span className="mt-0.5 block text-[10px] font-medium text-stone-400">
                          {candidate.province ? `${candidate.province} / ${candidate.city}` : candidate.city}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
                {mergeCandidates.length === 0 && (
                  <div className="p-5 text-center text-xs text-stone-400">
                    No hay clientes existentes que coincidan.
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMergeSourceCustomer(null)}
                  className="flex-1 py-2 text-stone-500 font-bold hover:bg-stone-50 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!mergeTargetId}
                  className="flex-[2] py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                >
                  <GitMerge size={14} />
                  Fusionar con seleccionado
                </button>
              </div>
            </motion.form>
          </div>
        )}

        {isEditing && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={saveCustomer}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <h3 className="font-serif font-bold text-stone-900 text-base sm:text-lg">
                  {currentCustomer ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                </h3>
                <button type="button" onClick={() => setIsEditing(false)} className="p-1 hover:bg-stone-50 rounded-full text-stone-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {currentCustomer?.status === 'pending' && (
                  <div className="bg-amber-50 border border-amber-200/65 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                    <p className="font-extrabold flex items-center gap-1">
                      <span>📌</span> Solicitud de Registro Pendiente
                    </p>
                    <p className="text-[10px] text-amber-700 leading-normal">
                      Ingresa el número de **Cédula / Identidad** como dato principal del cliente antes de otorgar la aprobación.
                    </p>
                  </div>
                )}

                <div className="space-y-1 bg-amber-50/20 p-2.5 rounded-xl border border-amber-100/60">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-extrabold uppercase bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded leading-none">
                      DATO PRINCIPAL 🔍
                    </span>
                    <span className="text-[10px] text-amber-700 font-medium">Requerido</span>
                  </div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Número de Cédula / RUC / ID</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 1712345678"
                    value={cedula}
                    onChange={e => setCedula(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-xl bg-white focus:bg-white text-xs outline-none focus:ring-2 focus:ring-amber-500/20 text-stone-900 font-extrabold placeholder:font-normal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-150 rounded-xl bg-stone-50 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Teléfono / Celular</label>
                    <input
                      type="text"
                      placeholder="Ej. +5939..."
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-150 rounded-xl bg-stone-50 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Email</label>
                    <input
                      type="email"
                      placeholder="Ej. juan@mail.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-150 rounded-xl bg-stone-50 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Ciudad</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                    {citySearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setCitySearch('');
                          setLogisticsLocationId('');
                          setIsCityPickerOpen(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-800 rounded-md"
                        title="Limpiar ciudad"
                      >
                        <X size={13} />
                      </button>
                    )}
                    <input
                      type="text"
                      value={citySearch}
                      onFocus={() => setIsCityPickerOpen(true)}
                      onChange={e => {
                        setCitySearch(e.target.value);
                        setLogisticsLocationId('');
                        setIsCityPickerOpen(true);
                      }}
                      placeholder="Escribe para buscar ciudad..."
                      className="w-full pl-8 pr-8 py-2 border border-stone-150 rounded-xl bg-stone-50 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-primary/20 text-stone-700 font-bold"
                    />
                  </div>
                  {isCityPickerOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-100 rounded-xl shadow-xl z-[160] overflow-hidden max-h-56 overflow-y-auto">
                      {filteredCityOptions.map(location => (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => {
                            setLogisticsLocationId(location.id);
                            setCitySearch(location.label);
                            setIsCityPickerOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-stone-50"
                        >
                          <span className="block text-xs font-bold text-stone-800">{location.canton}</span>
                          <span className="block text-[10px] text-stone-400">{location.province}</span>
                        </button>
                      ))}
                      {filteredCityOptions.length === 0 && (
                        <div className="px-3 py-3 text-xs text-stone-400 text-center">
                          No hay ciudades que coincidan.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Dirección</label>
                  <input
                    type="text"
                    placeholder="Calle Principal, N° de casa o local"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-150 rounded-xl bg-stone-50 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Límite de Crédito ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Monto máximo de asignación"
                    value={creditLimit}
                    onChange={e => setCreditLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-150 rounded-xl bg-stone-50 focus:bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 text-stone-500 font-bold hover:bg-stone-50 rounded-xl text-xs"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-2 bg-stone-900 hover:bg-primary text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                >
                  <Save size={14} />
                  {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
