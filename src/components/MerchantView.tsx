import React from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MerchantDashboard from './MerchantDashboard';
import InventoryManager from './InventoryManager';
import OrdersManager from './OrdersManager';
import ReceivablesManager from './ReceivablesManager';
import CustomersManager from './CustomersManager';
import CompaniesManager from './CompaniesManager';
import SettingsManager from './SettingsManager';
import { Product, Company } from '../types';
import { CloudAlert, Building, Check, Copy } from 'lucide-react';
import { getOfflineFallbackActive, setOfflineFallbackActive, OFFLINE_CHANGE_EVENT } from '../lib/offlineDb';

interface MerchantViewProps {
  products: Product[];
  onLogout: () => void;
  onSwitchToCatalog: () => void;
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
  const [activeTab, setActiveTab] = React.useState(isSuperAdmin ? 'companies' : 'dashboard');
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
    const realComps = companies.filter(c => c.id !== 'comp-default');
    const initialList = realComps.length > 0 ? realComps : companies;
    return initialList.length > 0 ? initialList[0].id : 'comp-default';
  });
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Sync selectedCompanyId when companies list loaded/updated asynchronously
  React.useEffect(() => {
    if (isSuperAdmin) {
      const realComps = companies.filter(c => c.id !== 'comp-default');
      const list = realComps.length > 0 ? realComps : companies;
      if (list.length > 0) {
        const exists = list.some(c => c.id === selectedCompanyId);
        if (!exists || selectedCompanyId === 'all') {
          setSelectedCompanyId(list[0].id);
        }
      } else {
        setSelectedCompanyId('comp-default');
      }
    }
  }, [companies, isSuperAdmin, selectedCompanyId]);

  // Derive active companyId
  const currentCompanyId = isSuperAdmin ? selectedCompanyId : (userCompany?.id || 'comp-default');

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
        <button
          onClick={onSwitchToCatalog}
          className="text-[11px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200/60 px-3 py-1.5 rounded-xl transition-all"
        >
          <span>Ver Tienda</span>
        </button>
      </div>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout}
        onSwitchToCatalog={onSwitchToCatalog}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isSuperAdmin={isSuperAdmin}
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

          {activeTab === 'dashboard' && <MerchantDashboard onNavigate={setActiveTab} companyId={currentCompanyId} />}
          {activeTab === 'inventory' && <InventoryManager products={products} companyId={currentCompanyId} />}
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
          {activeTab === 'companies' && isSuperAdmin && <CompaniesManager companies={companies} />}
          {activeTab === 'settings' && <SettingsManager companyId={currentCompanyId} />}
        </div>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} isSuperAdmin={isSuperAdmin} />
    </div>
  );
};

export default MerchantView;
