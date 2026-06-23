import React from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MerchantDashboard from './MerchantDashboard';
import InventoryManager from './InventoryManager';
import OrdersManager from './OrdersManager';
import PurchasesManager from './PurchasesManager';
import ReceivablesManager from './ReceivablesManager';
import CustomersManager from './CustomersManager';
import CompaniesManager from './CompaniesManager';
import UsersManager from './UsersManager';
import ErrorLogsManager from './ErrorLogsManager';
import LogisticsManager from './LogisticsManager';
import SettingsManager from './SettingsManager';
import SystemUpdatesManager from './SystemUpdatesManager';
import { Product, Company } from '../types';
import { Bell, CloudAlert, Building, Check, Copy, Sparkles } from 'lucide-react';
import { getOfflineFallbackActive, setOfflineFallbackActive, OFFLINE_CHANGE_EVENT } from '../lib/offlineDb';
import { latestSystemUpdate } from '../data/systemUpdates';

const SELECTED_COMPANY_STORAGE_KEY = 'switchshop_selected_company_id';
const ACTIVE_TAB_STORAGE_KEY = 'switchshop_merchant_active_tab';
const SEEN_SYSTEM_UPDATE_STORAGE_KEY = 'switchshop_seen_system_update_id';
const COMMON_TABS = ['dashboard', 'inventory', 'purchases', 'orders', 'logistics', 'receivables', 'customers', 'updates', 'settings'];
const SYSTEM_TABS = ['companies', 'system-company', 'system-users', 'system-error-logs'];
const SUPER_ADMIN_TABS = [...COMMON_TABS, ...SYSTEM_TABS];

function getDefaultActiveTab(isSuperAdmin: boolean) {
  return isSuperAdmin ? 'companies' : 'dashboard';
}

function getInitialActiveTab(isSuperAdmin: boolean) {
  const storedTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
  const allowedTabs = isSuperAdmin ? SUPER_ADMIN_TABS : COMMON_TABS;
  return storedTab && allowedTabs.includes(storedTab) ? storedTab : getDefaultActiveTab(isSuperAdmin);
}

interface MerchantViewProps {
  products: Product[];
  onLogout: () => void;
  onSwitchToCatalog: (company?: Company | null) => void;
  userCompany?: Company | null;
  companies: Company[];
  isSuperAdmin?: boolean;
}

