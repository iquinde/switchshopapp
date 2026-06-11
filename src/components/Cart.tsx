import React from 'react';
import { X, Plus, Minus, ShoppingBag, ArrowLeft, CheckCircle, Smartphone, User, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, Order, Customer } from '../types';
import { auth, db, logClientError } from '../firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import ProductImageFallback from './ProductImageFallback';
import { isRealProductImage } from '../lib/productImages';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClearCart?: () => void;
  activeCompanyId?: string;
  activeCustomerId?: string | null;
  requireCustomerAuth?: boolean;
  onRequireCustomerAuth?: () => void;
}

export default function Cart({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemove,
  onClearCart,
  activeCompanyId,
  activeCustomerId,
  requireCustomerAuth = false,
  onRequireCustomerAuth
}: CartProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const belongsToTargetCompany = (customer: Customer, targetCompanyId?: string) => {
    if (!targetCompanyId || targetCompanyId === 'comp-default') {
      return !customer.companyId || customer.companyId === 'comp-default';
    }

    return customer.companyId === targetCompanyId;
  };

  // States for checkout progress
  const [isCheckingOut, setIsCheckingOut] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Checkout inputs
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [cedula, setCedula] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [notes, setNotes] = React.useState('');
  
  // Created order feedback
  const [orderId, setOrderId] = React.useState('');

  // Reset checkout states when cart opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsCheckingOut(false);
      setIsSuccess(false);
      setName('');
      setPhone('');
      setCedula('');
      setAddress('');
      setNotes('');
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isCheckingOut || name.trim()) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setName(currentUser.displayName || currentUser.email?.split('@')[0] || '');
  }, [isCheckingOut, name]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (requireCustomerAuth && !activeCustomerId) {
      onRequireCustomerAuth?.();
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const targetCompanyId = activeCompanyId || items[0]?.companyId || undefined;

      // 1. Search for customer by cedula or phone number to link or register
      let finalCustomerId = activeCustomerId || '';
      let finalCustomerName = name.trim() || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Cliente';
      let finalCustomerPhone = phone.trim();
      let finalCustomerCedula = cedula.trim();

      let existingCustomerDoc: any = null;

      const canLookupExistingCustomers = false;

      // Match by Cedula first. Public storefront buyers create pending customer requests instead.
      if (canLookupExistingCustomers && finalCustomerCedula) {
        const qCed = query(collection(db, 'customers'), where('cedula', '==', finalCustomerCedula));
        const snapCed = await getDocs(qCed);
        if (!snapCed.empty) {
          existingCustomerDoc = snapCed.docs.find(customerDoc => 
            belongsToTargetCompany(customerDoc.data() as Customer, targetCompanyId)
          ) || null;
        }
      }

      // Match by Phone if not found by Cedula
      if (canLookupExistingCustomers && !existingCustomerDoc && finalCustomerPhone) {
        const qPhone = query(collection(db, 'customers'), where('phone', '==', finalCustomerPhone));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
          existingCustomerDoc = snapPhone.docs.find(customerDoc => 
            belongsToTargetCompany(customerDoc.data() as Customer, targetCompanyId)
          ) || null;
        }
      }

      if (activeCustomerId) {
        const customerUpdateData: any = {
          name: finalCustomerName || auth.currentUser?.displayName || 'Cliente',
          address: address.trim() || '',
          lastPurchase: serverTimestamp(),
        };

        if (auth.currentUser?.email) customerUpdateData.email = auth.currentUser.email;
        if (finalCustomerPhone) customerUpdateData.phone = finalCustomerPhone;
        if (finalCustomerCedula) customerUpdateData.cedula = finalCustomerCedula;
        if (targetCompanyId) customerUpdateData.companyId = targetCompanyId;

        batch.update(doc(db, 'customers', activeCustomerId), customerUpdateData);
      } else if (existingCustomerDoc) {
        // Linked to existing client profile
        finalCustomerId = existingCustomerDoc.id;
        const currentData = existingCustomerDoc.data() as Customer;
        
        // Pick whichever name is longest/more complete to handle "Israel" -> "Israel Quinde"
        const finalMergedName = (finalCustomerName.length > (currentData.name || '').length) 
          ? finalCustomerName 
          : (currentData.name || finalCustomerName);

        // Keep updating final variables so Order stores the most updated/correct info
        finalCustomerName = finalMergedName;
        if (!finalCustomerPhone && currentData.phone) {
          finalCustomerPhone = currentData.phone;
        }
        if (!finalCustomerCedula && currentData.cedula) {
          finalCustomerCedula = currentData.cedula || '';
        }

        const nextDebt = currentData.currentDebt || 0;
        const nextSpent = (currentData.totalSpent || 0) + total;
        
        const updateData: any = {
          name: finalMergedName,
          address: address.trim() || currentData.address || '',
          totalSpent: nextSpent,
          currentDebt: nextDebt,
          lastPurchase: serverTimestamp(),
        };

        // If the database profile does not have a phone or cedula yet, save the one entered now
        if (finalCustomerPhone && !currentData.phone) {
          updateData.phone = finalCustomerPhone;
        }
        if (finalCustomerCedula && !currentData.cedula) {
          updateData.cedula = finalCustomerCedula;
        }

        if (!currentData.companyId && targetCompanyId) {
          updateData.companyId = targetCompanyId;
        }
        batch.update(doc(db, 'customers', finalCustomerId), updateData);
      } else if (finalCustomerPhone || finalCustomerCedula) {
        // New customer with telephone or ID
        const customerRef = doc(collection(db, 'customers'));
        finalCustomerId = customerRef.id;

        const newCustomerData: any = {
          id: finalCustomerId,
          name: finalCustomerName,
          address: address.trim() || '',
          totalSpent: total,
          currentDebt: 0,
          createdAt: serverTimestamp(),
          lastPurchase: serverTimestamp(),
          status: 'pending' // Enters as a request for first-time clients
        };

        if (finalCustomerPhone) newCustomerData.phone = finalCustomerPhone;
        if (finalCustomerCedula) newCustomerData.cedula = finalCustomerCedula;
        if (targetCompanyId) newCustomerData.companyId = targetCompanyId;

        batch.set(customerRef, newCustomerData);
      } else {
        // If no telephone or ID is inputted, we search if "Cliente General" exists or register as anonymous
        finalCustomerName = name.trim() || 'Cliente Casual';
      }

      // 2. Register Order
      const orderRef = doc(collection(db, 'orders'));
      const orderData: any = {
        id: orderRef.id,
        items: items,
        subtotal: total,
        total: total,
        status: 'pending',
        dispatchStatus: 'pending',
        paymentMethod: 'cash',
        paymentStatus: 'unpaid',
        amountPaid: 0,
        customerName: finalCustomerName,
        createdAt: serverTimestamp(),
      };

      if (finalCustomerId) orderData.customerId = finalCustomerId;
      if (finalCustomerPhone) orderData.customerPhone = finalCustomerPhone;
      if (finalCustomerCedula) orderData.customerCedula = finalCustomerCedula;
      if (notes.trim()) orderData.notes = notes.trim();
      if (targetCompanyId) orderData.companyId = targetCompanyId;

      batch.set(orderRef, orderData);

      // 3. Subtract stock for each item
      for (const item of items) {
        const productRef = doc(db, 'products', item.id);
        const nextStock = Math.max(0, item.stock - item.quantity);
        batch.update(productRef, { stock: nextStock });
      }

      await batch.commit();
      
      setOrderId(orderRef.id);
      setIsSuccess(true);
      
      if (onClearCart) {
        onClearCart();
      }
    } catch (err) {
      await logClientError(err, {
        component: 'Cart',
        action: 'checkout_submit',
        targetCompanyId: activeCompanyId || items[0]?.companyId || null,
        itemsCount: items.length,
        productIds: items.map(item => item.id),
        total,
        hasCustomerPhone: Boolean(phone.trim()),
        hasCustomerCedula: Boolean(cedula.trim()),
      });
      alert('Error al registrar pedido: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col pb-safe-bottom"
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center border-b border-stone-100 flex-shrink-0">
              <div className="flex items-center space-x-2">
                {isCheckingOut && !isSuccess ? (
                  <button 
                    onClick={() => setIsCheckingOut(false)}
                    className="p-1 hover:bg-stone-100 rounded-full text-stone-600 transition-colors mr-1"
                  >
                    <ArrowLeft size={20} />
                  </button>
                ) : (
                  <ShoppingBag className="text-primary" />
                )}
                <h2 className="text-xl font-serif font-bold">
                  {isSuccess ? '¡Pedido Exitoso!' : isCheckingOut ? 'Completar Pedido' : 'Tu Carrito'}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Content Switcher */}
            {isSuccess ? (
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                >
                  <CheckCircle size={84} className="text-green-500 mx-auto" strokeWidth={1.5} />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold text-stone-900">¡Pedido Registrado con Éxito!</h3>
                  <p className="text-stone-500 text-sm">El pedido se ha enviado como pendiente a nuestro sistema de ventas.</p>
                  <p className="text-stone-400 font-mono text-xs mt-3 bg-stone-50 py-1.5 px-3 rounded-lg border border-stone-100 uppercase inline-block">
                    Pedido N° {orderId.slice(-6).toUpperCase()}
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <button 
                    onClick={onClose}
                    className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-xl hover:bg-primary transition-all text-sm"
                  >
                    Continuar Navegando
                  </button>
                </div>
              </div>
            ) : isCheckingOut ? (
              // Checkout form
              <form onSubmit={handleCheckoutSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-xs">
                    <p className="font-serif font-bold text-stone-900 text-sm mb-1">Resumen del Pedido</p>
                    <p className="text-stone-500">Cantidad de artículos: {items.reduce((s, i) => s + i.quantity, 0)}</p>
                    <div className="flex justify-between font-bold text-stone-900 mt-2 text-base border-t border-stone-200/60 pt-2">
                      <span>Total de Orden:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Nombre del Comprador</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input
                          type="text"
                          required
                          placeholder="Nombre Completo"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-stone-50 text-xs text-stone-850 rounded-xl border border-stone-100 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Teléfono / WhatsApp</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input
                          type="text"
                          required
                          placeholder=" WhatsApp"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-stone-50 text-xs text-stone-850 rounded-xl border border-stone-100 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                        />
                      </div>
                      <p className="text-[9px] text-stone-400">Permite asociar balances y despachos a su cuenta cliente.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Cédula / RUC / ID (Opcional)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-mono font-bold">id</span>
                        <input
                          type="text"
                          placeholder="N° de Cédula de Identidad"
                          value={cedula}
                          onChange={e => setCedula(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-stone-50 text-xs text-stone-850 rounded-xl border border-stone-100 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                        />
                      </div>
                      <p className="text-[9px] text-stone-400">Valida tu cuenta o agrupa tus compras con tu cédula nacional.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Dirección de Despacho (Envío)</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input
                          type="text"
                          required
                          placeholder="Calle, ciudad o sector de entrega"
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-stone-50 text-xs text-stone-850 rounded-xl border border-stone-100 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Instrucciones o Notas Especiales</label>
                      <textarea
                        rows={2}
                        placeholder="Ej. Dejar en recepción, medidas especiales de muñeca..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-stone-50 border border-stone-100 text-xs rounded-xl outline-none resize-none focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-stone-100 bg-stone-50 flex-shrink-0">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-stone-900 hover:bg-primary text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 text-sm"
                  >
                    {isSubmitting ? 'Procesando tu pedido...' : 'Confirmar e Iniciar Pedido'}
                  </button>
                </div>
              </form>
            ) : (
              // Items display inside Cart
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
                      <ShoppingBag size={64} strokeWidth={1} />
                      <p className="text-lg">Tu carrito está vacío</p>
                      <button 
                        onClick={onClose}
                        className="text-primary font-medium hover:underline"
                      >
                        Empezar a comprar
                      </button>
                    </div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="flex space-x-4">
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          {isRealProductImage(item.image) ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <ProductImageFallback compact />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-medium text-stone-900">{item.name}</h3>
                            <button onClick={() => onRemove(item.id)} className="text-stone-400 hover:text-red-500">
                              <X size={16} />
                            </button>
                          </div>
                          <p className="text-sm text-stone-500 mb-2">${item.price.toFixed(2)}</p>
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="p-1 border border-stone-200 rounded hover:bg-stone-50"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-medium">{item.quantity}</span>
                            <button 
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="p-1 border border-stone-200 rounded hover:bg-stone-50"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {items.length > 0 && (
                  <div className="p-6 border-t border-stone-100 bg-stone-50 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-stone-600">Subtotal</span>
                      <span className="text-xl font-bold text-stone-900">${total.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (requireCustomerAuth && !activeCustomerId) {
                          onRequireCustomerAuth?.();
                          return;
                        }
                        setIsCheckingOut(true);
                      }}
                      className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-primary transition-colors text-sm"
                    >
                      Finalizar Compra
                    </button>
                    <p className="text-center text-xs text-stone-400 mt-4">
                      Envío gratis en pedidos superiores a $50
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
