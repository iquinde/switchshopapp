import React from 'react';
import Navbar from './components/Navbar';
import Cart from './components/Cart';
import ProductDetail from './components/ProductDetail';
import MerchantView from './components/MerchantView';
import CatalogView from './components/CatalogView';
import ErrorBoundary from './components/ErrorBoundary';
import ToastHost from './components/ToastHost';
import { db, auth, googleProvider } from './firebase';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Product, CartItem, StoreSettings, Company } from './types';
import { AnimatePresence } from 'motion/react';
import { LayoutDashboard, LogIn, ShieldCheck, Store } from 'lucide-react';
import { getOfflineFallbackActive, offlineDb, setOfflineFallbackActive, OFFLINE_CHANGE_EVENT } from './lib/offlineDb';

interface LoginScreenProps {
  onLogin: () => void;
  isLoggingIn: boolean;
  loginError: string;
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    const messages: Record<string, string> = {
      'auth/unauthorized-domain': 'Este dominio no esta autorizado en Firebase Authentication. Agrega localhost y el dominio publicado en Firebase Console > Authentication > Settings > Authorized domains.',
      'auth/operation-not-allowed': 'El proveedor Google no esta habilitado en Firebase Authentication. Activalo en Firebase Console > Authentication > Sign-in method.',
      'auth/popup-closed-by-user': 'La ventana de Google se cerro antes de completar el inicio de sesion. Intenta nuevamente.',
      'auth/popup-blocked': 'El navegador bloqueo la ventana de inicio de sesion. Permite popups para esta pagina o intenta de nuevo.',
      'auth/cancelled-popup-request': 'Se cancelo una solicitud de inicio de sesion anterior. Intenta nuevamente.',
    };

    return messages[error.code] || `Firebase Auth (${error.code}): ${error.message}`;
  }

  return 'No se pudo iniciar sesion. Intentalo nuevamente o verifica tu cuenta de Google.';
}

function LoginScreen({ onLogin, isLoggingIn, loginError }: LoginScreenProps) {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-stone-950 text-white flex">
        <section className="relative hidden lg:block flex-1 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1800"
            alt="SwitchShop"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-stone-950/45" />
          <div className="relative z-10 flex h-full flex-col justify-end p-14">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">SwitchShop</p>
              <h1 className="mt-4 text-5xl font-serif font-bold leading-tight">Gestion comercial desde un solo lugar.</h1>
              <p className="mt-5 text-base leading-7 text-white/78">
                Administra tiendas, inventario, pedidos, clientes y cartera con acceso protegido para tu equipo.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen w-full items-center justify-center px-5 py-10 lg:max-w-xl lg:bg-white lg:text-stone-900">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-stone-950 shadow-sm lg:bg-stone-950 lg:text-white">
                <Store size={22} />
              </div>
              <div>
                <p className="text-xl font-serif font-bold tracking-tight">SwitchShop</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50 lg:text-stone-400">Acceso privado</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-serif font-bold tracking-tight text-white lg:text-stone-950">Iniciar sesion</h2>
                <p className="mt-3 text-sm leading-6 text-white/62 lg:text-stone-500">
                  Ingresa con tu cuenta autorizada para acceder a la tienda, panel administrativo y modulos del sistema.
                </p>
              </div>

              <button
                type="button"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-stone-950 shadow-lg shadow-black/10 transition-all hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-70 lg:bg-stone-950 lg:text-white lg:hover:bg-stone-800"
              >
                <LogIn size={18} />
                <span>{isLoggingIn ? 'Conectando...' : 'Entrar con Google'}</span>
              </button>

              {loginError && (
                <p className="rounded-lg border border-red-300/30 bg-red-500/12 px-3 py-2 text-xs font-medium text-red-100 lg:border-red-200 lg:bg-red-50 lg:text-red-700">
                  {loginError}
                </p>
              )}

              <div className="flex items-start gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-white/55 lg:border-stone-200 lg:text-stone-500">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-300 lg:text-emerald-600" />
                <p>La ruta principal esta protegida. Si tu correo no esta asociado a una empresa activa, entraras solo a las vistas permitidas para tu cuenta.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </ErrorBoundary>
  );
}

