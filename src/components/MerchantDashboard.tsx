import React from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  OFFLINE_CHANGE_EVENT,
  getOfflineFallbackActive,
  offlineDb,
} from '../lib/offlineDb';
import { Customer, Order, Product, Purchase } from '../types';
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Landmark,
  Wallet,
  PackageCheck,
  ShoppingBag,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MerchantDashboardProps {
  onNavigate?: (tab: string) => void;
  companyId?: string;
}

type TrendMode = 'month' | 'year';

const MONTHS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const CATEGORY_COLORS = ['#0f766e', '#7c3aed', '#2563eb', '#d97706', '#be123c', '#475569'];
const PAYMENT_COLORS = ['#0f766e', '#7c3aed', '#2563eb', '#d97706', '#be123c'];

const PAYMENT_METHODS = [
  { id: 'card', label: 'Tarjeta', icon: CreditCard, color: PAYMENT_COLORS[0] },
  { id: 'transfer', label: 'Transferencia', icon: Landmark, color: PAYMENT_COLORS[1] },
  { id: 'cash', label: 'Efectivo', icon: BadgeDollarSign, color: PAYMENT_COLORS[2] },
  { id: 'credit', label: 'Credito', icon: Wallet, color: PAYMENT_COLORS[3] },
];

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const numberFmt = (value: number) => value.toLocaleString('en-US');

