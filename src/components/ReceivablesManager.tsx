import React from 'react';
import { 
  DollarSign, Landmark, ArrowUpRight, ArrowDownRight, Clock, Search, 
  Plus, Check, Receipt, X, MapPin, User, ArrowRight, Save, History, Building2
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, onSnapshot, doc, updateDoc, addDoc, 
  orderBy, serverTimestamp, writeBatch, getDoc, where
} from 'firebase/firestore';
import { Customer, Order, PaymentTransaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { getOfflineFallbackActive, offlineDb, setOfflineFallbackActive, OFFLINE_CHANGE_EVENT } from '../lib/offlineDb';

interface ReceivablesManagerProps {
  companyId?: string; // Active companyId ('comp-default', 'comp-1', 'comp-2', etc.)
}

export default function ReceivablesManager({ companyId = 'comp-default' }: ReceivablesManagerProps) {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [transactions, setTransactions] = React.useState<PaymentTransaction[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // Registering transaction
  const [isRecording, setIsRecording] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState('');
  const [selectedOrderId, setSelectedOrderId] = React.useState('');
  const [payAmount, setPayAmount] = React.useState('');
  const [payMethod, setPayMethod] = React.useState<'transfer' | 'deposit' | 'cash'>('transfer');
  const [payBank, setPayBank] = React.useState('');
  const [payRef, setPayRef] = React.useState('');
  const [payNotes, setPayNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Active view tab inside Receivables
  const [activeSubTab, setActiveSubTab] = React.useState<'clients' | 'orders' | 'history'>('clients');

  const [isOfflineMode, setIsOfflineMode] = React.useState(getOfflineFallbackActive());

  React.useEffect(() => {
    const handleSync = () => {
      const isOff = getOfflineFallbackActive();
      setIsOfflineMode(isOff);
      if (isOff) {
        setCustomers(offlineDb.getCustomers());
        setOrders(offlineDb.getOrders());
        setTransactions(offlineDb.getTransactions());
      }
    };
    window.addEventListener(OFFLINE_CHANGE_EVENT, handleSync);
    if (getOfflineFallbackActive()) {
      setCustomers(offlineDb.getCustomers());
      setOrders(offlineDb.getOrders());
      setTransactions(offlineDb.getTransactions());
    }
    return () => window.removeEventListener(OFFLINE_CHANGE_EVENT, handleSync);
  }, []);

  // Listen to collections
  React.useEffect(() => {
    if (isOfflineMode) return;
    const customersQuery = companyId && companyId !== 'all' && companyId !== 'comp-default'
      ? query(collection(db, 'customers'), where('companyId', '==', companyId))
      : query(collection(db, 'customers'));
    const ordersQuery = companyId && companyId !== 'all' && companyId !== 'comp-default'
      ? query(collection(db, 'orders'), where('companyId', '==', companyId))
      : query(collection(db, 'orders'));
    const transactionsQuery = companyId && companyId !== 'all' && companyId !== 'comp-default'
      ? query(collection(db, 'paymentTransactions'), where('companyId', '==', companyId))
      : query(collection(db, 'paymentTransactions'));

    // Customers list
    const unsubPay = onSnapshot(customersQuery, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customersData);
    }, (error) => {
      console.warn("Firestore customers subscription failed inside Receivables, using local", error);
      setOfflineFallbackActive(true);
    });

    // Orders list
    const unsubOrd = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
    }, (error) => {
      console.warn("Firestore orders subscription failed inside Receivables, using local", error);
      setOfflineFallbackActive(true);
    });

    // Payment Transactions list
    const unsubTrans = onSnapshot(transactionsQuery, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentTransaction[];
      
      // Sort in-memory safely to preserve records with missing or invalid date fields
      const sortedTrans = transData.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      setTransactions(sortedTrans);
    }, (error) => {
      console.warn("Firestore transactions subscription failed inside Receivables, using local", error);
      setOfflineFallbackActive(true);
    });

    return () => {
      unsubPay();
      unsubOrd();
      unsubTrans();
    };
  }, [companyId, isOfflineMode]);

  // Filter by company
  const companyCustomers = customers.filter(c => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !c.companyId || c.companyId === 'comp-default';
    return c.companyId === companyId;
  });

  const companyOrders = orders.filter(o => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !o.companyId || o.companyId === 'comp-default';
    return o.companyId === companyId;
  });

  const companyTransactions = transactions.filter(t => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !t.companyId || t.companyId === 'comp-default';
    return t.companyId === companyId;
  });

  const selectedCustomerOrders = React.useMemo(() => {
    if (!selectedCustomerId) return [];
    return companyOrders.filter(o => 
      o.customerId === selectedCustomerId && 
      o.paymentMethod === 'credit' && 
      o.paymentStatus !== 'paid' && 
      o.status !== 'cancelled'
    );
  }, [selectedCustomerId, companyOrders]);

  // Filtered clients with active debts
  const clientsWithDebt = companyCustomers.filter(c => (c.currentDebt || 0) > 0.01);
  const filteredClients = clientsWithDebt.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone || '').includes(searchTerm)
  );

  // Unpaid or partially paid credit orders
  const pendingCreditOrders = companyOrders.filter(o => 
    o.paymentMethod === 'credit' && 
    o.paymentStatus !== 'paid' && 
    o.status !== 'cancelled'
  );

  const filteredCreditOrders = pendingCreditOrders.filter(o => 
    (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApplyGlobalPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      alert('Monto inválido');
      return;
    }

    if (!selectedCustomerId) {
      alert('Debe elegir un cliente');
      return;
    }

    setIsSubmitting(true);

    if (getOfflineFallbackActive()) {
      try {
        const custObj = offlineDb.getCustomers().find(c => c.id === selectedCustomerId);
        if (!custObj) throw new Error('Cliente no existe');

        const currentDebt = custObj.currentDebt || 0;

        // Update customer global debt
        offlineDb.saveCustomer({
          ...custObj,
          currentDebt: Math.max(0, currentDebt - amount)
        });

        // Distribute payment across customer's pending order balances starting from oldest
        let remainingPayment = amount;
        let customerOrders = offlineDb.getOrders()
          .filter(o => o.customerId === selectedCustomerId && o.paymentMethod === 'credit' && o.paymentStatus !== 'paid' && o.status !== 'cancelled');

        // Prioritize specific order if selected
        if (selectedOrderId) {
          const targetOrder = customerOrders.find(o => o.id === selectedOrderId);
          if (targetOrder) {
            const orderRemaining = targetOrder.total - targetOrder.amountPaid;
            const paymentToApply = Math.min(remainingPayment, orderRemaining);

            const newPaid = targetOrder.amountPaid + paymentToApply;
            const newStatus = newPaid >= targetOrder.total - 0.01 ? 'paid' : 'partially_paid';

            offlineDb.saveOrder({
              ...targetOrder,
              amountPaid: newPaid,
              paymentStatus: newStatus
            });

            remainingPayment -= paymentToApply;
            customerOrders = customerOrders.filter(o => o.id !== selectedOrderId);
          }
        }

        // Apply remaining payment to other credit orders
        for (const order of customerOrders) {
          if (remainingPayment <= 0.009) break;

          const orderRemaining = order.total - order.amountPaid;
          const paymentToApply = Math.min(remainingPayment, orderRemaining);

          const newPaid = order.amountPaid + paymentToApply;
          const newStatus = newPaid >= order.total - 0.01 ? 'paid' : 'partially_paid';

          offlineDb.saveOrder({
            ...order,
            amountPaid: newPaid,
            paymentStatus: newStatus
          });

          remainingPayment -= paymentToApply;
        }

        // Record transaction log
        offlineDb.saveTransaction({
          orderId: selectedOrderId || 'multiple-orders',
          orderNumber: selectedOrderId ? selectedOrderId.slice(-6).toUpperCase() : 'ABONO',
          customerId: selectedCustomerId,
          customerName: custObj.name || 'Cliente Registrar',
          amount: amount,
          paymentMethod: payMethod as any,
          referenceNumber: payRef || '',
          bankName: payBank || '',
          notes: payNotes || 'Abono general a cuenta corriente'
        });

        // Reset
        setIsRecording(false);
        setPayAmount('');
        setPayNotes('');
        setPayBank('');
        setPayRef('');
        setSelectedCustomerId('');
        setSelectedOrderId('');
        alert('Depósito/transferencia registrado y saldo actualizado! (Modo Local)');
      } catch (err) {
        alert('Error registrando cobro localmente');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const batch = writeBatch(db);

      // We can apply payment dynamically to the oldest credit orders of this customer!
      // This is a standard and highly professional accounting practice.
      const customerRef = doc(db, 'customers', selectedCustomerId);
      const customerSnap = await getDoc(customerRef);
      if (!customerSnap.exists()) throw new Error('Cliente no existe');

      const customerData = customerSnap.data();
      const currentDebt = customerData.currentDebt || 0;

      // Permite registrar abonos libremente, reduciendo la deuda hasta $0.00.

      // Update customer global debt
      batch.update(customerRef, {
        currentDebt: Math.max(0, currentDebt - amount)
      });

      // Distribute payment across customer's pending order balances starting from oldest
      let remainingPayment = amount;
      let customerOrders = orders
        .filter(o => o.customerId === selectedCustomerId && o.paymentMethod === 'credit' && o.paymentStatus !== 'paid' && o.status !== 'cancelled')
        .sort((a, b) => {
          const aSeconds = a.createdAt?.seconds || 0;
          const bSeconds = b.createdAt?.seconds || 0;
          return aSeconds - bSeconds; // ASC order (oldest first)
        });

      // Prioritize specific order if selected
      if (selectedOrderId) {
        const targetOrder = customerOrders.find(o => o.id === selectedOrderId);
        if (targetOrder) {
          const orderRemaining = targetOrder.total - targetOrder.amountPaid;
          const paymentToApply = Math.min(remainingPayment, orderRemaining);

          const orderRef = doc(db, 'orders', targetOrder.id);
          const newPaid = targetOrder.amountPaid + paymentToApply;
          const newStatus = newPaid >= targetOrder.total - 0.01 ? 'paid' : 'partially_paid';

          batch.update(orderRef, {
            amountPaid: newPaid,
            paymentStatus: newStatus
          });

          remainingPayment -= paymentToApply;
          customerOrders = customerOrders.filter(o => o.id !== selectedOrderId);
        }
      }

      // Apply remaining payment to other credit orders
      for (const order of customerOrders) {
        if (remainingPayment <= 0.009) break;

        const orderRemaining = order.total - order.amountPaid;
        const paymentToApply = Math.min(remainingPayment, orderRemaining);

        const orderRef = doc(db, 'orders', order.id);
        const newPaid = order.amountPaid + paymentToApply;
        const newStatus = newPaid >= order.total - 0.01 ? 'paid' : 'partially_paid';

        batch.update(orderRef, {
          amountPaid: newPaid,
          paymentStatus: newStatus
        });

        remainingPayment -= paymentToApply;
      }

      // Record transaction log
      const transactionRef = doc(collection(db, 'paymentTransactions'));
      const transactionData: PaymentTransaction = {
        id: transactionRef.id,
        orderId: selectedOrderId || 'multiple-orders',
        orderNumber: selectedOrderId ? selectedOrderId.slice(-6).toUpperCase() : 'ABONO',
        customerId: selectedCustomerId,
        customerName: customerData.name || 'Cliente Registrar',
        amount: amount,
        paymentMethod: payMethod,
        referenceNumber: payRef || '',
        bankName: payBank || '',
        date: serverTimestamp(),
        notes: payNotes || 'Abono general a cuenta corriente',
        companyId: companyId === 'all' ? customerData.companyId : companyId
      };
      
      batch.set(transactionRef, transactionData);

      await batch.commit();

      // Reset
      setIsRecording(false);
      setPayAmount('');
      setPayNotes('');
      setPayBank('');
      setPayRef('');
      setSelectedCustomerId('');
      setSelectedOrderId('');
      alert('Depósito/transferencia registrado y saldo actualizado!');
    } catch (err) {
      console.warn("Record receivables payment failed in cloud, executing locally:", err);
      setOfflineFallbackActive(true);
      try {
        const custObj = offlineDb.getCustomers().find(c => c.id === selectedCustomerId);
        if (custObj) {
          const currentDebt = custObj.currentDebt || 0;
          offlineDb.saveCustomer({
            ...custObj,
            currentDebt: Math.max(0, currentDebt - amount)
          });

          let remainingPayment = amount;
          let customerOrders = offlineDb.getOrders()
            .filter(o => o.customerId === selectedCustomerId && o.paymentMethod === 'credit' && o.paymentStatus !== 'paid' && o.status !== 'cancelled');

          // Prioritize specific order if selected
          if (selectedOrderId) {
            const targetOrder = customerOrders.find(o => o.id === selectedOrderId);
            if (targetOrder) {
              const orderRemaining = targetOrder.total - targetOrder.amountPaid;
              const paymentToApply = Math.min(remainingPayment, orderRemaining);

              const newPaid = targetOrder.amountPaid + paymentToApply;
              const newStatus = newPaid >= targetOrder.total - 0.01 ? 'paid' : 'partially_paid';

              offlineDb.saveOrder({
                ...targetOrder,
                amountPaid: newPaid,
                paymentStatus: newStatus
              });

              remainingPayment -= paymentToApply;
              customerOrders = customerOrders.filter(o => o.id !== selectedOrderId);
            }
          }

          // Apply remaining payment to other credit orders
          for (const order of customerOrders) {
            if (remainingPayment <= 0.009) break;

            const orderRemaining = order.total - order.amountPaid;
            const paymentToApply = Math.min(remainingPayment, orderRemaining);

            const newPaid = order.amountPaid + paymentToApply;
            const newStatus = newPaid >= order.total - 0.01 ? 'paid' : 'partially_paid';

            offlineDb.saveOrder({
              ...order,
              amountPaid: newPaid,
              paymentStatus: newStatus
            });

            remainingPayment -= paymentToApply;
          }

          offlineDb.saveTransaction({
            orderId: selectedOrderId || 'multiple-orders',
            orderNumber: selectedOrderId ? selectedOrderId.slice(-6).toUpperCase() : 'ABONO',
            customerId: selectedCustomerId,
            customerName: custObj.name || 'Cliente Registrar',
            amount: amount,
            paymentMethod: payMethod as any,
            referenceNumber: payRef || '',
            bankName: payBank || '',
            notes: payNotes || 'Abono general a cuenta corriente'
          });

          setIsRecording(false);
          setPayAmount('');
          setPayNotes('');
          setPayBank('');
          setPayRef('');
          setSelectedCustomerId('');
          setSelectedOrderId('');
          alert('Depósito/transferencia registrado y saldo actualizado! (Modo Local Activo)');
        }
      } catch (fErr) {
        alert('Error registrando cobro: ' + err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick prepopulate client from credit click
  const openRecordingForClient = (client: Customer) => {
    setSelectedCustomerId(client.id);
    setPayAmount(client.currentDebt?.toFixed(2) || '');
    setIsRecording(true);
  };

  const openRecordingForOrder = (order: Order) => {
    setSelectedCustomerId(order.customerId || '');
    setSelectedOrderId(order.id);
    const balance = order.total - order.amountPaid;
    setPayAmount(balance.toFixed(2));
    setIsRecording(true);
  };

  // Global calculations
  const totalReceivables = companyCustomers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
  const totalCollected = companyTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Total por Cobrar</span>
            <p className="text-xl sm:text-2xl font-serif font-bold text-red-500 mt-1">${totalReceivables.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-red-50 text-red-500 rounded-xl">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Pagos Recibidos</span>
            <p className="text-xl sm:text-2xl font-serif font-bold text-green-600 mt-1">${totalCollected.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <Check size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Clientes Deudores</span>
            <p className="text-xl sm:text-2xl font-serif font-bold text-stone-850 mt-1">{clientsWithDebt.length}</p>
          </div>
          <div className="p-3 bg-orange-50 text-orange-500 rounded-xl">
            <User size={20} />
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900">Cobros</h2>
          <p className="text-stone-500 text-xs sm:text-sm">Registra abonos de depósitos o transferencias y aplícalos a deudas.</p>
        </div>
        <button 
          onClick={() => setIsRecording(true)}
          className="flex items-center space-x-2 bg-stone-900 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-sm font-bold shadow-sm active:scale-95 transition-all w-full sm:w-auto justify-center hover:bg-primary"
        >
          <Landmark size={18} />
          <span>Registrar Depósito / Pago</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-stone-100 p-1 rounded-xl max-w-md w-full">
        {[
          { id: 'clients', label: 'Clientes con Deuda' },
          { id: 'orders', label: 'Pedidos a Crédito' },
          { id: 'history', label: 'Historial de Cobros' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
              activeSubTab === tab.id 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Primary search bar */}
      {activeSubTab !== 'history' && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input 
            type="text" 
            placeholder={activeSubTab === 'clients' ? "Buscar deudor..." : "Buscar pedido a crédito..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-stone-150 rounded-xl bg-white text-xs text-stone-700 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {/* Table views */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
        {activeSubTab === 'clients' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Teléfono</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Cartera Pendiente</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-stone-900 text-sm">{client.name}</div>
                      {client.address && <div className="text-stone-400 text-[10px] sm:text-xs mt-0.5">{client.address}</div>}
                    </td>
                    <td className="px-6 py-4 text-xs text-stone-500 font-medium">
                      {client.phone || 'Sin número'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-red-500 text-sm">${(client.currentDebt || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openRecordingForClient(client)}
                        className="bg-stone-900 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Check size={12} />
                        Liquidarse/Abonar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredClients.length === 0 && (
              <div className="text-center py-16 text-stone-400">
                <Receipt className="mx-auto mb-3 opacity-20" size={36} />
                <p className="text-xs sm:text-sm font-serif">¡Excelente noticia! No hay clientes con deuda pendiente.</p>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Pedido ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Deudor</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Monto Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Monto Restante</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredCreditOrders.map(order => {
                  const remaining = order.total - order.amountPaid;
                  return (
                    <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-stone-900 text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-stone-700">
                        <span className="font-bold">{order.customerName || 'Cliente General'}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-stone-600">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-red-500 text-sm">${remaining.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openRecordingForOrder(order)}
                          className="bg-stone-100 hover:bg-stone-900 text-stone-850 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 shadow-sm"
                        >
                          Abonar Pedido
                          <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredCreditOrders.length === 0 && (
              <div className="text-center py-16 text-stone-400">
                <Receipt className="mx-auto mb-3 opacity-20" size={36} />
                <p className="text-xs sm:text-sm font-serif">No hay pedidos a crédito pendientes.</p>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Fecha</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Referencia / Banco</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Monto Amortizado</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Orden ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {companyTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs text-stone-500 font-medium whitespace-nowrap">
                      {t.date ? new Date(t.date.seconds * 1000).toLocaleString('es-ES') : 'Hace un momento'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-stone-850 text-xs sm:text-sm">{t.customerName}</span>
                    </td>
                    <td className="px-6 py-4">
                      {t.paymentMethod === 'transfer' || t.paymentMethod === 'deposit' ? (
                        <div className="text-xs">
                          <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] capitalize inline-block mr-1">
                            {t.paymentMethod === 'transfer' ? 'Transf.' : 'Depós.'}
                          </span>
                          <span className="font-medium text-stone-700">{t.bankName || 'N/A'}</span>
                          {t.referenceNumber && (
                            <span className="text-stone-400 text-[10px] block font-mono">Ref: {t.referenceNumber}</span>
                          )}
                        </div>
                      ) : (
                        <span className="font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded text-[10px] uppercase">
                          {t.paymentMethod}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-green-600 text-sm">${t.amount.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-stone-400 text-xs font-bold">{t.orderNumber || '#------'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {companyTransactions.length === 0 && (
              <div className="text-center py-16 text-stone-400">
                <History className="mx-auto mb-3 opacity-20" size={36} />
                <p className="text-xs sm:text-sm font-serif">Aún no se registran depósitos o cobros.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recording dialog */}
      <AnimatePresence>
        {isRecording && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.form 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onSubmit={handleApplyGlobalPayment}
              className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-6"
            >
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    {selectedOrderId ? `Registrar Pago para Pedido #${selectedOrderId.slice(-6).toUpperCase()}` : 'Registrar Cobro / Depósito'}
                  </h3>
                  <p className="text-stone-400 text-[10px]">Ingresa los datos del depósito o transferencia recibida</p>
                </div>
                <button type="button" onClick={() => setIsRecording(false)} className="p-2 hover:bg-stone-50 rounded-full text-stone-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 shrink-0">
                {/* Select Customer */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Seleccionar Deudor</label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={e => {
                      setSelectedCustomerId(e.target.value);
                      const customerObj = customers.find(c => c.id === e.target.value);
                      if (customerObj) {
                        setPayAmount((customerObj.currentDebt || 0).toFixed(2));
                      }
                      setSelectedOrderId(''); // Reset order when customer is changed manually
                    }}
                    className="w-full px-3 py-2 border border-stone-150 rounded-xl bg-stone-50 text-xs font-semibold text-stone-700 outline-none"
                  >
                    <option value="">-- Elige un cliente --</option>
                    {companyCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.currentDebt && c.currentDebt > 0.01 ? `(Deuda: $${c.currentDebt.toFixed(2)})` : '(Al día / Sin deuda)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Specific Order (Optional) */}
                {selectedCustomerId && selectedCustomerOrders.length > 0 && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-sans">Aplicar a Pedido Específico (Opcional)</label>
                    <select
                      value={selectedOrderId}
                      onChange={e => {
                        setSelectedOrderId(e.target.value);
                        if (e.target.value) {
                          const orderObj = selectedCustomerOrders.find(o => o.id === e.target.value);
                          if (orderObj) {
                            const balance = orderObj.total - orderObj.amountPaid;
                            setPayAmount(balance.toFixed(2));
                          }
                        } else {
                          const customerObj = customers.find(c => c.id === selectedCustomerId);
                          setPayAmount((customerObj?.currentDebt || 0).toFixed(2));
                        }
                      }}
                      className="w-full px-3 py-2 border border-stone-150 rounded-xl bg-stone-50 text-xs font-semibold text-stone-700 outline-none"
                    >
                      <option value="">-- Distribuir entre todas las deudas (más antiguas primero) --</option>
                      {selectedCustomerOrders.map(o => {
                        const balance = o.total - o.amountPaid;
                        return (
                          <option key={o.id} value={o.id}>
                            Pedido #{o.id.slice(-6).toUpperCase()} - Total: ${o.total.toFixed(2)} (Pendiente: ${balance.toFixed(2)})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Monto del Depósito/Pago ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Suma pagada por el cliente"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-stone-150 rounded-xl bg-stone-50 focus:bg-white text-sm font-bold text-stone-850 outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                {/* Method */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Canal / Medio de Depósito</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'transfer', label: 'Transferencia' },
                      { id: 'deposit', label: 'Depósito Físico' },
                      { id: 'cash', label: 'Efectivo/Caja' }
                    ].map(canal => (
                      <button
                        key={canal.id}
                        type="button"
                        onClick={() => setPayMethod(canal.id as any)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                          payMethod === canal.id 
                            ? 'bg-stone-900 border-stone-900 text-white shadow-sm' 
                            : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'
                        }`}
                      >
                        {canal.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banks and ref */}
                {payMethod !== 'cash' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1.5">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Banco Recibido</label>
                      <input
                        type="text"
                        placeholder="BCP, Pichincha, etc."
                        required
                        value={payBank}
                        onChange={e => setPayBank(e.target.value)}
                        className="w-full px-3 py-1.5 border border-stone-150 rounded-lg text-xs outline-none bg-stone-50 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1.5">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Clave/Referencia</label>
                      <input
                        type="text"
                        placeholder="N° de operación"
                        required
                        value={payRef}
                        onChange={e => setPayRef(e.target.value)}
                        className="w-full px-3 py-1.5 border border-stone-150 rounded-lg text-xs outline-none bg-stone-50 focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-sans">Notas adicionales</label>
                  <textarea
                    rows={2}
                    placeholder="Ingresa notas complementarias si es necesario..."
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-150 bg-stone-50 focus:bg-white rounded-lg text-xs outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsRecording(false)}
                  className="flex-1 py-3 text-stone-500 hover:bg-stone-50 rounded-xl text-xs font-bold border border-transparent hover:border-stone-100 transition-colors"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !payAmount}
                  className="flex-[2] py-3 bg-stone-900 hover:bg-primary font-bold text-white rounded-xl text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-50 shadow-sm"
                >
                  <Save size={14} />
                  {isSubmitting ? 'Aplicando abono...' : 'Aplicar Abono'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
