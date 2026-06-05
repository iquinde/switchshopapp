import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  PackagePlus,
  History, 
  Users, 
  Settings,
  Receipt,
  Building2,
  Truck
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSuperAdmin?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, isSuperAdmin = false }) => {
  const isSystemActive = ['companies', 'system-company', 'system-users', 'system-error-logs'].includes(activeTab);
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'inventory', label: 'Stock', icon: Package },
    { id: 'purchases', label: 'Compras', icon: PackagePlus },
    { id: 'orders', label: 'Ventas', icon: History },
    { id: 'logistics', label: 'Envios', icon: Truck },
    { id: 'receivables', label: 'Cobros', icon: Receipt },
    ...(isSuperAdmin ? [{ id: 'system-company', label: 'Sistema', icon: Building2 }] : [{ id: 'customers', label: 'Clientes', icon: Users }]),
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-stone-100 flex justify-around items-center px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+4px)] md:hidden z-50">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col items-center flex-1 py-1 rounded-xl transition-all ${
              activeTab === item.id || (item.id === 'system-company' && isSystemActive)
              ? 'text-primary' 
              : 'text-stone-400'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === item.id || (item.id === 'system-company' && isSystemActive) ? 'bg-primary/5' : ''}`}>
            <item.icon size={18} />
          </div>
          <span className="text-[8px] mt-0.5 font-semibold tracking-tight leading-tight max-w-full truncate">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default BottomNav;
