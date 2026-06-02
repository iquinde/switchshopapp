import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  History, 
  Users, 
  Settings, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Store,
  Receipt,
  Building2
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onSwitchToCatalog: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isSuperAdmin?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  onLogout,
  onSwitchToCatalog,
  isCollapsed,
  setIsCollapsed,
  isSuperAdmin = false
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'orders', label: 'Pedidos', icon: History },
    { id: 'receivables', label: 'Cartera', icon: Receipt },
    { id: 'customers', label: 'Clientes', icon: Users },
    ...(isSuperAdmin ? [{ id: 'companies', label: 'Empresas', icon: Building2 }] : []),
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      className="hidden md:flex h-screen bg-white border-r border-stone-100 flex-col transition-all duration-300 sticky top-0"
    >
      {/* Branding */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-serif font-bold text-stone-900"
          >
            Manager<span className="text-primary">.</span>
          </motion.h1>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-stone-50 rounded-lg text-stone-400 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center p-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-primary/10 text-primary font-bold' 
                : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <item.icon size={22} className={activeTab === item.id ? 'text-primary' : 'text-stone-400'} />
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-3 text-sm"
              >
                {item.label}
              </motion.span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 space-y-2 border-t border-stone-50">
        <button
          onClick={onSwitchToCatalog}
          className="w-full flex items-center p-3 text-stone-500 hover:bg-stone-50 rounded-xl transition-all"
        >
          <Store size={22} className="text-stone-400" />
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-3 text-sm"
            >
              Ver Tienda
            </motion.span>
          )}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center p-3 text-stone-500 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
        >
          <LogOut size={22} />
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-3 text-sm"
            >
              Cerrar Sesión
            </motion.span>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