function getRecordDate(value: any): Date | null {
  if (!value) return null;
  const date = typeof value === 'string'
    ? new Date(value)
    : value?.seconds
      ? new Date(value.seconds * 1000)
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calcChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getOrderCost(order: Order, productCosts: Map<string, number>) {
  return (order.items || []).reduce((sum, item) => {
    const fallbackCost = productCosts.get(item.id) ?? productCosts.get((item as any).productId) ?? 0;
    const cost = item.costPrice ?? fallbackCost;
    return sum + cost * (item.quantity || 0);
  }, 0);
}

function getStatusLabel(order: Order) {
  if (order.status === 'cancelled') return 'Cancelado';
  if (order.dispatchStatus === 'delivered' || order.status === 'completed') return 'Entregado';
  if (order.dispatchStatus === 'shipped' || order.status === 'dispatched') return 'Enviado';
  return 'Pendiente';
}

function getStatusClass(order: Order) {
  if (order.status === 'cancelled') return 'bg-red-50 text-red-700 border-red-100';
  if (order.dispatchStatus === 'delivered' || order.status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (order.dispatchStatus === 'shipped' || order.status === 'dispatched') return 'bg-blue-50 text-blue-700 border-blue-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  tone: string;
}) => {
  const isPositive = change >= 0;
  return (
    <div className="rounded-2xl border border-stone-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
          <Icon size={23} />
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
          isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-stone-400">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-stone-950">{value}</p>
      <p className="mt-2 text-[11px] font-medium text-stone-500">vs periodo anterior</p>
    </div>
  );
};

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
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
  const [trendMode, setTrendMode] = React.useState<TrendMode>('year');
  const [isOffline, setIsOffline] = React.useState<boolean>(getOfflineFallbackActive());

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
        setProducts(offlineDb.getProducts());
        setOrders(offlineDb.getOrders());
        setCustomers(offlineDb.getCustomers());
        setPurchases(offlineDb.getPurchases());
        return;
      }

      try {
        const scoped = companyId && companyId !== 'all' && companyId !== 'comp-default';
        const productsQuery = scoped ? query(collection(db, 'products'), where('companyId', '==', companyId)) : collection(db, 'products');
        const ordersQuery = scoped ? query(collection(db, 'orders'), where('companyId', '==', companyId)) : collection(db, 'orders');
        const customersQuery = scoped ? query(collection(db, 'customers'), where('companyId', '==', companyId)) : collection(db, 'customers');
        const purchasesQuery = scoped ? query(collection(db, 'purchases'), where('companyId', '==', companyId)) : collection(db, 'purchases');

        unsubProducts = onSnapshot(productsQuery, snapshot => {
          if (active) setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        }, () => active && setProducts(offlineDb.getProducts()));

        unsubOrders = onSnapshot(ordersQuery, snapshot => {
          if (active) setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
        }, () => active && setOrders(offlineDb.getOrders()));

        unsubCustomers = onSnapshot(customersQuery, snapshot => {
          if (active) setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
        }, () => active && setCustomers(offlineDb.getCustomers()));

        unsubPurchases = onSnapshot(purchasesQuery, snapshot => {
          if (active) setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
        }, () => active && setPurchases(offlineDb.getPurchases()));
      } catch (error) {
        console.warn('Dashboard fallback to local data', error);
        if (active) {
          setProducts(offlineDb.getProducts());
          setOrders(offlineDb.getOrders());
          setCustomers(offlineDb.getCustomers());
          setPurchases(offlineDb.getPurchases());
        }
      }
    };

    loadRealtimeData();
    window.addEventListener(OFFLINE_CHANGE_EVENT, loadRealtimeData);

    return () => {
      active = false;
      window.removeEventListener(OFFLINE_CHANGE_EVENT, loadRealtimeData);
      if (unsubProducts) unsubProducts();
      if (unsubOrders) unsubOrders();
      if (unsubCustomers) unsubCustomers();
      if (unsubPurchases) unsubPurchases();
    };
  }, [companyId]);

  const companyProducts = React.useMemo(() => products.filter(p => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !p.companyId || p.companyId === 'comp-default';
    return p.companyId === companyId;
  }), [companyId, products]);

  const companyOrders = React.useMemo(() => orders.filter(order => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !order.companyId || order.companyId === 'comp-default';
    return order.companyId === companyId;
  }), [companyId, orders]);

  const companyCustomers = React.useMemo(() => customers.filter(customer => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !customer.companyId || customer.companyId === 'comp-default';
    return customer.companyId === companyId;
  }), [companyId, customers]);

  const companyPurchases = React.useMemo(() => purchases.filter(purchase => {
    if (!companyId || companyId === 'all') return true;
    if (companyId === 'comp-default') return !purchase.companyId || purchase.companyId === 'comp-default';
    return purchase.companyId === companyId;
  }), [companyId, purchases]);

  const productCosts = React.useMemo(() => {
    const costs = new Map<string, number>();
    companyProducts.forEach(product => costs.set(product.id, product.costPrice || 0));
    return costs;
  }, [companyProducts]);

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
  }, [companyOrders, companyPurchases]);

  const activeOrders = React.useMemo(() => {
    return companyOrders.filter(order => order.status !== 'cancelled');
  }, [companyOrders]);

  const periodOrders = React.useMemo(() => {
    return activeOrders.filter(order => {
      const date = getRecordDate(order.createdAt);
      return date && date.getFullYear() === selectedYear;
    });
  }, [activeOrders, selectedYear]);

  const previousYearOrders = React.useMemo(() => {
    return activeOrders.filter(order => {
      const date = getRecordDate(order.createdAt);
      return date && date.getFullYear() === selectedYear - 1;
    });
  }, [activeOrders, selectedYear]);

  const periodCustomerCount = React.useMemo(() => {
    return companyCustomers.filter(customer => {
      const date = getRecordDate((customer as any).createdAt || customer.lastPurchase);
      return !date || date.getFullYear() <= selectedYear;
    }).length;
  }, [companyCustomers, selectedYear]);

  const previousCustomerCount = React.useMemo(() => {
    return companyCustomers.filter(customer => {
      const date = getRecordDate((customer as any).createdAt || customer.lastPurchase);
      return !date || date.getFullYear() <= selectedYear - 1;
    }).length;
  }, [companyCustomers, selectedYear]);

  const totalSales = periodOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const previousSales = previousYearOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const netProfit = periodOrders.reduce((sum, order) => sum + (order.total || 0) - getOrderCost(order, productCosts), 0);
  const previousNetProfit = previousYearOrders.reduce((sum, order) => sum + (order.total || 0) - getOrderCost(order, productCosts), 0);

  const trendData = React.useMemo(() => {
    if (trendMode === 'year') {
      const now = new Date();
      const lastVisibleMonth = selectedYear === now.getFullYear() ? now.getMonth() : 11;

      return MONTHS.slice(0, lastVisibleMonth + 1).map((month, monthIndex) => {
        const sales = activeOrders.reduce((sum, order) => {
          const date = getRecordDate(order.createdAt);
          return date && date.getFullYear() === selectedYear && date.getMonth() === monthIndex
            ? sum + (order.total || 0)
            : sum;
        }, 0);
        return { name: month, sales };
      });
    }

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const sales = activeOrders.reduce((sum, order) => {
        const date = getRecordDate(order.createdAt);
        return date && date.getFullYear() === selectedYear && date.getMonth() === selectedMonth && date.getDate() === day
          ? sum + (order.total || 0)
          : sum;
      }, 0);
      return { name: String(day), sales };
    });
  }, [activeOrders, selectedMonth, selectedYear, trendMode]);

  const categoryData = React.useMemo(() => {
    const totals = new Map<string, number>();
    periodOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const category = item.category || 'Sin categoria';
        totals.set(category, (totals.get(category) || 0) + (item.price || 0) * (item.quantity || 0));
      });
    });

    const grandTotal = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(totals.entries())
      .map(([name, value], index) => ({
        name,
        value,
        percent: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [periodOrders]);

  const paymentMethodData = React.useMemo(() => {
    const totals = new Map<string, number>();
    periodOrders.forEach(order => {
      const method = order.paymentMethod || 'cash';
      totals.set(method, (totals.get(method) || 0) + (order.total || 0));
    });

    const grandTotal = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
    return PAYMENT_METHODS.map(method => {
      const value = totals.get(method.id) || 0;
      return {
        ...method,
        value,
        percent: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
      };
    }).filter(method => method.value > 0);
  }, [periodOrders]);

  const latestOrders = React.useMemo(() => {
    return [...companyOrders]
      .sort((a, b) => (getRecordDate(b.createdAt)?.getTime() || 0) - (getRecordDate(a.createdAt)?.getTime() || 0))
      .slice(0, 6);
  }, [companyOrders]);

  const periodDateLabel = trendMode === 'year'
    ? `01/01/${selectedYear} al ${selectedYear === new Date().getFullYear() ? new Date().toLocaleDateString('es-EC') : `31/12/${selectedYear}`}`
    : `01/${String(selectedMonth + 1).padStart(2, '0')}/${selectedYear} al ${String(new Date(selectedYear, selectedMonth + 1, 0).getDate()).padStart(2, '0')}/${String(selectedMonth + 1).padStart(2, '0')}/${selectedYear}`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-0">
        <div>
          <h2 className="font-serif text-2xl font-bold leading-tight text-stone-950 sm:text-3xl">Hola, {capitalizedName}</h2>
          <p className="mt-1 text-sm text-stone-500">Indicadores comerciales, tendencia y ultimos pedidos del negocio.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOffline && (
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              Modo local
            </span>
          )}
          <select
            value={selectedYear}
            onChange={event => setSelectedYear(Number(event.target.value))}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-800 transition-all focus:outline-none focus:ring-1 focus:ring-stone-900"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Ventas Totales"
          value={money(totalSales)}
          change={calcChange(totalSales, previousSales)}
          icon={BadgeDollarSign}
          tone="bg-emerald-50 text-emerald-700"
        />
        <MetricCard
          title="Utilidad Neta"
          value={money(netProfit)}
          change={calcChange(netProfit, previousNetProfit)}
          icon={PackageCheck}
          tone="bg-indigo-50 text-indigo-700"
        />
        <MetricCard
          title="Pedidos"
          value={numberFmt(periodOrders.length)}
          change={calcChange(periodOrders.length, previousYearOrders.length)}
          icon={ShoppingBag}
          tone="bg-sky-50 text-sky-700"
        />
        <MetricCard
          title="Clientes"
          value={numberFmt(periodCustomerCount)}
          change={calcChange(periodCustomerCount, previousCustomerCount)}
          icon={Users}
          tone="bg-amber-50 text-amber-700"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200/70 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-950">Ventas por Periodo</h3>
              <p className="mt-1 text-xs text-stone-500">Filtra la tendencia por mes o por ano.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={trendMode}
                onChange={event => setTrendMode(event.target.value as TrendMode)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-900"
              >
                <option value="year">Anual</option>
                <option value="month">Mensual</option>
              </select>
              {trendMode === 'month' && (
                <select
                  value={selectedMonth}
                  onChange={event => setSelectedMonth(Number(event.target.value))}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-900"
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardSalesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} tickFormatter={(value) => `$${Number(value) / 1000}K`} />
                <Tooltip formatter={(value) => [money(Number(value)), 'Ventas']} contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" stroke="#0f766e" strokeWidth={3} fill="url(#dashboardSalesGradient)" dot={{ r: 3, fill: '#0f766e' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200/70 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-stone-950">Ventas por Categoria</h3>
              <p className="mt-1 text-xs text-stone-500">Participacion por valor vendido.</p>
            </div>
          </div>

          {categoryData.length === 0 ? (
            <div className="flex h-[270px] items-center justify-center rounded-2xl bg-stone-50 text-sm font-semibold text-stone-400">
              Sin ventas por categoria
            </div>
          ) : (
            <div className="grid items-center gap-4 md:grid-cols-[230px_1fr]">
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={2}>
                      {categoryData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [money(Number(value)), 'Ventas']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {categoryData.map(item => (
                  <div key={item.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-semibold text-stone-700">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-bold text-stone-900">{item.percent.toFixed(0)}%</span>
                    <span className="text-xs font-semibold text-stone-500">{money(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-stone-200/70 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 className="text-base font-bold text-stone-950">Ultimos Pedidos</h3>
            <p className="mt-1 text-xs text-stone-500">Mostrando datos del {periodDateLabel}</p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-stone-800"
            >
              <ClipboardList size={15} />
              Ver pedidos
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-widest text-stone-400">
              <tr>
                <th className="px-4 py-3 font-bold sm:px-5">Pedido</th>
                <th className="px-4 py-3 font-bold">Cliente</th>
                <th className="px-4 py-3 font-bold">Fecha</th>
                <th className="px-4 py-3 font-bold">Total</th>
                <th className="px-4 py-3 font-bold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {latestOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm font-semibold text-stone-400">Aun no hay pedidos registrados.</td>
                </tr>
              ) : latestOrders.map(order => {
                const date = getRecordDate(order.createdAt);
                return (
                  <tr key={order.id} className="text-stone-700">
                    <td className="px-4 py-3 font-bold text-stone-950 sm:px-5">#{order.id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-3 font-semibold">{order.customerName || 'Consumidor final'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                        <CalendarDays size={13} />
                        {date ? date.toLocaleDateString('es-EC') : 'Sin fecha'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-950">{money(order.total || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClass(order)}`}>
                        {getStatusLabel(order)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      
      <section className="rounded-2xl border border-stone-200/70 bg-white p-4 shadow-sm sm:p-5 lg:max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-950">Ventas por Metodo de Pago</h3>
            <p className="mt-1 text-xs text-stone-500">Distribucion de ventas cobradas por forma de pago.</p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
            >
              Ver todos
            </button>
          )}
        </div>

        {paymentMethodData.length === 0 ? (
          <div className="flex h-[190px] items-center justify-center rounded-2xl bg-stone-50 text-sm font-semibold text-stone-400">
            Sin ventas por metodo de pago
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethodData.map(method => {
              const Icon = method.icon;
              return (
                <div key={method.id} className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1fr_96px_96px] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-50" style={{ color: method.color }}>
                      <Icon size={18} />
                    </span>
                    <span className="truncate text-sm font-bold text-stone-700">{method.label}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(method.percent, 4)}%`, backgroundColor: method.color }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs font-bold text-stone-700">{method.percent.toFixed(0)}%</span>
                  </div>
                  <span className="row-start-1 text-right text-xs font-bold text-stone-500 sm:row-auto">{money(method.value)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default MerchantDashboard;