const STORE_ROUTE_PREFIX = 'tienda';
const STORE_SECTION_SLUGS = new Set(['inicio', 'productos', 'nosotros', 'contacto']);

function isStorefrontRoute() {
  const searchParams = new URLSearchParams(window.location.search);
  const hasStoreQuery = Boolean(searchParams.get('tienda') || searchParams.get('companyId') || searchParams.get('c'));
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const hashParts = window.location.hash.replace('#', '').split('/').filter(Boolean);

  return hasStoreQuery || pathParts[0] === STORE_ROUTE_PREFIX || hashParts[0] === STORE_ROUTE_PREFIX;
}

export default function App() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isMerchantMode, setIsMerchantMode] = React.useState(false);
  const [isClientStoreRoute, setIsClientStoreRoute] = React.useState(isStorefrontRoute());
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<string>('todos');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [user, setUser] = React.useState<any>(null);
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [loginError, setLoginError] = React.useState('');
  const [mobileCols, setMobileCols] = React.useState<2 | 3>(2);
  
  const [isOfflineMode, setIsOfflineMode] = React.useState(getOfflineFallbackActive());
  const [settings, setSettings] = React.useState<StoreSettings>({
    storeName: 'SwitchShop',
    heroTitle: 'Calidad y Tradición Hecha a Mano.',
    heroSubtitle: 'Descubre nuestra cuidada selección de café premium de especialidad y piezas de joyería artesanal única. Cultivados y creados con dedicación para deleitar tus sentidos.',
    heroImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000',
    footerText: 'Productos seleccionados con alma, sabor y tradición.',
  });

  const [activeCompany, setActiveCompany] = React.useState<Company | null>(null);
  const [isCompaniesLoading, setIsCompaniesLoading] = React.useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = React.useState(true);

  // Helper to slugify company shop name for clean URLs
  const slugify = (text: string): string => {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD') // splits accented letters into letter + symbol
      .replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/[^a-z0-9 -]/g, '') // remove weird chars
      .replace(/\s+/g, '-') // collapse spaces
      .replace(/-+/g, '-'); // collapse hyphens
  };

  // Parse company from URL (supports /tienda/:id/:section, /#/tienda/:id, or ?tienda=:id).
  const parseCompanyFromUrl = React.useCallback((allCompanies: Company[]) => {
    if (!allCompanies || allCompanies.length === 0) return;
    
    // 1. Query Param
    const searchParams = new URLSearchParams(window.location.search);
    const shopParam = searchParams.get('tienda') || searchParams.get('companyId') || searchParams.get('c');
    
    // 2. Hash Pattern
    const hash = window.location.hash;
    let hashParam = '';
    if (hash) {
      const cleanHash = hash.replace('#', '').trim();
      const parts = cleanHash.split('/').filter(Boolean);
      if (parts[0] === STORE_ROUTE_PREFIX) {
        hashParam = parts[1] || '';
      } else if (!STORE_SECTION_SLUGS.has(parts[0] || '')) {
        hashParam = parts[0] || '';
      }
    }
    
    // 3. Path Pattern
    const pathname = window.location.pathname;
    let pathParam = '';
    if (pathname && pathname !== '/') {
      const parts = pathname.split('/').filter(Boolean);
      if (parts[0] === STORE_ROUTE_PREFIX) {
        pathParam = parts[1] || '';
      } else if (!STORE_SECTION_SLUGS.has(parts[0] || '')) {
        pathParam = parts[0] || '';
      }
    }

    const targetVal = (shopParam || pathParam || hashParam || '').toLowerCase().trim();
    if (targetVal) {
      const found = allCompanies.find(c => 
        c.id.toLowerCase() === targetVal || 
        slugify(c.storeName) === slugify(targetVal)
      );
      if (found) {
        setActiveCompany(found);
        return;
      }
    }
    setActiveCompany(null);
  }, []);

  // Sync route
  React.useEffect(() => {
    if (companies.length > 0) {
      parseCompanyFromUrl(companies);
    }
  }, [companies, parseCompanyFromUrl]);

  React.useEffect(() => {
    const handleUrlChange = () => {
      setIsClientStoreRoute(isStorefrontRoute());
      if (companies.length > 0) {
        parseCompanyFromUrl(companies);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [companies, parseCompanyFromUrl]);

  const openMerchantManager = () => {
    setActiveCompany(null);
    setIsClientStoreRoute(false);
    setIsMerchantMode(true);
    window.history.pushState({}, '', '/');
  };

  const openCompanyStorefront = (company?: Company | null) => {
    if (!company || company.id === 'comp-default') {
      setIsMerchantMode(false);
      return;
    }

    const storePath = `/tienda/${slugify(company.storeName)}`;
    setActiveCompany(company);
    setIsClientStoreRoute(true);
    setIsMerchantMode(false);
    setSelectedProduct(null);
    setActiveCategory('todos');
    setSearchTerm('');
    window.history.pushState({}, '', storePath);
  };

  const activeSettings = React.useMemo<StoreSettings>(() => {
    if (activeCompany) {
      return {
        ...settings,
        storeName: settings.storeName || activeCompany.storeName,
        heroTitle: settings.heroTitle || activeCompany.storeName,
        heroSubtitle: settings.heroSubtitle || activeCompany.description || 'Te damos la bienvenida a nuestra tienda virtual. Descubre los mejores productos seleccionados y gestionados con dedicación.',
        footerText: settings.footerText || `Productos de ${activeCompany.storeName}. Calidad y buen servicio garantizado.`,
        supportPhone: settings.supportPhone || activeCompany.phone || undefined,
        supportEmail: settings.supportEmail || activeCompany.email || undefined,
        whatsappNumber: settings.whatsappNumber || activeCompany.whatsapp || undefined,
      };
    }
    return settings;
  }, [activeCompany, settings]);

  const companyProducts = React.useMemo(() => {
    if (activeCompany) {
      if (activeCompany.id === 'comp-default') {
        return [];
      }
      // Show products matching this company Specifically
      return products.filter(p => p.companyId === activeCompany.id);
    }
    // Filter out products belonging to the template company or with missing companyId entirely in public directory/catalog views
    return products.filter(p => p.companyId && p.companyId !== 'comp-default');
  }, [products, activeCompany]);

  const adminEmails = ['israel.quinde@gmail.com'];
  const isAdmin = user && adminEmails.includes(user.email);
  const userCompany = user ? companies.find(c => c.ownerEmail === user.email && c.status === 'active') : null;
  const isMerchant = isAdmin || !!userCompany;

  React.useEffect(() => {
    if (isClientStoreRoute) {
      setIsMerchantMode(false);
      return;
    }

    if (isMerchant) {
      setIsMerchantMode(true);
    }
  }, [isMerchant, isClientStoreRoute]);

  // Global mobile keyboard overlap / auto-scroll handler
  React.useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        // Detect if we are on a mobile/touch device or narrow viewport
        const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
        if (isMobile) {
          // A tiny timeout allows the OS virtual keyboard to complete its opening animation and resize the viewport
          setTimeout(() => {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }, 280);
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // Sync Offline state
  React.useEffect(() => {
    const handleOfflineChange = () => {
      const active = getOfflineFallbackActive();
      setIsOfflineMode(active);
      if (active) {
        setProducts(offlineDb.getProducts());
        setSettings(offlineDb.getSettings());
        setCompanies(offlineDb.getCompanies());
        setIsCompaniesLoading(false);
        setIsSettingsLoading(false);
      }
    };
    window.addEventListener(OFFLINE_CHANGE_EVENT, handleOfflineChange);
    
    // Initial load if active immediately
    if (getOfflineFallbackActive()) {
      setProducts(offlineDb.getProducts());
      setSettings(offlineDb.getSettings());
      setCompanies(offlineDb.getCompanies());
      setIsCompaniesLoading(false);
      setIsSettingsLoading(false);
    }
    
    return () => window.removeEventListener(OFFLINE_CHANGE_EVENT, handleOfflineChange);
  }, []);

  // Auth Listener
  React.useEffect(() => {
    const authTimeout = window.setTimeout(() => {
      setIsAuthReady(true);
      setIsLoggingIn(false);
      setLoginError(
        `Firebase no termino de verificar el acceso. Revisa en Authentication > Configuracion > Dominios autorizados que exista "${window.location.hostname}". Abre la app con http://localhost:3000/.`
      );
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      window.clearTimeout(authTimeout);
      setUser(currentUser);
      setIsAuthReady(true);
      setIsLoggingIn(false);
      if (currentUser) {
        setLoginError('');
      }
      // Auto switch to merchant mode if admin or company owner logs in
      if (currentUser) {
        const isUserAdmin = adminEmails.includes(currentUser.email || '');
        const comps = offlineDb.getCompanies();
        const isOwner = comps.some(c => c.ownerEmail === currentUser.email && c.status === 'active');
        if (isUserAdmin || isOwner) {
          setIsMerchantMode(true);
        }
      }
    });
    return () => {
      window.clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  // Real-time Companies Listener (with graceful offline fallback)
  React.useEffect(() => {
    if (!isAuthReady || !user) return;
    if (isOfflineMode) {
      setCompanies(offlineDb.getCompanies());
      setIsCompaniesLoading(false);
      return;
    }

    const q = query(collection(db, 'companies'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const compsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Company[];
      
      // Sort in-memory to prevent hiding older entries that might be missing 'createdAt'
      const sortedCompanies = compsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setCompanies(sortedCompanies);
      setIsCompaniesLoading(false);
    }, (error) => {
      console.warn("Firestore companies connection failed, falling back to LocalStorage:", error);
      setCompanies(offlineDb.getCompanies());
      setIsCompaniesLoading(false);
    });
    return () => unsubscribe();
  }, [isAuthReady, isOfflineMode, user]);

  // Real-time Products Listener (with graceful offline fallback)
  React.useEffect(() => {
    if (!isAuthReady || !user) return;
    if (isOfflineMode) {
      setProducts(offlineDb.getProducts());
      return;
    }

    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      
      // Sort in-memory to guarantee all products load correctly even if missing 'createdAt'
      const sortedProducts = productsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setProducts(sortedProducts);
    }, (error) => {
      console.warn("Firestore products connection failed, falling back to LocalStorage:", error);
      setOfflineFallbackActive(true);
    });
    return () => unsubscribe();
  }, [isAuthReady, isOfflineMode, user]);

  const activeCompanyIdForSettings = activeCompany ? activeCompany.id : 'store';

  // Real-time Settings Listener (with graceful offline fallback)
  React.useEffect(() => {
    if (!isAuthReady || !user) return;
    
    setIsSettingsLoading(true);

    if (isOfflineMode) {
      setSettings(offlineDb.getSettings());
      setIsSettingsLoading(false);
      return;
    }

    const docRef = doc(db, 'settings', activeCompanyIdForSettings);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as StoreSettings);
      } else {
        if (activeCompany) {
          // If no custom config is created yet for this specific company, set defaults matching its bio
          setSettings({
            storeName: activeCompany.storeName,
            heroTitle: activeCompany.storeName,
            heroSubtitle: activeCompany.description || 'Te damos la bienvenida a nuestra tienda virtual. Descubre los mejores productos seleccionados y gestionados con dedicación.',
            heroImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000',
            footerText: `Productos de ${activeCompany.storeName}. Calidad y buen servicio garantizado.`,
            supportPhone: activeCompany.phone || undefined,
            supportEmail: activeCompany.email || undefined,
            whatsappNumber: activeCompany.whatsapp || undefined,
            heroBgType: 'solid',
            heroBgColor: '#1c1917',
            heroTextColor: 'light'
          });
        } else {
          setSettings(offlineDb.getSettings());
        }
      }
      setIsSettingsLoading(false);
    }, (error) => {
      console.warn("Firestore settings connection failed, falling back to LocalStorage:", error);
      setOfflineFallbackActive(true);
      setIsSettingsLoading(false);
    });
    return () => unsubscribe();
  }, [isAuthReady, isOfflineMode, activeCompanyIdForSettings, activeCompany, user]);

  const login = async () => {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setIsAuthReady(true);
      setIsLoggingIn(false);
      setLoginError('');
    } catch (error) {
      console.error("Login Error", error);
      setLoginError(getAuthErrorMessage(error));
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsMerchantMode(false);
      setProducts([]);
      setCompanies([]);
      setCartItems([]);
      setSelectedProduct(null);
      setActiveCompany(null);
      setIsCompaniesLoading(true);
      setIsSettingsLoading(true);
    } catch (error) {
      console.error("Logout Error", error);
    }
  };

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  if (!isAuthReady) {
    return (
      <>
        <ToastHost />
        <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 animate-fade-in" id="app-auth-loading-screen">
          <div className="flex flex-col items-center space-y-4 max-w-sm text-center text-white">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-white/15 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
            </div>
            <p className="text-white/70 text-sm font-semibold">Verificando acceso...</p>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <ToastHost />
        <LoginScreen onLogin={login} isLoggingIn={isLoggingIn} loginError={loginError} />
      </>
    );
  }

  if (isCompaniesLoading || isSettingsLoading) {
    return (
      <>
        <ToastHost />
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 animate-fade-in" id="app-loading-screen">
          <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-stone-200/60 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-stone-900 border-t-transparent animate-spin"></div>
            </div>
            <div className="space-y-1">
              <p className="text-stone-800 font-semibold text-base animate-pulse">Cargando tienda...</p>
              <p className="text-stone-400 text-xs font-mono">Espere un momento por favor</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isMerchant && isMerchantMode && !isClientStoreRoute) {
    return (
      <ErrorBoundary>
        <ToastHost />
        <MerchantView 
          products={products} 
          onLogout={logout} 
          onSwitchToCatalog={openCompanyStorefront}
          userCompany={userCompany}
          companies={companies}
          isSuperAdmin={isAdmin}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ToastHost />
      <div className="min-h-screen bg-white">
        <Navbar 
          cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)} 
          onCartClick={() => setIsCartOpen(true)} 
          user={user}
          onLogin={login}
          onLogout={logout}
          storeName={activeSettings.storeName}
          storeBasePath={activeCompany ? `/tienda/${slugify(activeCompany.storeName)}` : undefined}
        />
        
        {/* Floating Controls */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col space-y-4">
          {isMerchant && (
            <button 
              onClick={openMerchantManager}
              className="p-4 bg-stone-900 text-white rounded-full shadow-2xl hover:bg-primary transition-all hover:scale-110 flex items-center gap-2 group"
              title="Ir al Panel de Control"
            >
              <LayoutDashboard size={24} />
              <span className="hidden group-hover:block font-bold text-sm pr-2">Gestionar Negocio</span>
            </button>
          )}
          {!user && (
            <button 
              onClick={login}
              className="p-4 bg-white text-stone-600 rounded-full shadow-2xl hover:text-primary transition-all hover:scale-110 border border-stone-100"
              title="Iniciar Sesión"
            >
              <LogIn size={24} />
            </button>
          )}
        </div>
      
        <CatalogView 
          products={companyProducts}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          mobileCols={mobileCols}
          setMobileCols={setMobileCols}
          onAddToCart={addToCart}
          onProductClick={setSelectedProduct}
          user={user}
          settings={activeSettings}
          companies={companies}
          activeCompany={activeCompany}
        />

        <Cart 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)} 
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onClearCart={() => setCartItems([])}
          activeCompanyId={activeCompany?.id}
        />

        <AnimatePresence>
          {selectedProduct && (
            <ProductDetail
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onAddToCart={addToCart}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
