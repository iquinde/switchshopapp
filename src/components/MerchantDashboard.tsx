import React from 'react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { 
  offlineDb, 
  getOfflineFallbackActive, 
  OFFLINE_CHANGE_EVENT 
} from '../lib/offlineDb';
import { Product, Customer, Order, Purchase } from '../types';
import { 
  TrendingUp, 
  ShoppingBag, 
  PackagePlus, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface MerchantDashboardProps {
  onNavigate?: (tab: string) => void;
  companyId?: string; // Active companyId ('all', 'comp-default', 'comp-1', etc.)
}

const StatsCard = ({ title, value, change, icon: Icon, color }: any) => (
  <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-2 sm:mb-4">
      <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${color}`}>
        <Icon size={20} className="text-white sm:w-5 sm:h-5" />
      </div>
      {change !== undefined && change !== null && (
        <div className={`flex items-center text-[10px] sm:text-xs font-bold ${change >= 0 ? 'text-green-600 bg-green-50 px-2 py-0.5 rounded-full' : 'text-stone-500 bg-stone-50 px-2 py-0.5 rounded-full'}`}>
          {change >= 0 ? <ArrowUpRight size={12} className="sm:w-3.5 sm:h-3.5 mr-0.5" /> : null}
          {change >= 0 ? `+${change}%` : `${change}%`}
        </div>
      )}
    </div>
    <h3 className="text-stone-500 text-[10px] sm:text-xs font-bold mb-1 sm:mb-1.5 uppercase tracking-widest">{title}</h3>
    <p className="text-lg sm:text-2xl font-bold text-stone-900 tracking-tight">{value}</p>
  </div>
);

const MerchantDashboard: React.FC<MerchantDashboardProps> = ({ onNavigate, companyId = 'comp-default' }) => {
  const user = auth.currentUser;
  const rawName = user?.displayName || user?.email?.split('@')[0] || '';
  const firstName = rawName ? rawName.trim().split(' ')[0] : 'de nuevo';
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const [products, setProducts] = React.useState<Product[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [isOffline, setIsOffline] = React.useState<boolean>(getOfflineFallbackActive());
  const [alertPercentage, setAlertPercentage] = React.useState<number>(20);

  React.useEffect(() => {
    const loadSettings = () => {
      try {
        const s = offlineDb.getSettings();
        setAlertPercentage(s.stockAlertPercentage ?? 20);
      } catch (err) {
        console.warn('Failed to load settings in MerchantDashboard:', err);
      }
    };
    loadSettings();
    window.addEventListener('switchshop_offline_change', loadSettings);
    return () => window.removeEventListener('switchshop_offline_change', loadSettings);
  }, []);

  React.useEffect(() => {
    let active = true;
    let unsubProducts: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;
    let unsubCustomers: (() => void) | null = null;
    let unsubPurchases: (() => void) | null = null;

    const loadRealtimeData = () => {
      const mode = getOfflineFallbackActive();
      setIsOffline(mode);

      if (mode) {
        // Fetch offline lists
        setProducts(offlineDb.getProducts());
        setOrders(offlineDb.getOrders());
        setCustomers(offlineDb.getCustomers());
        setPurchases(offlineDb.getPurchases());
      } else {
        // Fetch from Firebase with fallback compatibility
        try {
          const productsQuery = companyId && companyId !== 'all' && companyId !== 'comp-default'
            ? query(collection(db, 'products'), where('companyId', '==', companyId))
            : collection(db, 'products');
          const ordersQuery = companyId && companyId !== 'all' && companyId !== 'comp-default'
            ? query(collection(db, 'orders'), where('companyId', '==', companyId))
            : collection(db, 'orders');
          const customersQuery = companyId && companyId !== 'all' && companyId !== 'comp-default'
            ? query(collection(db, 'customers'), where('companyId', '==', companyId))
            : collection(db, 'customers');
          const purchasesQuery = companyId && companyId !== 'all' && companyId !== 'comp-default'
            ? query(collection(db, 'purchases'), where('companyId', '==', companyId))
            : collection(db, 'purchases');

          unsubProducts = onSnapshot(productsQuery, (snapshot) => {
            if (!active) return;
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(items);
          }, (err) => {
            console.warn("Retrying/falling back to local because Firestore is starting up or restricted", err);
            if (active) {
              setProducts(offlineDb.getProducts());
            }
          });

          unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
            if (!active) return;
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            setOrders(items);
          }, (err) => {
            if (active) {
              setOrders(offlineDb.getOrders());
            }
          });

          unsubCustomers = onSnapshot(customersQuery, (snapshot) => {
            if (!active) return;
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setCustomers(items);
          }, (err) => {
            if (active) {
              setCustomers(offlineDb.getCustomers());
            }
          });

          unsubPurchases = onSnapshot(purchasesQuery, (snapshot) => {
            if (!active) return;
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
            setPurchases(items);
          }, (err) => {
            console.warn("Purchases listener failed in dashboard", err);
            if (active) {
              setPurchases([]);
            }
          });
        } catch (e) {
          console.error("Firestore initialization failed. Using offline db.", e);
          if (active) {
            setProducts(offlineDb.getProducts());
            setOrders(offlineDb.getOrders());
            setCustomers(offlineDb.getCustomers());
            setPurchases(offlineDb.getPurchases());
          }
        }
      }
    };

    loadRealtimeData();

    // Re-check periodically or on global offline trigger events
    const handleLocalUpdate = () => {
      loadRealtimeData();
    };
    window.addEventListener(OFFLINE_CHANGE_EVENT, handleLocalUpdate);

    return () => {
      active = false;
      window.removeEventListener(OFFLINE_CHANGE_EVENT, handleLocalUpdate);
      if (unsubProducts) unsubProducts();
      if (unsubOrders) unsubOrders();
      if (unsubCustomers) unsubCustomers();
      if (unsubPurchases) unsubPurchases();
    };
  }, [companyId]);

  const getRecordDate = React.useCallback((value: any): Date | null => {
    if (!value) return null;
    const date = typeof value === 'string'
      ? new Date(value)
      : value?.seconds
        ? new Date(value.seconds * 1000)
        : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }, []);

  // Pre-filter data streams based on corporate company context
  const companyProducts = React.useMemo(() => {
    return products.filter(p => {
      if (!companyId || companyId === 'all') return true;
      if (companyId === 'comp-default') return !p.companyId || p.companyId === 'comp-default';
      return p.companyId === companyId;
    });
  }, [products, companyId]);

  const companyOrders = React.useMemo(() => {
    return orders.filter(o => {
      if (!companyId || companyId === 'all') return true;
      if (companyId === 'comp-default') return !o.companyId || o.companyId === 'comp-default';
      return o.companyId === companyId;
    });
  }, [orders, companyId]);

  const companyCustomers = React.useMemo(() => {
    return customers.filter(c => {
      if (!companyId || companyId === 'all') return true;
      if (companyId === 'comp-default') return !c.companyId || c.companyId === 'comp-default';
      return c.companyId === companyId;
    });
  }, [customers, companyId]);

  const companyPurchases = React.useMemo(() => {
    return purchases.filter(p => {
      if (!companyId || companyId === 'all') return true;
      if (companyId === 'comp-default') return !p.companyId || p.companyId === 'comp-default';
      return p.companyId === companyId;
    });
  }, [purchases, companyId]);

  const availableYears = React.useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    companyOrders.forEach(order => {
      const date = getRecordDate(order.createdAt);
      if (date) years.add(date.getFullYear());
    });
    companyPurchases.forEach(purchase => {
      const date = getRecordDate(purchase.date || purchase.createdAt);
      if (date) years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [companyOrders, companyPurchases, getRecordDate]);

  // Compute stats metrics dynamically
  const yearOrders = React.useMemo(() => {
    return companyOrders.filter(order => {
      const date = getRecordDate(order.createdAt);
      return date && date.getFullYear() === selectedYear;
    });
  }, [companyOrders, getRecordDate, selectedYear]);

  const yearPurchases = React.useMemo(() => {
    return companyPurchases.filter(purchase => {
      const date = getRecordDate(purchase.date || purchase.createdAt);
      return date && date.getFullYear() === selectedYear;
    });
  }, [companyPurchases, getRecordDate, selectedYear]);

  const activeOrders = React.useMemo(() => yearOrders.filter(o => o.status !== 'cancelled'), [yearOrders]);
  
  const totalSales = React.useMemo(() => {
    return activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [activeOrders]);

  const cashCollected = React.useMemo(() => {
    // Current register till corresponds to amount actually paid vs outstanding receivables/debts
    return activeOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
  }, [activeOrders]);

  const totalOrdersCount = React.useMemo(() => yearOrders.length, [yearOrders]);
  const totalPurchases = React.useMemo(() => {
    return yearPurchases.reduce((sum, purchase) => sum + (purchase.total || 0), 0);
  }, [yearPurchases]);
  const totalCustomersCount = React.useMemo(() => companyCustomers.length, [companyCustomers]);

  // Aggregate daily stats for the weekly performance chart
  const weekChartData = React.useMemo(() => {
    const days = [
      { name: 'Lun', sales: 0, orders: 0 },
      { name: 'Mar', sales: 0, orders: 0 },
      { name: 'Mie', sales: 0, orders: 0 },
      { name: 'Jue', sales: 0, orders: 0 },
      { name: 'Vie', sales: 0, orders: 0 },
      { name: 'Sab', sales: 0, orders: 0 },
      { name: 'Dom', sales: 0, orders: 0 },
    ];

    activeOrders.forEach(order => {
      let dateObj: Date;
      if (!order.createdAt) {
        return;
      } else if (typeof order.createdAt === 'string') {
        dateObj = new Date(order.createdAt);
      } else if (order.createdAt?.seconds) {
        dateObj = new Date(order.createdAt.seconds * 1000);
      } else if (order.createdAt instanceof Date) {
        dateObj = order.createdAt;
      } else {
        dateObj = new Date(order.createdAt);
      }

      if (isNaN(dateObj.getTime())) return;

      const rawDay = dateObj.getDay(); // 0 Sunday, 1 Monday...
      const dayIndex = rawDay === 0 ? 6 : rawDay - 1; // Map Sunday (0) to index 6
      
      days[dayIndex].sales += order.total || 0;
      days[dayIndex].orders += 1;
    });

    return days;
  }, [activeOrders]);

  // Find products with lowest stock in relation to their minimum stock
  const lowStockThresholdItems = React.useMemo(() => {
    return [...companyProducts]
      .filter(p => p.status === 'active')
      .map(p => {
        const minVal = p.minStock ?? 10;
        const threshold = minVal * (1 + alertPercentage / 100);
        const isCritical = (p.stock || 0) <= minVal;
        const isLow = (p.stock || 0) <= threshold;
        const ratio = (p.stock || 0) / minVal;
        return {
          name: p.name,
          stock: p.stock || 0,
          minStock: minVal,
          threshold,
          isCritical,
          isLow,
          ratio
        };
      })
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 3);
  }, [companyProducts, alertPercentage]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-end px-1 sm:px-0">
        <div>
          <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900 leading-tight">Hola, {capitalizedName}</h2>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">Aquí tienes un resumen de tu negocio por año.</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="bg-white border border-stone-200 text-stone-800 hover:border-stone-400 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all cursor-pointer"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <p className="text-[9px] sm:text-xs uppercase tracking-widest text-stone-400 font-bold mb-0.5 sm:mb-1 flex items-center justify-end gap-1">
            <span>Cierre Recibido</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          </p>
          <p className="text-sm sm:text-lg font-bold text-primary font-mono tracking-tight">
            ${cashCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatsCard 
          title="Ventas Totales" 
          value={`$${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          change={totalSales > 0 ? 15 : 0} 
          icon={TrendingUp} 
          color="bg-stone-900" 
        />
        <StatsCard 
          title="Pedidos" 
          value={totalOrdersCount.toString()} 
          change={totalOrdersCount > 0 ? 10 : 0} 
          icon={ShoppingBag} 
          color="bg-primary" 
        />
        <StatsCard 
          title="Compras" 
          value={`$${totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={PackagePlus} 
          color="bg-stone-800" 
        />
        <StatsCard 
          title="Clientes" 
          value={totalCustomersCount.toString()} 
          change={totalCustomersCount > 0 ? 5 : 0} 
          icon={Users} 
          color="bg-amber-600" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif">Rendimiento Semanal</h3>
            <span className="bg-stone-50 rounded-xl text-[10px] sm:text-xs font-bold text-stone-600 px-3 py-1.5 border border-stone-150 flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" />
              Sincronizado
            </span>
          </div>
          <div className="h-[200px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekChartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f7" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#78716c', fontSize: 10, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#78716c', fontSize: 10, fontWeight: 500 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ventas']}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #f5f5f4', 
                    boxShadow: '0 4px 12px -1px rgb(0 0 0 / 0.05)',
                    fontSize: '11px',
                    fontFamily: 'sans-serif'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#d97706" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Tracker */}
        <div className="bg-stone-900 p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-white/5 pb-3">
              <h3 className="text-base sm:text-lg font-bold font-serif">Control de Stock</h3>
              <span className="text-[10px] text-stone-400 font-bold bg-white/5 px-2 py-0.5 rounded-md">Margen: +{alertPercentage}%</span>
            </div>
            
            {lowStockThresholdItems.length === 0 ? (
              <p className="text-stone-400 text-xs py-4 text-center">No hay productos en inventario.</p>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {lowStockThresholdItems.map((item, idx) => {
                  const maxPercentVal = Math.max(item.minStock * (1 + alertPercentage / 100), item.minStock);
                  const stockPercentage = Math.min((item.stock / maxPercentVal) * 100, 100);
                  
                  let badgeText = '';
                  let badgeColors = 'text-stone-400';
                  let barColor = 'bg-primary';

                  if (item.isCritical) {
                    badgeText = 'Crítico';
                    badgeColors = 'text-red-400 font-extrabold';
                    barColor = 'bg-red-500';
                  } else if (item.isLow) {
                    badgeText = 'Bajo';
                    badgeColors = 'text-amber-400 font-extrabold';
                    barColor = 'bg-amber-500';
                  } else {
                    badgeText = 'Normal';
                    badgeColors = 'text-green-400 font-bold';
                    barColor = 'bg-green-500';
                  }

                  return (
                    <div key={idx} className="space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between items-start text-[11px] sm:text-sm">
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-medium text-stone-200 truncate max-w-[120px] sm:max-w-[150px]">{item.name}</span>
                          <span className={`text-[9px] uppercase tracking-wider font-bold mt-0.5 ${badgeColors}`}>
                            {badgeText}
                          </span>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className={`font-mono font-bold ${item.isCritical ? 'text-red-400' : item.isLow ? 'text-amber-400' : 'text-stone-300'}`}>
                            {item.stock} u.
                          </span>
                          <span className="text-[9px] text-stone-500">
                            Min: {item.minStock}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.max(stockPercentage, 6)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {onNavigate && (
            <button 
              onClick={() => onNavigate('inventory')}
              className="w-full mt-6 sm:mt-8 py-3 bg-white text-stone-900 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:bg-stone-100 transition-colors"
            >
              Gestionar Stock
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboard;
