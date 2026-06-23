import React from 'react';
import {
  Bell,
  Building2,
  FileWarning,
  History,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Package,
  PackagePlus,
  Receipt,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  X,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isSuperAdmin?: boolean;
  hasUnreadUpdates?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: boolean;
}

const systemTabs = ['companies', 'system-company', 'system-users', 'system-error-logs'];

const extraItems: NavItem[] = [
  { id: 'purchases', label: 'Compras', icon: PackagePlus },
  { id: 'logistics', label: 'Logistica', icon: Truck },
  { id: 'receivables', label: 'Cartera', icon: Receipt },
  { id: 'updates', label: 'Novedades', icon: Bell },
  { id: 'settings', label: 'Configuracion', icon: Settings },
];

const systemItems: NavItem[] = [
  { id: 'system-company', label: 'Empresa', icon: Building2 },
  { id: 'system-users', label: 'Usuarios', icon: ShieldCheck },
  { id: 'system-error-logs', label: 'Log de Errores', icon: FileWarning },
];

const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  isSuperAdmin = false,
  hasUnreadUpdates = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [menuSource, setMenuSource] = React.useState<'more' | 'system'>('more');
  const isSystemActive = systemTabs.includes(activeTab);
  const isMoreActive = extraItems.some(item => item.id === activeTab) || (isSuperAdmin && activeTab === 'customers');

  const primaryItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'orders', label: 'Pedidos', icon: History },
  ];

  const handleSelect = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const toggleMenu = (source: 'more' | 'system') => {
    setMenuSource(source);
    setIsMenuOpen(open => (open && menuSource === source ? false : true));
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    onLogout();
  };

  const renderPrimaryButton = (item: NavItem) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleSelect(item.id)}
        className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-all ${
          isActive ? 'text-primary' : 'text-stone-400'
        }`}
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
          <Icon size={20} />
        </span>
        <span className="max-w-full truncate text-[9px] font-bold leading-tight">{item.label}</span>
      </button>
    );
  };

  const renderSheetButton = (item: NavItem) => {
    const isActive = activeTab === item.id || (activeTab === 'companies' && item.id === 'system-company');
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleSelect(item.id)}
        className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
          isActive
            ? 'border-primary/25 bg-primary/10 text-primary'
            : 'border-stone-100 bg-white text-stone-600 hover:border-stone-200 hover:bg-stone-50'
        }`}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100">
          <Icon size={19} />
          {item.badge && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />}
        </span>
        <span className="min-w-0 flex-1 text-sm font-bold">{item.label}</span>
      </button>
    );
  };

  const sheetGeneralItems: NavItem[] = [
    ...(isSuperAdmin ? [{ id: 'customers', label: 'Clientes', icon: Users }] : []),
    ...extraItems.map(item => item.id === 'updates' ? { ...item, badge: hasUnreadUpdates } : item),
  ];

  return (
    <>
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-stone-950/25 md:hidden" onClick={() => setIsMenuOpen(false)} />
      )}

      <div
        className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+64px)] z-50 mx-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-2xl shadow-stone-900/20 transition-all md:hidden ${
          isMenuOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Manager</span>
            <h3 className="text-base font-bold text-stone-950">{menuSource === 'system' ? 'Sistema' : 'Mas opciones'}</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-500"
            title="Cerrar menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
          <section className="space-y-2">
            <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">Modulos</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {sheetGeneralItems.map(renderSheetButton)}
            </div>
          </section>

          {isSuperAdmin && (
            <section className="space-y-2">
              <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">Sistema</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {systemItems.map(renderSheetButton)}
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-left text-red-600 transition-all hover:bg-red-100"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-500">
              <LogOut size={19} />
            </span>
            <span className="min-w-0 flex-1 text-sm font-bold">Cerrar sesion</span>
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around gap-1 border-t border-stone-100 bg-white/90 px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)] backdrop-blur-lg md:hidden">
        {primaryItems.map(renderPrimaryButton)}

        {isSuperAdmin ? (
          <button
            type="button"
            onClick={() => toggleMenu('system')}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-all ${
              isSystemActive || (isMenuOpen && menuSource === 'system') ? 'text-primary' : 'text-stone-400'
            }`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${isSystemActive || (isMenuOpen && menuSource === 'system') ? 'bg-primary/10' : ''}`}>
              <Building2 size={20} />
            </span>
            <span className="max-w-full truncate text-[9px] font-bold leading-tight">Sistema</span>
          </button>
        ) : (
          renderPrimaryButton({ id: 'customers', label: 'Clientes', icon: Users })
        )}

        <button
          type="button"
          onClick={() => toggleMenu('more')}
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-all ${
            isMoreActive || (isMenuOpen && menuSource === 'more') ? 'text-primary' : 'text-stone-400'
          }`}
        >
          <span className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${isMoreActive || (isMenuOpen && menuSource === 'more') ? 'bg-primary/10' : ''}`}>
            <MoreHorizontal size={20} />
            {hasUnreadUpdates && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" />}
          </span>
          <span className="max-w-full truncate text-[9px] font-bold leading-tight">Mas</span>
        </button>
      </div>
    </>
  );
};

export default BottomNav;
