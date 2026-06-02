import React from 'react';
import { 
  Search, Filter, ChevronDown, Check, Truck, CreditCard, Clock, X, 
  Eye, FileText, Landmark, RefreshCw, BadgeAlert, Trash2, Calendar
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, onSnapshot, orderBy, doc, updateDoc, 
  addDoc, serverTimestamp, writeBatch, getDocs, getDoc
} from 'firebase/firestore';
import { Order, Product, Customer, PaymentTransaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { getOfflineFallbackActive, offlineDb, setOfflineFallbackActive, OFFLINE_CHANGE_EVENT } from '../lib/offlineDb';

interface OrdersManagerProps {
  products: Product[];
  companyId?: string; // Active companyId ('comp-default', 'comp-1', 'comp-2', etc.)
  onNavigateToCustomers?: (
    search: string, 
    tab: 'approved' | 'requests', 
    prefill?: { name: string; phone: string; address?: string }
  ) => void;
}

export default function OrdersManager({ 
  products, 
  companyId = 'comp-default',
  onNavigateToCustomers
}: OrdersManagerProps) {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);

  const activeAssociatedCustomer = selectedOrder 
    ? customers.find(c => c.id === selectedOrder.customerId || (selectedOrder.customerPhone && c.phone === selectedOrder.customerPhone)) 
    : null;
  const isCustomerPending = activeAssociatedCustomer?.status === 'pending';
  const customerNotFound = !!(selectedOrder && !activeAssociatedCustomer && selectedOrder.customerId && selectedOrder.customerId !== 'manual-client');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('todos');
  const [paymentFilter, setPaymentFilter] = React.useState<string>('todos');
  
  // Payment recording state
  const [isPaying, setIsPaying] = React.useState(false);
  const [payAmount, setPayAmount] = React.useState('');
  const [payMethod, setPayMethod] = React.useState<'cash' | 'card' | 'transfer' | 'deposit'>('transfer');
  const [payReference, setPayReference] = React.useState('');
  const [payBank, setPayBank] = React.useState('');
  const [payNotes, setPayNotes] = React.useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false);

  // Manual order creation
  const [isCreatingOrder, setIsCreatingOrder] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<string>('');
  const [newCustomerName, setNewCustomerName] = React.useState('');
  const [newCustomerPhone, setNewCustomerPhone] = React.useState('');
  const [orderItems, setOrderItems] = React.useState<{ product: Product; quantity: number }[]>([]);
  const [orderPaymentMethod, setOrderPaymentMethod] = React.useState<'cash' | 'card' | 'transfer' | 'credit'>('cash');
  const [orderPaidAmount, setOrderPaidAmount] = React.useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = React.useState(false);

  const [isOfflineMode, setIsOfflineMode] = React.useState(getOfflineFallbackActive());

  React.useEffect(() => {
    const handleSync = () => {
      const isOff = getOfflineFallbackActive();
      setIsOfflineMode(isOff);
      if (isOff) {
        setOrders(offlineDb.getOrders());
        setCustomers(offlineDb.getCustomers());
      }
    };
    window.addEventListener(OFFLINE_CHANGE_EVENT, handleSync);
    if (getOfflineFallbackActive()) {
      setOrders(offlineDb.getOrders());
      setCustomers(offlineDb.getCustomers());
    }
    return () => window.removeEventListener(OFFLINE_CHANGE_EVENT, handleSync);
  }, []);

  // Listen to orders
  React.useEffect(() => {
    if (isOfflineMode) return;
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Sort in-memory safely to preserve records with missing or invalid createdAt dates
      const sortedOrders = ordersData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setOrders(sortedOrders);
    }, (error) => {
      console.warn("Firestore orders subscription failed, using offline fallback", error);
      setOfflineFallbackActive(true);
    });
    return () => unsubscribe();
  }, [isOfflineMode]);

  // Listen to customers
  React.useEffect(() => {
    if (isOfflineMode) return;
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customersData);
    }, (error) => {
      console.warn("Firestore customers subscription failed, using offline fallback", error);
      setOfflineFallbackActive(true);
    });
    return () => unsubscribe();
  }, [isOfflineMode]);

  // Filter orders by active company context first
  const companyOrders = orders.filter(order => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !order.companyId || order.companyId === 'comp-default';
    return order.companyId === companyId;
  });

  // Filter orders
  const filteredOrders = companyOrders.filter(order => {
    const customerMatch = (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (order.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (order.customerPhone || '').includes(searchTerm);
    
    const statusMatch = statusFilter === 'todos' || order.status === statusFilter;
    const paymentMatch = paymentFilter === 'todos' || order.paymentStatus === paymentFilter;
    
    return customerMatch && statusMatch && paymentMatch;
  });

  // Handle Dispatch status change
  const handleUpdateDispatch = async (orderId: string, status: 'pending' | 'shipped' | 'delivered') => {
    const updateData: any = { dispatchStatus: status };
    if (status === 'delivered') {
      updateData.status = 'completed';
    } else if (status === 'shipped') {
      updateData.status = 'dispatched';
    } else {
      updateData.status = 'pending';
    }

    if (getOfflineFallbackActive()) {
      const ord = offlineDb.getOrders().find(o => o.id === orderId);
      if (ord) {
        offlineDb.saveOrder({ ...ord, ...updateData });
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, ...updateData } : null);
        }
      }
      return;
    }

    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, updateData);
      
      // Update selected order view if open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, ...updateData } : null);
      }
    } catch (error) {
      console.warn("Update dispatch failed in cloud, executing locally:", error);
      setOfflineFallbackActive(true);
      const ord = offlineDb.getOrders().find(o => o.id === orderId);
      if (ord) {
        offlineDb.saveOrder({ ...ord, ...updateData });
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, ...updateData } : null);
        }
      }
    }
  };

  // Complete clean order (marked as completed when paid and delivered)
  const handleCompleteOrder = async (orderId: string) => {
    const updateData = { 
      status: 'completed' as const,
      dispatchStatus: 'delivered' as const
    };

    if (getOfflineFallbackActive()) {
      const ord = offlineDb.getOrders().find(o => o.id === orderId);
      if (ord) {
        offlineDb.saveOrder({ ...ord, ...updateData });
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, ...updateData } : null);
        }
      }
      return;
    }

    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, updateData);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, ...updateData } : null);
      }
    } catch (error) {
      console.warn("Complete order failed in cloud, executing locally:", error);
      setOfflineFallbackActive(true);
      const ord = offlineDb.getOrders().find(o => o.id === orderId);
      if (ord) {
        offlineDb.saveOrder({ ...ord, ...updateData });
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, ...updateData } : null);
        }
      }
    }
  };

  // Cancel order (restore stock if active)
  const handleCancelOrder = async (order: Order) => {
    if (!confirm('¿Seguro que deseas cancelar este pedido? Se restablecerá el stock.')) return;

    if (getOfflineFallbackActive()) {
      try {
        // 1. Cancel order
        offlineDb.saveOrder({ ...order, status: 'cancelled' });
        // 2. Restore stock
        const localProducts = offlineDb.getProducts();
        order.items.forEach(item => {
          const prod = localProducts.find(p => p.id === item.id);
          if (prod) {
            offlineDb.saveProduct({ ...prod, stock: prod.stock + item.quantity });
          }
        });
        // 3. Return debt if credit
        if (order.customerId && order.paymentMethod === 'credit') {
          const debtToReturn = order.total - order.amountPaid;
          if (debtToReturn > 0) {
            const cust = offlineDb.getCustomers().find(c => c.id === order.customerId);
            if (cust) {
              offlineDb.saveCustomer({ ...cust, currentDebt: Math.max(0, (cust.currentDebt || 0) - debtToReturn) });
            }
          }
        }
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
        }
        alert('Pedido cancelado exitosamente (Modo Local)');
      } catch (err) {
        alert('Error al cancelar localmente');
      }
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Cancel the order
      const orderRef = doc(db, 'orders', order.id);
      batch.update(orderRef, { status: 'cancelled' });

      // Restore stock
      for (const item of order.items) {
        const productRef = doc(db, 'products', item.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          batch.update(productRef, { stock: currentStock + item.quantity });
        }
      }

      // If it was credit, subtract from customer's currentDebt
      if (order.customerId && order.paymentMethod === 'credit') {
        const debtToReturn = order.total - order.amountPaid;
        if (debtToReturn > 0) {
          const customerRef = doc(db, 'customers', order.customerId);
          const customerSnap = await getDoc(customerRef);
          if (customerSnap.exists()) {
            const currentDebt = customerSnap.data().currentDebt || 0;
            batch.update(customerRef, { currentDebt: Math.max(0, currentDebt - debtToReturn) });
          }
        }
      }

      await batch.commit();
      
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }
    } catch (error) {
      console.warn("Cancel order failed in cloud, executing locally:", error);
      setOfflineFallbackActive(true);
      try {
        offlineDb.saveOrder({ ...order, status: 'cancelled' });
        const localProducts = offlineDb.getProducts();
        order.items.forEach(item => {
          const prod = localProducts.find(p => p.id === item.id);
          if (prod) {
            offlineDb.saveProduct({ ...prod, stock: prod.stock + item.quantity });
          }
        });
        if (order.customerId && order.paymentMethod === 'credit') {
          const debtToReturn = order.total - order.amountPaid;
          if (debtToReturn > 0) {
            const cust = offlineDb.getCustomers().find(c => c.id === order.customerId);
            if (cust) {
              offlineDb.saveCustomer({ ...cust, currentDebt: Math.max(0, (cust.currentDebt || 0) - debtToReturn) });
            }
          }
        }
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
        }
        alert('Pedido cancelado exitosamente (Modo Local Activo)');
      } catch (fErr) {
        alert('Error al cancelar pedido');
      }
    }
  };

  // Submit payment on order
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      alert('Monto inválido');
      return;
    }

    const remainingToPay = selectedOrder.total - selectedOrder.amountPaid;
    if (amount > remainingToPay + 0.01) {
      alert(`El monto ingresado ($${amount}) supera el saldo pendiente de ($${remainingToPay.toFixed(2)})`);
      return;
    }

    setIsSubmittingPayment(true);

    if (getOfflineFallbackActive()) {
      try {
        const newAmountPaid = selectedOrder.amountPaid + amount;
        let newPaymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 'partially_paid';
        if (newAmountPaid >= selectedOrder.total - 0.01) {
          newPaymentStatus = 'paid';
        }

        // Save order
        offlineDb.saveOrder({
          ...selectedOrder,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus
        });

        // Add Transaction
        offlineDb.saveTransaction({
          orderId: selectedOrder.id,
          orderNumber: selectedOrder.id.slice(-6).toUpperCase(),
          customerId: selectedOrder.customerId || 'manual-client',
          customerName: selectedOrder.customerName || 'Cliente General',
          amount: amount,
          paymentMethod: payMethod,
          referenceNumber: payReference || '',
          bankName: payBank || '',
          notes: payNotes || ''
        });

        // Reduce Debt if credit
        if (selectedOrder.customerId && selectedOrder.paymentMethod === 'credit') {
          const cust = offlineDb.getCustomers().find(c => c.id === selectedOrder.customerId);
          if (cust) {
            offlineDb.saveCustomer({
              ...cust,
              currentDebt: Math.max(0, (cust.currentDebt || 0) - amount)
            });
          }
        }

        setSelectedOrder(prev => prev ? {
          ...prev,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus
        } : null);

        setIsPaying(false);
        setPayAmount('');
        setPayNotes('');
        setPayReference('');
        setPayBank('');
        alert('Pago registrado exitosamente (Modo Local)');
      } catch (err) {
        alert('Error al registrar pago localmente');
      } finally {
        setIsSubmittingPayment(false);
      }
      return;
    }

    try {
      const batch = writeBatch(db);
      const newAmountPaid = selectedOrder.amountPaid + amount;
      
      // Determine new payment status
      let newPaymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 'partially_paid';
      if (newAmountPaid >= selectedOrder.total - 0.01) {
        newPaymentStatus = 'paid';
      } else if (newAmountPaid <= 0) {
        newPaymentStatus = 'unpaid';
      }

      // Update Order document
      const orderRef = doc(db, 'orders', selectedOrder.id);
      batch.update(orderRef, {
        amountPaid: newAmountPaid,
        paymentStatus: newPaymentStatus
      });

      // Create Payment TRANSACTION document
      const transactionRef = doc(collection(db, 'paymentTransactions'));
      const transactionData: PaymentTransaction = {
        id: transactionRef.id,
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.id.slice(-6).toUpperCase(),
        customerId: selectedOrder.customerId || 'manual-client',
        customerName: selectedOrder.customerName || 'Cliente General',
        amount: amount,
        paymentMethod: payMethod,
        referenceNumber: payReference || '',
        bankName: payBank || '',
        date: serverTimestamp(),
        notes: payNotes || ''
      };
      batch.set(transactionRef, transactionData);

      // If credit order, reduce customer remaining debt
      if (selectedOrder.customerId && selectedOrder.paymentMethod === 'credit') {
        const customerRef = doc(db, 'customers', selectedOrder.customerId);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          const currentDebt = customerSnap.data().currentDebt || 0;
          batch.update(customerRef, {
            currentDebt: Math.max(0, currentDebt - amount)
          });
        }
      }

      await batch.commit();

      // Update local view
      setSelectedOrder(prev => prev ? {
        ...prev,
        amountPaid: newAmountPaid,
        paymentStatus: newPaymentStatus
      } : null);

      setIsPaying(false);
      setPayAmount('');
      setPayNotes('');
      setPayReference('');
      setPayBank('');
      alert('Pago registrado exitosamente');
    } catch (error) {
      console.warn("Record payment failed in cloud, executing locally:", error);
      setOfflineFallbackActive(true);
      try {
        const newAmountPaid = selectedOrder.amountPaid + amount;
        let newPaymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 'partially_paid';
        if (newAmountPaid >= selectedOrder.total - 0.01) {
          newPaymentStatus = 'paid';
        }

        offlineDb.saveOrder({
          ...selectedOrder,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus
        });

        offlineDb.saveTransaction({
          orderId: selectedOrder.id,
          orderNumber: selectedOrder.id.slice(-6).toUpperCase(),
          customerId: selectedOrder.customerId || 'manual-client',
          customerName: selectedOrder.customerName || 'Cliente General',
          amount: amount,
          paymentMethod: payMethod,
          referenceNumber: payReference || '',
          bankName: payBank || '',
          notes: payNotes || ''
        });

        if (selectedOrder.customerId && selectedOrder.paymentMethod === 'credit') {
          const cust = offlineDb.getCustomers().find(c => c.id === selectedOrder.customerId);
          if (cust) {
            offlineDb.saveCustomer({
              ...cust,
              currentDebt: Math.max(0, (cust.currentDebt || 0) - amount)
            });
          }
        }

        setSelectedOrder(prev => prev ? {
          ...prev,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus
        } : null);

        setIsPaying(false);
        setPayAmount('');
        setPayNotes('');
        setPayReference('');
        setPayBank('');
        alert('Pago registrado exitosamente (Modo Local Activo)');
      } catch (fErr) {
        alert('Hubo un error al registrar el pago');
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Add Item to manual order
  const addManualItem = (prod: Product) => {
    setOrderItems(prev => {
      const match = prev.find(item => item.product.id === prod.id);
      if (match) {
        return prev.map(item => item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
  };

  // Remove Item from manual order
  const removeManualItem = (prodId: string) => {
    setOrderItems(prev => prev.filter(item => item.product.id !== prodId));
  };

  // Set Item Quantity in manual order
  const changeManualItemQty = (prodId: string, quantity: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.product.id === prodId) {
        return { ...item, quantity: Math.max(1, quantity) };
      }
      return item;
    }));
  };

  // Create order manually
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert('Debes agregar al menos una pulsera al pedido');
      return;
    }

    setIsSubmittingOrder(true);

    if (getOfflineFallbackActive()) {
      try {
        const subtotal = orderItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
        const total = subtotal;

        let finalCustomerId = selectedCustomer;
        let finalCustomerName = '';
        let finalCustomerPhone = '';

        if (selectedCustomer === 'new') {
          const newCust = offlineDb.saveCustomer({
            name: newCustomerName,
            phone: newCustomerPhone,
            totalSpent: total,
            currentDebt: orderPaymentMethod === 'credit' ? (total - (parseFloat(orderPaidAmount) || 0)) : 0,
          });
          finalCustomerId = newCust.id;
          finalCustomerName = newCust.name;
          finalCustomerPhone = newCust.phone || '';
        } else if (selectedCustomer) {
          const custObj = customers.find(c => c.id === selectedCustomer);
          if (custObj) {
            finalCustomerName = custObj.name;
            finalCustomerPhone = custObj.phone || '';
            const newDebt = orderPaymentMethod === 'credit' ? (total - (parseFloat(orderPaidAmount) || 0)) : 0;
            offlineDb.saveCustomer({
              ...custObj,
              totalSpent: (custObj.totalSpent || 0) + total,
              currentDebt: (custObj.currentDebt || 0) + newDebt,
              lastPurchase: new Date().toISOString()
            });
          }
        } else {
          finalCustomerName = 'Cliente General';
        }

        const paidAmount = parseFloat(orderPaidAmount) || 0;
        
        // Save Order
        const orderRefId = `local-ord-${Date.now()}`;
        offlineDb.saveOrder({
          id: orderRefId,
          items: orderItems.map(item => ({
            ...item.product,
            quantity: item.quantity
          })),
          subtotal,
          total,
          status: 'pending',
          dispatchStatus: 'pending',
          paymentMethod: orderPaymentMethod,
          amountPaid: paidAmount,
          paymentStatus: paidAmount >= total ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid'),
          customerId: finalCustomerId || undefined,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone || undefined,
        });

        // Deduct stock
        orderItems.forEach(item => {
          const p = offlineDb.getProducts().find(p0 => p0.id === item.product.id);
          if (p) {
            offlineDb.saveProduct({ ...p, stock: Math.max(0, p.stock - item.quantity) });
          }
        });

        // Dynamic initial payment transaction
        if (paidAmount > 0) {
          offlineDb.saveTransaction({
            orderId: orderRefId,
            orderNumber: orderRefId.slice(-6).toUpperCase(),
            customerId: finalCustomerId || 'manual-client',
            customerName: finalCustomerName,
            amount: paidAmount,
            paymentMethod: orderPaymentMethod === 'credit' ? 'cash' : (orderPaymentMethod as any),
            notes: 'Pago inicial del pedido'
          });
        }

        setSelectedCustomer('');
        setNewCustomerName('');
        setNewCustomerPhone('');
        setOrderItems([]);
        setOrderPaidAmount('');
        setIsCreatingOrder(false);
        alert('Pedido registrado exitosamente (Modo Local)');
      } catch (err: any) {
        alert(err.message || 'Error al guardar pedido local');
      } finally {
        setIsSubmittingOrder(false);
      }
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Calculate totals
      const subtotal = orderItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
      const total = subtotal;

      // Handle Customer reference
      let finalCustomerId = selectedCustomer;
      let finalCustomerName = '';
      let finalCustomerPhone = '';

      if (selectedCustomer === 'new') {
        // Register new customer
        const customerRef = doc(collection(db, 'customers'));
        finalCustomerId = customerRef.id;
        finalCustomerName = newCustomerName;
        finalCustomerPhone = newCustomerPhone;

        batch.set(customerRef, {
          id: finalCustomerId,
          name: newCustomerName,
          phone: newCustomerPhone,
          totalSpent: total,
          currentDebt: orderPaymentMethod === 'credit' ? (total - (parseFloat(orderPaidAmount) || 0)) : 0,
          createdAt: serverTimestamp()
        });
      } else if (selectedCustomer) {
        const custObj = customers.find(c => c.id === selectedCustomer);
        if (custObj) {
          finalCustomerName = custObj.name;
          finalCustomerPhone = custObj.phone || '';
          
          // Update customer totals
          const customerRef = doc(db, 'customers', selectedCustomer);
          const currentDebt = custObj.currentDebt || 0;
          const totalSpent = custObj.totalSpent || 0;
          const newDebt = orderPaymentMethod === 'credit' ? (total - (parseFloat(orderPaidAmount) || 0)) : 0;

          batch.update(customerRef, {
            totalSpent: totalSpent + total,
            currentDebt: currentDebt + newDebt,
            lastPurchase: serverTimestamp()
          });
        }
      } else {
        finalCustomerName = 'Cliente General';
      }

      const paidAmount = parseFloat(orderPaidAmount) || 0;

      // New Order Doc
      const orderRef = doc(collection(db, 'orders'));
      const orderData: Order = {
        id: orderRef.id,
        items: orderItems.map(item => ({
          ...item.product,
          quantity: item.quantity
        })),
        subtotal,
        total,
        status: 'pending',
        dispatchStatus: 'pending',
        paymentMethod: orderPaymentMethod,
        amountPaid: paidAmount,
        paymentStatus: paidAmount >= total ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid'),
        customerId: finalCustomerId || undefined,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone || undefined,
        createdAt: serverTimestamp()
      };

      batch.set(orderRef, orderData);

      // Deduct stock for all items
      for (const item of orderItems) {
        const prodRef = doc(db, 'products', item.product.id);
        const nextStock = Math.max(0, item.product.stock - item.quantity);
        batch.update(prodRef, { stock: nextStock });
      }

      // If some initial payment was made, generate payment transaction
      if (paidAmount > 0) {
        const transRef = doc(collection(db, 'paymentTransactions'));
        const transData: PaymentTransaction = {
          id: transRef.id,
          orderId: orderRef.id,
          orderNumber: orderRef.id.slice(-6).toUpperCase(),
          customerId: finalCustomerId || 'manual-client',
          customerName: finalCustomerName,
          amount: paidAmount,
          paymentMethod: orderPaymentMethod === 'credit' ? 'cash' : (orderPaymentMethod as any),
          date: serverTimestamp(),
          notes: 'Pago inicial del pedido'
        };
        batch.set(transRef, transData);
      }

      await batch.commit();

      // Reset Create Order state
      setIsCreatingOrder(false);
      setOrderItems([]);
      setSelectedCustomer('');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setOrderPaidAmount('');
      setOrderPaymentMethod('cash');
      alert('Pedido creado exitosamente');
    } catch (error) {
      console.warn("Create order failed in cloud, switching to local database storage fallback:", error);
      setOfflineFallbackActive(true);
      try {
        const subtotal = orderItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
        const total = subtotal;

        let finalCustomerId = selectedCustomer;
        let finalCustomerName = '';
        let finalCustomerPhone = '';

        if (selectedCustomer === 'new') {
          const newCust = offlineDb.saveCustomer({
            name: newCustomerName,
            phone: newCustomerPhone,
            totalSpent: total,
            currentDebt: orderPaymentMethod === 'credit' ? (total - (parseFloat(orderPaidAmount) || 0)) : 0,
          });
          finalCustomerId = newCust.id;
          finalCustomerName = newCust.name;
          finalCustomerPhone = newCust.phone || '';
        } else if (selectedCustomer) {
          const custObj = customers.find(c => c.id === selectedCustomer);
          if (custObj) {
            finalCustomerName = custObj.name;
            finalCustomerPhone = custObj.phone || '';
            const newDebt = orderPaymentMethod === 'credit' ? (total - (parseFloat(orderPaidAmount) || 0)) : 0;
            offlineDb.saveCustomer({
              ...custObj,
              totalSpent: (custObj.totalSpent || 0) + total,
              currentDebt: (custObj.currentDebt || 0) + newDebt,
              lastPurchase: new Date().toISOString()
            });
          }
        } else {
          finalCustomerName = 'Cliente General';
        }

        const paidAmount = parseFloat(orderPaidAmount) || 0;
        const orderRefId = `local-ord-${Date.now()}`;
        offlineDb.saveOrder({
          id: orderRefId,
          items: orderItems.map(item => ({
            ...item.product,
            quantity: item.quantity
          })),
          subtotal,
          total,
          status: 'pending',
          dispatchStatus: 'pending',
          paymentMethod: orderPaymentMethod,
          amountPaid: paidAmount,
          paymentStatus: paidAmount >= total ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid'),
          customerId: finalCustomerId || undefined,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone || undefined,
        });

        orderItems.forEach(item => {
          const p = offlineDb.getProducts().find(p0 => p0.id === item.product.id);
          if (p) {
            offlineDb.saveProduct({ ...p, stock: Math.max(0, p.stock - item.quantity) });
          }
        });

        if (paidAmount > 0) {
          offlineDb.saveTransaction({
            orderId: orderRefId,
            orderNumber: orderRefId.slice(-6).toUpperCase(),
            customerId: finalCustomerId || 'manual-client',
            customerName: finalCustomerName,
            amount: paidAmount,
            paymentMethod: orderPaymentMethod === 'credit' ? 'cash' : (orderPaymentMethod as any),
            notes: 'Pago inicial del pedido'
          });
        }

        setIsCreatingOrder(false);
        setOrderItems([]);
        setSelectedCustomer('');
        setNewCustomerName('');
        setNewCustomerPhone('');
        setOrderPaidAmount('');
        setOrderPaymentMethod('cash');
        alert('Pedido creado exitosamente (Modo Local Activo)');
      } catch (fErr) {
        alert('Error de creación de pedido: ' + error);
      }
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'dispatched': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  const getPaymentStatusBadge = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'partially_paid': return 'bg-orange-100 text-orange-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  const manualSubtotal = orderItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1 sm:px-0">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900">Pedidos</h2>
          <p className="text-stone-500 text-xs sm:text-sm">Registra o consulta pedidos, su envío y pagos.</p>
        </div>
        <button 
          onClick={() => setIsCreatingOrder(true)}
          className="flex items-center space-x-2 bg-stone-900 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-sm font-bold shadow-sm active:scale-95 transition-all w-full sm:w-auto justify-center"
        >
          <Check size={18} />
          <span>Registrar Pedido</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por cliente o ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border-stone-100 rounded-xl bg-stone-50 text-xs focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Progreso Pedido</label>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-stone-100 rounded-xl text-xs bg-stone-50 font-medium text-stone-700 outline-none"
              >
                <option value="todos">Todos los Estados</option>
                <option value="pending">Pendientes / Nuevos</option>
                <option value="dispatched">Despachados / Enviados</option>
                <option value="completed">Entregados / Completados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Estado de Pago</label>
              <select 
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-stone-100 rounded-xl text-xs bg-stone-50 font-medium text-stone-700 outline-none"
              >
                <option value="todos">Todos</option>
                <option value="paid">Pagados</option>
                <option value="partially_paid">Pago Parcial</option>
                <option value="unpaid">Sin Pagar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Listing */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Pedido ID / Cliente</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Despacho</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Monto Pagado</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredOrders.map(order => {
                    const balance = order.total - order.amountPaid;
                    return (
                      <tr key={order.id} className="hover:bg-stone-50/50 transition-colors group">
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <div className="font-bold text-stone-900 text-xs sm:text-sm">
                            #{order.id.slice(-6).toUpperCase()}
                          </div>
                          <div className="text-stone-500 text-[10px] sm:text-xs">
                            {order.customerName || 'Cliente General'}
                          </div>
                          {order.createdAt && (
                            <div className="text-[9px] text-stone-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={10} />
                              {new Date(order.createdAt.seconds * 1000).toLocaleDateString('es-ES')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <div className="font-bold text-stone-900 text-xs sm:text-sm">
                            ${order.total.toFixed(2)}
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase mt-1 inline-block ${getStatusBadge(order.status)}`}>
                            {order.status === 'completed' ? 'Completado' : order.status === 'dispatched' ? 'Enviado' : order.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <div className="flex flex-col items-start">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              order.dispatchStatus === 'delivered' ? 'bg-green-100 text-green-700' : order.dispatchStatus === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'
                            }`}>
                              {order.dispatchStatus === 'delivered' ? 'Entregado' : order.dispatchStatus === 'shipped' ? 'En camino' : 'Por despachar'}
                            </span>
                            {order.paymentMethod === 'credit' && (
                              <span className="text-[9px] font-mono font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded mt-1">Crédito</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-xs sm:text-sm">
                            <span className="font-bold text-green-600">${order.amountPaid.toFixed(2)}</span>
                            {balance > 0.01 && (
                              <span className="text-amber-600 block text-[9px] sm:text-[10px] font-medium">Debe: ${balance.toFixed(2)}</span>
                            )}
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase mt-1 inline-block ${getPaymentStatusBadge(order.paymentStatus)}`}>
                            {order.paymentStatus === 'paid' ? 'Pagado' : order.paymentStatus === 'partially_paid' ? 'Parcial' : 'No Pagado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-right">
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className="p-1 sm:p-2 hover:bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 transition-colors inline-flex items-center gap-1"
                          >
                            <Eye size={16} />
                            <span className="hidden sm:inline text-xs font-semibold">Detalle</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 sm:py-20 text-stone-400 bg-stone-50/10">
                <FileText size={32} className="mx-auto mb-4 opacity-20" />
                <p className="text-xs sm:text-sm font-serif">No se encontraron pedidos.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Right slide or Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-lg max-h-[90vh] sm:max-h-[95vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col pb-safe-bottom"
            >
              {/* Header */}
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-stone-900 text-lg">Pedido #{selectedOrder.id.slice(-6).toUpperCase()}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${getStatusBadge(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <p className="text-stone-400 text-[10px] mt-0.5">Gestión de órdenes y liquidación</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 block">
                {/* Customer Details */}
                <div className="space-y-3 bg-stone-50/50 p-4 rounded-xl border border-stone-100">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Datos del Cliente</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-700">
                    <div>
                      <p className="text-[10px] text-stone-400 font-semibold mb-0.5">Nombre</p>
                      <p className="font-bold text-stone-900">{selectedOrder.customerName || 'Cliente General'}</p>
                    </div>
                    {selectedOrder.customerPhone && (
                      <div>
                        <p className="text-[10px] text-stone-400 font-semibold mb-0.5">Teléfono</p>
                        <p className="font-bold text-stone-900">{selectedOrder.customerPhone}</p>
                      </div>
                    )}
                  </div>

                  {/* Warning and Direct Action Section */}
                  {(isCustomerPending || customerNotFound) && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-start gap-2 text-xs text-amber-800">
                        <span className="text-sm">⚠️</span>
                        <div>
                          <p className="font-extrabold text-amber-900 leading-snug">
                            {isCustomerPending ? "Registro Pendiente de Aprobación" : "Cliente No Registrado"}
                          </p>
                          <p className="text-[10px] text-amber-700 font-medium mt-0.5 leading-relaxed">
                            {isCustomerPending 
                              ? "Este cliente solicitó registrarse por primera vez. Completa su información para aprobarlo."
                              : "No existe ninguna ficha para este cliente. Regístralo para poder despachar de forma segura."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToCustomers) {
                            if (isCustomerPending && activeAssociatedCustomer) {
                              onNavigateToCustomers(
                                activeAssociatedCustomer.phone || activeAssociatedCustomer.name, 
                                'requests'
                              );
                            } else {
                              onNavigateToCustomers(
                                '', 
                                'approved', 
                                {
                                  name: selectedOrder.customerName || '',
                                  phone: selectedOrder.customerPhone || '',
                                  address: selectedOrder.notes || ''
                                }
                              );
                            }
                            setSelectedOrder(null);
                          }
                        }}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <span>{isCustomerPending ? "Ver Solicitud y Aprobar" : "Registrar y Activar Cliente"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Productos ({selectedOrder.items.length})</h4>
                  <div className="divide-y divide-stone-50">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 py-2 text-xs">
                        <img 
                          src={item.image} 
                          alt="" 
                          className="w-10 h-10 object-cover rounded-lg bg-stone-100 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-stone-900 truncate">{item.name}</p>
                          <p className="text-stone-400 font-mono text-[10px]">SKU: {item.sku || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-stone-900">${(item.price * item.quantity).toFixed(2)}</p>
                          <p className="text-stone-400 font-medium text-[10px]">{item.quantity} unidades x ${item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Logistics / Dispatch */}
                <div className="space-y-3 p-4 rounded-xl border border-stone-100">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-stone-400 flex items-center justify-between">
                    <span>Estado logístico / Despacho</span>
                    <span className="font-bold text-stone-600">{selectedOrder.dispatchStatus.toUpperCase()}</span>
                  </h4>
                  
                  {isCustomerPending || customerNotFound ? (
                    <div className="bg-stone-50 border border-stone-200 text-stone-500 rounded-xl p-3 text-[10px] sm:text-xs font-medium flex items-center gap-2">
                      <span>🔒</span>
                      <span>Debes registrar o aprobar al cliente primero para habilitar los despachos de este pedido.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'pending', label: 'Pendiente', color: 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200' },
                        { id: 'shipped', label: 'En camino', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200' },
                        { id: 'delivered', label: 'Entregado', color: 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200' }
                      ].map((step) => {
                        const isActive = selectedOrder.dispatchStatus === step.id;
                        return (
                          <button
                            key={step.id}
                            onClick={() => handleUpdateDispatch(selectedOrder.id, step.id as any)}
                            className={`py-2 px-1.5 rounded-lg text-[10px] font-bold text-center transition-all ${
                              isActive ? 'bg-stone-900 text-white border border-stone-900 shadow-sm' : step.color
                            }`}
                          >
                            {step.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Financial overview */}
                <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Resumen Financiero</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-medium">Método de registro</span>
                      <span className="font-bold capitalize text-stone-900 flex items-center gap-1">
                        <CreditCard size={12} />
                        {selectedOrder.paymentMethod === 'credit' ? 'Cuentas por cobrar (Crédito)' : selectedOrder.paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-medium">Total de orden</span>
                      <span className="font-bold text-stone-950">${selectedOrder.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600 font-semibold">Total amortizado</span>
                      <span className="font-bold text-green-700">${selectedOrder.amountPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-stone-200 pt-2 font-bold text-stone-900">
                      <span>Saldo Pendiente</span>
                      <span className={selectedOrder.total - selectedOrder.amountPaid > 0.01 ? 'text-red-500' : 'text-green-600'}>
                        ${(selectedOrder.total - selectedOrder.amountPaid).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-stone-100 bg-stone-50 flex gap-2">
                {selectedOrder.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder)}
                    className="p-3 border border-red-100 rounded-xl hover:bg-red-50 text-red-500 transition-all flex items-center justify-center gap-1"
                    title="Anular Pedido"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {selectedOrder.status !== 'completed' && selectedOrder.paymentStatus === 'paid' && selectedOrder.dispatchStatus === 'delivered' && !(isCustomerPending || customerNotFound) && (
                  <button 
                    onClick={() => handleCompleteOrder(selectedOrder.id)}
                    className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all animate-bounce"
                  >
                    <Check size={16} />
                    Completar Pedido
                  </button>
                )}

                {selectedOrder.total - selectedOrder.amountPaid > 0.01 && selectedOrder.status !== 'cancelled' && !(isCustomerPending || customerNotFound) && (
                  <button 
                    onClick={() => setIsPaying(true)}
                    className="flex-1 py-3 px-4 bg-stone-900 hover:bg-primary text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Landmark size={16} />
                    Aplicar Pago / Abono
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Paying Modal Dialog */}
      <AnimatePresence>
        {isPaying && selectedOrder && (
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <motion.form 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleRecordPayment}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <h3 className="font-serif font-bold text-stone-900 text-base">Registrar Pago</h3>
                <button type="button" onClick={() => setIsPaying(false)} className="p-1 hover:bg-stone-50 rounded-full text-stone-400">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Monto total:</span>
                  <span className="font-bold text-stone-900">${selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Saldo pendiente:</span>
                  <span className="font-bold text-red-500">${(selectedOrder.total - selectedOrder.amountPaid).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Monto a Abonar</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedOrder.total - selectedOrder.amountPaid}
                    required
                    placeholder="Monto"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-100 rounded-xl bg-stone-50 focus:bg-white focus:ring-2 focus:ring-primary/20 text-sm font-bold outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setPayAmount((selectedOrder.total - selectedOrder.amountPaid).toFixed(2))}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Pagar Saldo Completo
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Método de Pago</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'transfer', label: 'Transf.' },
                      { id: 'deposit', label: 'Depós.' },
                      { id: 'cash', label: 'Efectivo' },
                      { id: 'card', label: 'Tarjeta' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id as any)}
                        className={`py-1.5 rounded-lg text-[10px] font-semibold text-center border transition-all ${
                          payMethod === m.id 
                            ? 'bg-stone-900 border-stone-900 text-white' 
                            : 'bg-stone-50 text-stone-600 border-stone-100 hover:bg-stone-100'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(payMethod === 'transfer' || payMethod === 'deposit') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Banco Emisor</label>
                      <input
                        type="text"
                        placeholder="Ej. BCP, Pichincha"
                        value={payBank}
                        onChange={e => setPayBank(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-100 rounded-xl bg-stone-50 focus:bg-white text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">N° Referencia</label>
                      <input
                        type="text"
                        placeholder="N° operación"
                        value={payReference}
                        onChange={e => setPayReference(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-100 rounded-xl bg-stone-50 focus:bg-white text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Notas / Observación</label>
                  <textarea
                    rows={2}
                    placeholder="Notas adicionales sobre el depósito o transferencia"
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-100 rounded-xl bg-stone-50 focus:bg-white text-xs outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsPaying(false)}
                  className="flex-1 py-2 font-bold text-stone-500 hover:bg-stone-100 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="flex-[2] py-2 bg-stone-900 hover:bg-primary font-bold text-white rounded-xl text-xs disabled:opacity-50"
                >
                  {isSubmittingPayment ? 'Registrando...' : 'Confirmar Abono'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Order Creation slide/overlay */}
      <AnimatePresence>
        {isCreatingOrder && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.form 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onSubmit={handleCreateOrder}
              className="bg-white w-full max-w-2xl max-h-[92vh] sm:max-h-[95vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 flex-shrink-0">
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900">Registrar Nuevo Pedido</h3>
                  <p className="text-stone-400 text-[10px] sm:text-xs">Usa esta ventana para registrar ventas directamente.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsCreatingOrder(false)}
                  className="p-2 hover:bg-stone-50 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* Step 1: Customer info */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-stone-400 tracking-wider uppercase">1. Información del Cliente</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 font-bold uppercase block">Asociar Cliente</label>
                      <select
                        value={selectedCustomer}
                        onChange={e => setSelectedCustomer(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-100 rounded-xl bg-stone-50 text-xs font-semibold text-stone-700 outline-none"
                      >
                        <option value="">Cliente Casual (Sin guardar)</option>
                        <option value="new">+ Crear un Nuevo Cliente</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    {selectedCustomer === 'new' && (
                      <div className="space-y-2 p-3 bg-stone-50 rounded-xl border border-stone-100 col-span-1 sm:col-span-2">
                        <p className="text-[10px] font-bold text-stone-400 uppercase">Detalles del Nuevo Cliente</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Nombre del cliente"
                            value={newCustomerName}
                            onChange={e => setNewCustomerName(e.target.value)}
                            className="px-3 py-2 border border-stone-200 rounded-lg text-xs outline-none bg-white font-medium"
                          />
                          <input
                            type="text"
                            placeholder="WhatsApp / Teléfono"
                            value={newCustomerPhone}
                            onChange={e => setNewCustomerPhone(e.target.value)}
                            className="px-3 py-2 border border-stone-200 rounded-lg text-xs outline-none bg-white font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: Choose Products */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-stone-400 tracking-wider uppercase">2. Seleccionar Pulseras</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-stone-50 rounded-xl border border-stone-100">
                    {products.filter(p => p.status !== 'inactive').map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => addManualItem(prod)}
                        disabled={prod.stock <= 0}
                        className="flex items-center gap-2 p-1.5 bg-white border border-stone-100 rounded-lg text-left active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        <img src={prod.image} className="w-8 h-8 rounded object-cover" alt="" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-stone-850 truncate">{prod.name}</p>
                          <p className="text-[9px] text-stone-400 font-bold">${prod.price.toFixed(2)} (Stock: {prod.stock})</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Selected Items details */}
                  {orderItems.length > 0 && (
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 divide-y divide-stone-100">
                      <p className="text-[10px] font-bold text-stone-400 tracking-wider uppercase mb-2">Artículos Seleccionados</p>
                      {orderItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2 text-xs">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-stone-800 truncate">{item.product.name}</p>
                            <p className="text-stone-400 text-[9px]">${item.product.price.toFixed(2)} c/u</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max={item.product.stock}
                              value={item.quantity}
                              onChange={e => changeManualItemQty(item.product.id, parseInt(e.target.value) || 1)}
                              className="w-12 text-center py-0.5 border border-stone-150 bg-white rounded text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeManualItem(item.product.id)}
                              className="text-red-500 p-1 hover:bg-stone-100 rounded"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 3: Payment Type & Method */}
                <div className="space-y-4 pt-3 border-t border-stone-100">
                  <h4 className="text-[10px] font-bold text-stone-400 tracking-wider uppercase">3. Forma de Pago y Créditos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-stone-400 font-bold uppercase block">Método de Venta</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'cash', label: 'Efectivo' },
                          { id: 'transfer', label: 'Transf.' },
                          { id: 'card', label: 'Tarj.' },
                          { id: 'credit', label: 'Con Crédito (Cobrar)' }
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setOrderPaymentMethod(m.id as any);
                              if (m.id !== 'credit') {
                                setOrderPaidAmount(manualSubtotal.toString());
                              } else {
                                setOrderPaidAmount('0');
                              }
                            }}
                            className={`py-2 rounded-lg text-[10px] font-bold text-center border transition-all ${
                              orderPaymentMethod === m.id 
                                ? 'bg-stone-900 border-stone-900 text-white' 
                                : 'bg-stone-50 text-stone-600 border-stone-105 hover:bg-stone-100'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-stone-400 font-bold uppercase block">Monto Pagado Hoy</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Monto"
                        max={manualSubtotal}
                        value={orderPaidAmount}
                        onChange={e => setOrderPaidAmount(e.target.value)}
                        className="w-full px-3 py-1.5 border border-stone-100 rounded-xl bg-stone-50 focus:bg-white text-xs font-bold outline-none"
                      />
                      <div className="text-[10px] text-stone-500 font-semibold">
                        Suma del pedido: <span className="font-bold text-stone-900">${manualSubtotal.toFixed(2)}</span>
                        {orderPaymentMethod === 'credit' && (
                          <span className="block text-red-500 mt-0.5">Pendiente por cobrar: ${(manualSubtotal - (parseFloat(orderPaidAmount) || 0)).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-6 border-t border-stone-100 bg-stone-50 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreatingOrder(false)}
                  className="flex-1 py-3 border border-stone-200 text-stone-500 rounded-xl font-bold transition-colors text-xs"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder || orderItems.length === 0}
                  className="flex-[2] py-3 bg-stone-900 hover:bg-primary text-white rounded-xl font-bold transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
                >
                  {isSubmittingOrder ? <RefreshCw className="animate-spin" size={14} /> : <Check size={16} />}
                  Confirmar y Guardar Pedido
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
