import React from 'react';
import { ShoppingBag, Menu, X, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  user: any;
  onLogin: () => void;
  onLogout: () => void;
  storeName?: string;
}

export default function Navbar({ cartCount, onCartClick, user, onLogin, onLogout, storeName = 'SwitchShop' }: NavbarProps) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white border-b border-stone-100 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-serif font-bold tracking-tight text-stone-900">
              {storeName}<span className="text-primary">.</span>
            </h1>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-sm font-medium text-stone-600 hover:text-primary transition-colors">Inicio</a>
            <a href="#productos" className="text-sm font-medium text-stone-600 hover:text-primary transition-colors">Colección</a>
            <a href="#" className="text-sm font-medium text-stone-600 hover:text-primary transition-colors">Nosotros</a>
            <a href="#" className="text-sm font-medium text-stone-600 hover:text-primary transition-colors">Contacto</a>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="hidden md:flex items-center space-x-2 bg-stone-50 border border-stone-100 py-1 pl-3 pr-2 rounded-full text-xs animate-in fade-in duration-300">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-5 h-5 rounded-full shadow-inner" referrerPolicy="no-referrer" />
                ) : (
                  <span className="w-5 h-5 bg-stone-200 rounded-full flex items-center justify-center font-bold text-[10px] text-stone-600">
                    {user.displayName?.charAt(0) || 'U'}
                  </span>
                )}
                <span className="font-semibold text-stone-700">
                  ¡Hola, {user.displayName?.trim().split(' ')[0] || 'Tú'}!
                </span>
                <button 
                  onClick={onLogout}
                  className="text-[10px] uppercase tracking-wider font-bold text-stone-400 hover:text-red-500 transition-colors ml-1 pl-2 border-l border-stone-200/60"
                  title="Cerrar Sesión"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="hidden md:inline-flex items-center space-x-1.5 text-xs font-bold text-stone-500 hover:text-primary transition-colors py-1.5 px-3 hover:bg-stone-50 rounded-full"
              >
                <span>Entrar</span>
              </button>
            )}

            <button className="p-2 text-stone-600 hover:text-primary transition-colors">
              <Heart size={20} />
            </button>
            <button 
              onClick={onCartClick}
              className="relative p-2 text-stone-600 hover:text-primary transition-colors"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
            <button 
               className="md:hidden p-2 text-stone-600 font-medium"
               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-stone-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              <a href="#" className="block px-3 py-2 text-base font-medium text-stone-600 hover:text-primary">Inicio</a>
              <a href="#productos" className="block px-3 py-2 text-base font-medium text-stone-600 hover:text-primary">Colección</a>
              <a href="#" className="block px-3 py-2 text-base font-medium text-stone-600 hover:text-primary">Nosotros</a>
              <a href="#" className="block px-3 py-2 text-base font-medium text-stone-600 hover:text-primary">Contacto</a>

              <div className="border-t border-stone-100 pt-4 mt-4 px-3">
                {user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full shadow-inner" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center font-bold text-xs text-stone-600">
                          {user.displayName?.charAt(0) || 'U'}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-bold text-stone-800">¡Hola, {user.displayName || 'Tú'}!</p>
                        <p className="text-xs text-stone-400">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={onLogout}
                      className="text-xs font-bold text-red-500 hover:underline"
                    >
                      Salir
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onLogin}
                    className="w-full bg-stone-900 text-white font-bold py-2.5 rounded-xl text-center text-sm hover:bg-stone-800 transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