const MerchantView: React.FC<MerchantViewProps> = ({ 
  products, 
  onLogout, 
  onSwitchToCatalog,
  userCompany = null,
  companies = [],
  isSuperAdmin = false
}) => {
  const [activeTab, setActiveTab] = React.useState(() => getInitialActiveTab(isSuperAdmin));
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isOfflineMode, setIsOfflineMode] = React.useState(getOfflineFallbackActive());

  // Redirection states from orders details to customer registration/approval
  const [customerDefaultTab, setCustomerDefaultTab] = React.useState<'approved' | 'requests'>('approved');
  const [initialCustomerSearch, setInitialCustomerSearch] = React.useState('');
  const [prefilledCustomer, setPrefilledCustomer] = React.useState<{ name: string; phone: string; address?: string } | null>(null);

  // Derive list of companies to display in superadmin dropdown
  const filteredCompaniesForSelect = React.useMemo(() => {
    const realComps = companies.filter(c => c.id !== 'comp-default');
    return realComps.length > 0 ? realComps : companies;
  }, [companies]);

  // Dropdown filter selected by the user
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>(() => {
    const storedCompanyId = window.localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
    if (storedCompanyId) return storedCompanyId;

    const realComps = companies.filter(c => c.id !== 'comp-default');
    const initialList = realComps.length > 0 ? realComps : companies;
    return initialList.length > 0 ? initialList[0].id : 'comp-default';
  });
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [seenSystemUpdateId, setSeenSystemUpdateId] = React.useState(() => {
    return window.localStorage.getItem(SEEN_SYSTEM_UPDATE_STORAGE_KEY) || '';
  });
  const hasUnreadSystemUpdates = Boolean(latestSystemUpdate && seenSystemUpdateId !== latestSystemUpdate.id);

  const markSystemUpdatesSeen = React.useCallback(() => {
    if (!latestSystemUpdate) return;
    window.localStorage.setItem(SEEN_SYSTEM_UPDATE_STORAGE_KEY, latestSystemUpdate.id);
    setSeenSystemUpdateId(latestSystemUpdate.id);
  }, []);

  // Sync selectedCompanyId when companies list loaded/updated asynchronously
  React.useEffect(() => {
    if (isSuperAdmin) {
      const realComps = companies.filter(c => c.id !== 'comp-default');
      const list = realComps.length > 0 ? realComps : companies;
      if (list.length > 0) {
        const exists = list.some(c => c.id === selectedCompanyId);
        if (!exists || selectedCompanyId === 'all') {
          setSelectedCompanyId(list[0].id);
          window.localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, list[0].id);
        }
      } else {
        setSelectedCompanyId('comp-default');
        window.localStorage.removeItem(SELECTED_COMPANY_STORAGE_KEY);
      }
    }
  }, [companies, isSuperAdmin, selectedCompanyId]);

  React.useEffect(() => {
    if (isSuperAdmin && selectedCompanyId && selectedCompanyId !== 'comp-default' && selectedCompanyId !== 'all') {
      window.localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, selectedCompanyId);
    }
  }, [isSuperAdmin, selectedCompanyId]);

  React.useEffect(() => {
    if (activeTab) {
      window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  React.useEffect(() => {
    const allowedTabs = isSuperAdmin ? SUPER_ADMIN_TABS : COMMON_TABS;
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(getDefaultActiveTab(isSuperAdmin));
    }
  }, [activeTab, isSuperAdmin]);

  // Derive active companyId
  const currentCompanyId = isSuperAdmin ? selectedCompanyId : (userCompany?.id || 'comp-default');
  const currentCompany = React.useMemo(() => {
    if (isSuperAdmin) {
      return companies.find(c => c.id === currentCompanyId) || null;
    }

    return userCompany;
  }, [companies, currentCompanyId, isSuperAdmin, userCompany]);
  const handleSwitchToCatalog = () => onSwitchToCatalog(currentCompany);

  const handleCopyClientUrl = () => {
    if (!userCompany) return;
    const slugify = (text: string): string => {
      return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // splits accented letters into components
        .replace(/[\u0300-\u036f]/g, '') // remove accent descriptors
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    };
    const subruta = slugify(userCompany.storeName);
    const origin = window.location.origin;
    const shareUrl = `${origin}/tienda/${subruta}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {
      const fallbackUrl = `${origin}/?tienda=${subruta}`;
      navigator.clipboard.writeText(fallbackUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    });
  };

  React.useEffect(() => {
    const handleOfflineChange = () => {
      setIsOfflineMode(getOfflineFallbackActive());
    };
    window.addEventListener(OFFLINE_CHANGE_EVENT, handleOfflineChange);
    return () => window.removeEventListener(OFFLINE_CHANGE_EVENT, handleOfflineChange);
  }, []);

  return (
    <div className="flex flex-col md:flex-row bg-stone-50 min-h-screen pb-20 md:pb-0 font-sans">
      
      {/* Mobile-only Top Action Bar */}
      <div className="md:hidden flex items-center justify-between px-5 py-3 bg-white border-b border-stone-100 sticky top-0 z-30 shadow-xs">
        <h1 className="text-base font-serif font-bold text-stone-900">
          Manager<span className="text-primary text-[#8b5a2b]">.</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('updates');
              markSystemUpdatesSeen();
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/60 bg-stone-50 text-stone-600 transition-all hover:bg-stone-100 hover:text-stone-900"
            title="Ver novedades del sistema"
          >
            <Bell size={17} />
            {hasUnreadSystemUpdates && (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" />
            )}
          </button>
          <button
            onClick={handleSwitchToCatalog}
            className="text-[11px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200/60 px-3 py-1.5 rounded-xl transition-all"
          >
            <span>Ver Tienda</span>
          </button>
        </div>
      </div>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout}
        onSwitchToCatalog={handleSwitchToCatalog}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isSuperAdmin={isSuperAdmin}
        hasUnreadUpdates={hasUnreadSystemUpdates}
      />
      
      <main className="flex-1 p-3 sm:p-5 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Company Context Header / Selector */}
          <div className="bg-white border border-stone-200/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Contexto Corporativo</span>
              <div className="flex items-center gap-2 mt-1">
                <Building size={18} className="text-stone-800" />
                <h2 className="text-sm sm:text-base font-serif font-bold text-stone-900">
                  {isSuperAdmin 
                    ? 'Panel de Super Administrador' 
                    : (userCompany?.storeName || 'SwitchShop Matriz')}
                </h2>
              </div>
            </div>

            {isSuperAdmin ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <span className="text-xs text-stone-500 font-medium whitespace-nowrap self-center">Empresa Activa (Super Admin):</span>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="bg-stone-50 border border-stone-200 text-stone-800 hover:border-stone-450 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all cursor-pointer"
                >
                  {filteredCompaniesForSelect.map(c => (
                    <option key={c.id} value={c.id}>{c.storeName}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5 text-xs font-bold text-stone-700">
                  🏷️ Tienda Asociada: {userCompany?.storeName || 'SwitchShop Matriz'}
                </div>
                {userCompany && (
                  <button
                    onClick={handleCopyClientUrl}
                    className={`px-3.5 py-2.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 active:scale-95 transition-all ${
                      copiedLink 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
                        : 'bg-stone-900 border-stone-900 text-white hover:bg-stone-850 shadow-sm'
                    }`}
                    title="Copiar el enlace de tu tienda exclusiva para enviarla a tus clientes"
                  >
                    {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar URL Cliente'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Resilient Merchant Alert Banner */}
          {isOfflineMode && (
            <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-amber-800 gap-3 font-medium shadow-sm animate-in fade-in duration-300">
              <span className="flex items-start gap-2.5">
                <CloudAlert size={18} className="text-amber-600 animate-pulse shrink-0 mt-0.5" />
                <span>
                  <strong>Modo Demo Local Activo:</strong> Se detectó que tu base de datos de Firebase está inaccesible (restricción de permisos o límites de cuenta). La app guardará ventas, abonos, clientes e inventario en el almacenamiento local de este navegador para que pruebes todo libremente.
                </span>
              </span>
              <button
                onClick={() => setOfflineFallbackActive(false)}
                className="bg-amber-600/15 hover:bg-amber-600/25 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0 uppercase tracking-widest"
              >
                Intentar Nube
              </button>
            </div>
          )}

          {hasUnreadSystemUpdates && latestSystemUpdate && activeTab !== 'updates' && (
            <div className="rounded-xl border border-primary/20 bg-white p-4 shadow-sm sm:rounded-2xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-start gap-3 text-sm text-stone-700">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles size={18} />
                  </span>
                  <span>
                    <strong className="block text-stone-950">Hay nuevas mejoras disponibles: {latestSystemUpdate.title}</strong>
                    <span className="text-xs leading-5 text-stone-500">{latestSystemUpdate.summary}</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('updates');
                    markSystemUpdatesSeen();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-stone-800"
                >
                  <Bell size={14} />
                  Ver novedades
                </button>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && <MerchantDashboard onNavigate={setActiveTab} companyId={currentCompanyId} />}
          {activeTab === 'inventory' && <InventoryManager products={products} companyId={currentCompanyId} />}
          {activeTab === 'purchases' && <PurchasesManager products={products} companyId={currentCompanyId} />}
          {activeTab === 'orders' && (
            <OrdersManager 
              products={products} 
              companyId={currentCompanyId} 
              onNavigateToCustomers={(search, tab, prefill) => {
                setInitialCustomerSearch(search);
                setCustomerDefaultTab(tab);
                setPrefilledCustomer(prefill || null);
                setActiveTab('customers');
              }}
            />
          )}
          {activeTab === 'receivables' && <ReceivablesManager companyId={currentCompanyId} />}
          {activeTab === 'logistics' && <LogisticsManager companyId={currentCompanyId} />}
          {activeTab === 'updates' && (
            <SystemUpdatesManager
              hasUnreadUpdates={hasUnreadSystemUpdates}
              onMarkUpdatesSeen={markSystemUpdatesSeen}
            />
          )}
          {activeTab === 'customers' && (
            <CustomersManager 
              companyId={currentCompanyId} 
              defaultTab={customerDefaultTab}
              initialSearch={initialCustomerSearch}
              onClearSearch={() => setInitialCustomerSearch('')}
              prefillCustomer={prefilledCustomer}
              onClearPrefill={() => setPrefilledCustomer(null)}
            />
          )}
          {(activeTab === 'companies' || activeTab === 'system-company') && isSuperAdmin && <CompaniesManager companies={companies} />}
          {activeTab === 'system-users' && isSuperAdmin && <UsersManager companies={companies} />}
          {activeTab === 'system-error-logs' && isSuperAdmin && <ErrorLogsManager />}
          {activeTab === 'settings' && <SettingsManager companyId={currentCompanyId} />}
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        isSuperAdmin={isSuperAdmin}
        hasUnreadUpdates={hasUnreadSystemUpdates}
      />
    </div>
  );
};

export default MerchantView;
