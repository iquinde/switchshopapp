import React from 'react';
import Navbar from './components/Navbar';
import Cart from './components/Cart';
import ProductDetail from './components/ProductDetail';
import MerchantView from './components/MerchantView';
import CatalogView from './components/CatalogView';
import AboutView from './components/AboutView';
import ErrorBoundary from './components/ErrorBoundary';
import ToastHost from './components/ToastHost';
import { db, auth, googleProvider } from './firebase';
import { addDoc, collection, getDoc, getDocs, limit, onSnapshot, query, doc, serverTimestamp, setDoc, where } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Product, CartItem, StoreSettings, Company } from './types';
import { AnimatePresence } from 'motion/react';
import { KeyRound, LayoutDashboard, LogIn, Mail, ShieldCheck, Store, User, UserPlus, X } from 'lucide-react';
import { getOfflineFallbackActive, offlineDb, setOfflineFallbackActive, OFFLINE_CHANGE_EVENT } from './lib/offlineDb';
import { UserRoleRecord, canAccessCompany, isSuperAdminUser, normalizeEmail } from './lib/authz';
import { LogisticsLocation } from './types';
import { logisticsLocations } from './data/ciudades';

interface LoginScreenProps {
  onGoogleLogin: () => void;
  onPasswordLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  isLoggingIn: boolean;
  loginError: string;
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    const messages: Record<string, string> = {
      'auth/unauthorized-domain': 'Este dominio no esta autorizado en Firebase Authentication. Agrega localhost y el dominio publicado en Firebase Console > Authentication > Settings > Authorized domains.',
      'auth/operation-not-allowed': 'Este metodo de inicio de sesion no esta habilitado en Firebase Authentication. Activa Email/Password y Google en Firebase Console > Authentication > Sign-in method.',
      'auth/popup-closed-by-user': 'La ventana de Google se cerro antes de completar el inicio de sesion. Intenta nuevamente.',
      'auth/popup-blocked': 'El navegador bloqueo la ventana de inicio de sesion. Permite popups para esta pagina o intenta de nuevo.',
      'auth/cancelled-popup-request': 'Se cancelo una solicitud de inicio de sesion anterior. Intenta nuevamente.',
      'auth/invalid-email': 'Ingresa un correo valido.',
      'auth/missing-password': 'Ingresa tu contraseÃ±a.',
      'auth/invalid-credential': 'El usuario o la contraseÃ±a no son correctos.',
      'auth/user-not-found': 'No existe una cuenta registrada con ese correo.',
      'auth/wrong-password': 'La contraseÃ±a no es correcta.',
      'auth/email-already-in-use': 'Ya existe una cuenta registrada con ese correo.',
      'auth/weak-password': 'La contraseÃ±a debe tener al menos 6 caracteres.',
      'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta nuevamente.',
      'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa tu conexion e intenta de nuevo.',
    };

    return messages[error.code] || `Firebase Auth (${error.code}): ${error.message}`;
  }

  return 'No se pudo completar la autenticacion. Intentalo nuevamente o verifica los datos de tu cuenta.';
}

function LoginScreen({
  onGoogleLogin,
  onPasswordLogin,
  onRegister,
  onForgotPassword,
  isLoggingIn,
  loginError
}: LoginScreenProps) {
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [localMessage, setLocalMessage] = React.useState('');
  const [localError, setLocalError] = React.useState('');

  const isRegisterMode = authMode === 'register';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    setLocalMessage('');

    if (!email.trim()) {
      setLocalError('Ingresa tu usuario o correo.');
      return;
    }

    if (!password) {
      setLocalError('Ingresa tu contraseÃ±a.');
      return;
    }

    if (isRegisterMode && password !== confirmPassword) {
      setLocalError('Las contraseÃ±as no coinciden.');
      return;
    }

    if (isRegisterMode) {
      await onRegister(email, password);
      return;
    }

    await onPasswordLogin(email, password);
  };

  const handleForgotPassword = async () => {
    setLocalError('');
    setLocalMessage('');

    if (!email.trim()) {
      setLocalError('Escribe tu correo para enviarte el enlace de recuperacion.');
      return;
    }

    try {
      await onForgotPassword(email);
      setLocalMessage('Te enviamos un enlace para recuperar la contraseÃ±a.');
    } catch {
      // The parent handler already maps the Firebase error into loginError.
    }
  };

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
                <h2 className="text-3xl font-serif font-bold tracking-tight text-white lg:text-stone-950">
                  {isRegisterMode ? 'Crear cuenta' : 'Iniciar sesion'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/62 lg:text-stone-500">
                  Ingresa con usuario y contraseÃ±a, o usa tu cuenta de Google para acceder al sistema.
                </p>
              </div>

              <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-white/5 p-1 lg:border-stone-200 lg:bg-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setLocalError('');
                    setLocalMessage('');
                  }}
                  className={`h-10 rounded-md text-sm font-bold transition-colors ${
                    !isRegisterMode
                      ? 'bg-white text-stone-950 shadow-sm lg:bg-stone-950 lg:text-white'
                      : 'text-white/65 hover:text-white lg:text-stone-500 lg:hover:text-stone-900'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setLocalError('');
                    setLocalMessage('');
                  }}
                  className={`h-10 rounded-md text-sm font-bold transition-colors ${
                    isRegisterMode
                      ? 'bg-white text-stone-950 shadow-sm lg:bg-stone-950 lg:text-white'
                      : 'text-white/65 hover:text-white lg:text-stone-500 lg:hover:text-stone-900'
                  }`}
                >
                  Registro
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/50 lg:text-stone-400">Usuario o correo</span>
                  <div className="flex h-12 items-center gap-3 rounded-lg border border-white/10 bg-white px-3 text-stone-950 shadow-sm lg:border-stone-200">
                    <Mail size={18} className="shrink-0 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="usuario@correo.com"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-stone-400"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/50 lg:text-stone-400">ContraseÃ±a</span>
                  <div className="flex h-12 items-center gap-3 rounded-lg border border-white/10 bg-white px-3 text-stone-950 shadow-sm lg:border-stone-200">
                    <KeyRound size={18} className="shrink-0 text-stone-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                      placeholder="Tu contraseÃ±a"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-stone-400"
                    />
                  </div>
                </label>

                {isRegisterMode && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/50 lg:text-stone-400">Confirmar contraseÃ±a</span>
                    <div className="flex h-12 items-center gap-3 rounded-lg border border-white/10 bg-white px-3 text-stone-950 shadow-sm lg:border-stone-200">
                      <KeyRound size={18} className="shrink-0 text-stone-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Repite tu contraseÃ±a"
                        className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-stone-400"
                      />
                    </div>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isRegisterMode ? <UserPlus size={18} /> : <LogIn size={18} />}
                  <span>{isLoggingIn ? 'Procesando...' : isRegisterMode ? 'Crear cuenta' : 'Entrar'}</span>
                </button>
              </form>

              {!isRegisterMode && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoggingIn}
                  className="w-full text-center text-sm font-bold text-emerald-300 transition-colors hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-70 lg:text-emerald-700 lg:hover:text-emerald-800"
                >
                  Olvide mi contraseÃ±a
                </button>
              )}

              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-white/35 lg:text-stone-300">
                <span className="h-px flex-1 bg-white/10 lg:bg-stone-200" />
                <span>o</span>
                <span className="h-px flex-1 bg-white/10 lg:bg-stone-200" />
              </div>

              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={isLoggingIn}
                aria-label="Entrar con Google"
                title="Entrar con Google"
                className="flex h-12 w-full items-center justify-center rounded-lg bg-white px-4 shadow-lg shadow-black/10 transition-all hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-70 lg:border lg:border-stone-200"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.52z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A9.99 9.99 0 0 0 12 22z" />
                  <path fill="#FBBC05" d="M6.4 13.9a6.01 6.01 0 0 1 0-3.8V7.51H3.06a10 10 0 0 0 0 8.98L6.4 13.9z" />
                  <path fill="#EA4335" d="M12 5.98c1.47 0 2.78.5 3.82 1.5l2.87-2.87C16.95 2.99 14.7 2 12 2a9.99 9.99 0 0 0-8.94 5.51L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98z" />
                </svg>
              </button>

              {(loginError || localError) && (
                <p className="rounded-lg border border-red-300/30 bg-red-500/12 px-3 py-2 text-xs font-medium text-red-100 lg:border-red-200 lg:bg-red-50 lg:text-red-700">
                  {localError || loginError}
                </p>
              )}

              {localMessage && (
                <p className="rounded-lg border border-emerald-300/30 bg-emerald-500/12 px-3 py-2 text-xs font-medium text-emerald-100 lg:border-emerald-200 lg:bg-emerald-50 lg:text-emerald-700">
                  {localMessage}
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

function NoAccessScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-stone-950 shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <h1 className="mt-6 text-3xl font-serif font-bold tracking-tight">Acceso no configurado</h1>
          <p className="mt-3 text-sm leading-6 text-white/62">
            Tu cuenta inicio sesion correctamente, pero aun no esta asociada a una empresa activa.
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-7 h-12 w-full rounded-lg bg-white px-4 text-sm font-bold text-stone-950 shadow-lg shadow-black/10 transition-all hover:bg-stone-100"
          >
            Cerrar sesion
          </button>
        </div>
      </main>
    </ErrorBoundary>
  );
}

interface StoreCustomerAuthModalProps {
  storeName: string;
  isOpen: boolean;
  isLoggingIn: boolean;
  loginError: string;
  onClose: () => void;
  onGoogleLogin: () => void;
  onPasswordLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string, location?: LogisticsLocation | null) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
}

function StoreCustomerAuthModal({
  storeName,
  isOpen,
  isLoggingIn,
  loginError,
  onClose,
  onGoogleLogin,
  onPasswordLogin,
  onRegister,
  onForgotPassword
}: StoreCustomerAuthModalProps) {
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [citySearch, setCitySearch] = React.useState('');
  const [selectedLocation, setSelectedLocation] = React.useState<LogisticsLocation | null>(null);
  const [isCityPickerOpen, setIsCityPickerOpen] = React.useState(false);
  const [localError, setLocalError] = React.useState('');
  const [localMessage, setLocalMessage] = React.useState('');
  const isRegisterMode = authMode === 'register';

  const filteredCityOptions = React.useMemo(() => {
    const term = citySearch.trim().toLowerCase();
    if (!term) return logisticsLocations.slice(0, 20);
    return logisticsLocations
      .filter(location => location.label.toLowerCase().includes(term))
      .slice(0, 30);
  }, [citySearch]);

  React.useEffect(() => {
    if (!isOpen) {
      setLocalError('');
      setLocalMessage('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    setLocalMessage('');

    if (isRegisterMode && !name.trim()) {
      setLocalError('Ingresa tu nombre para registrarte.');
      return;
    }
    if (!email.trim()) {
      setLocalError('Ingresa tu correo.');
      return;
    }
    if (!password) {
      setLocalError('Ingresa tu contraseÃ±a.');
      return;
    }
    if (isRegisterMode && password !== confirmPassword) {
      setLocalError('Las contraseÃ±as no coinciden.');
      return;
    }
    if (isRegisterMode && !selectedLocation) {
      setLocalError('Selecciona tu ciudad para calcular la logistica.');
      return;
    }

    if (isRegisterMode) {
      await onRegister(name, email, password, selectedLocation);
    } else {
      await onPasswordLogin(email, password);
    }
  };

  const handleForgotPassword = async () => {
    setLocalError('');
    setLocalMessage('');
    if (!email.trim()) {
      setLocalError('Escribe tu correo para enviarte el enlace de recuperacion.');
      return;
    }
    try {
      await onForgotPassword(email);
      setLocalMessage('Te enviamos un enlace para recuperar la contraseÃ±a.');
    } catch {
      // Firebase error is shown through loginError.
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-stone-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">{storeName}</p>
            <h2 className="mt-1 text-2xl font-serif font-bold text-stone-950">
              {isRegisterMode ? 'Crear cuenta de cliente' : 'Entrar a mi cuenta'}
            </h2>
            <p className="mt-2 text-sm leading-5 text-stone-500">
              Tu cuenta quedara asociada a esta tienda para pedidos y seguimiento.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setLocalError('');
              setLocalMessage('');
            }}
            className={`h-10 rounded-md text-sm font-bold transition-colors ${!isRegisterMode ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setLocalError('');
              setLocalMessage('');
            }}
            className={`h-10 rounded-md text-sm font-bold transition-colors ${isRegisterMode ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Registro
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isRegisterMode && (
            <>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-400">Nombre</span>
                <div className="flex h-12 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3">
                  <User size={18} className="text-stone-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="Tu nombre"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-stone-900 outline-none placeholder:text-stone-400"
                  />
                </div>
              </label>

              <label className="relative block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-400">Ciudad</span>
                <div className="flex h-12 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3">
                  <Store size={18} className="text-stone-400" />
                  <input
                    type="text"
                    value={citySearch}
                    onFocus={() => setIsCityPickerOpen(true)}
                    onChange={(event) => {
                      setCitySearch(event.target.value);
                      setSelectedLocation(null);
                      setIsCityPickerOpen(true);
                    }}
                    placeholder="Busca tu ciudad"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-stone-900 outline-none placeholder:text-stone-400"
                  />
                </div>
                {isCityPickerOpen && (
                  <div className="absolute left-0 right-0 top-full z-[130] mt-1 max-h-52 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl">
                    {filteredCityOptions.map(location => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => {
                          setSelectedLocation(location);
                          setCitySearch(location.label);
                          setIsCityPickerOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left transition-colors hover:bg-stone-50"
                      >
                        <span className="block text-xs font-bold text-stone-900">{location.canton}</span>
                        <span className="block text-[10px] font-medium text-stone-400">{location.province}</span>
                      </button>
                    ))}
                    {filteredCityOptions.length === 0 && (
                      <p className="px-3 py-3 text-center text-xs text-stone-400">No hay ciudades que coincidan.</p>
                    )}
                  </div>
                )}
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-400">Correo</span>
            <div className="flex h-12 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3">
              <Mail size={18} className="text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="cliente@correo.com"
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-stone-900 outline-none placeholder:text-stone-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-400">ContraseÃ±a</span>
            <div className="flex h-12 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3">
              <KeyRound size={18} className="text-stone-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                placeholder="Tu contraseÃ±a"
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-stone-900 outline-none placeholder:text-stone-400"
              />
            </div>
          </label>

          {isRegisterMode && (
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-stone-400">Confirmar contraseÃ±a</span>
              <div className="flex h-12 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3">
                <KeyRound size={18} className="text-stone-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Repite tu contraseÃ±a"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-stone-900 outline-none placeholder:text-stone-400"
                />
              </div>
            </label>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isRegisterMode ? <UserPlus size={18} /> : <LogIn size={18} />}
            <span>{isLoggingIn ? 'Procesando...' : isRegisterMode ? 'Registrarme' : 'Entrar'}</span>
          </button>
        </form>

        {!isRegisterMode && (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isLoggingIn}
            className="mt-3 w-full text-center text-sm font-bold text-primary transition-colors hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Olvide mi contraseÃ±a
          </button>
        )}

        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-300">
          <span className="h-px flex-1 bg-stone-200" />
          <span>o</span>
          <span className="h-px flex-1 bg-stone-200" />
        </div>

        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={isLoggingIn}
          aria-label="Entrar con Google"
          title="Entrar con Google"
          className="flex h-12 w-full items-center justify-center rounded-lg border border-stone-200 bg-white px-4 shadow-sm transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.52z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A9.99 9.99 0 0 0 12 22z" />
            <path fill="#FBBC05" d="M6.4 13.9a6.01 6.01 0 0 1 0-3.8V7.51H3.06a10 10 0 0 0 0 8.98L6.4 13.9z" />
            <path fill="#EA4335" d="M12 5.98c1.47 0 2.78.5 3.82 1.5l2.87-2.87C16.95 2.99 14.7 2 12 2a9.99 9.99 0 0 0-8.94 5.51L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98z" />
          </svg>
        </button>

        {(localError || loginError) && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {localError || loginError}
          </p>
        )}

        {localMessage && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            {localMessage}
          </p>
        )}
      </div>
    </div>
  );
}

const STORE_ROUTE_PREFIX = 'tienda';
const STORE_SECTION_SLUGS = new Set(['inicio', 'productos', 'nosotros', 'contacto']);
type StoreSection = 'inicio' | 'productos' | 'nosotros' | 'contacto';
type AuthEntryContext = 'private' | 'store';
const AUTH_ENTRY_CONTEXT_KEY = 'switchshop.authEntryContext';

function setAuthEntryContext(context: AuthEntryContext) {
  try {
    window.sessionStorage.setItem(AUTH_ENTRY_CONTEXT_KEY, context);
  } catch {
    // Session storage can be unavailable in restricted browsers.
  }
}

function getAuthEntryContext(): AuthEntryContext | null {
  try {
    const value = window.sessionStorage.getItem(AUTH_ENTRY_CONTEXT_KEY);
    return value === 'private' || value === 'store' ? value : null;
  } catch {
    return null;
  }
}

function clearAuthEntryContext() {
  try {
    window.sessionStorage.removeItem(AUTH_ENTRY_CONTEXT_KEY);
  } catch {
    // Session storage can be unavailable in restricted browsers.
  }
}

function isStorefrontRoute() {
  const searchParams = new URLSearchParams(window.location.search);
  const hasStoreQuery = Boolean(searchParams.get('tienda') || searchParams.get('companyId') || searchParams.get('c'));
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const hashParts = window.location.hash.replace('#', '').split('/').filter(Boolean);

  return hasStoreQuery || pathParts[0] === STORE_ROUTE_PREFIX || hashParts[0] === STORE_ROUTE_PREFIX;
}

function getStoreRouteSection(): StoreSection {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const hashParts = window.location.hash.replace('#', '').split('/').filter(Boolean);
  const pathSection = pathParts[0] === STORE_ROUTE_PREFIX ? pathParts[2] : pathParts[0];
  const hashSection = hashParts[0] === STORE_ROUTE_PREFIX ? hashParts[2] : hashParts[0];
  const section = pathSection || hashSection;

  return STORE_SECTION_SLUGS.has(section || '') ? (section as StoreSection) : 'inicio';
}

export default function App() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isMerchantMode, setIsMerchantMode] = React.useState(false);
  const [isClientStoreRoute, setIsClientStoreRoute] = React.useState(isStorefrontRoute());
  const [activeStoreSection, setActiveStoreSection] = React.useState<StoreSection>(getStoreRouteSection());
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<string>('todos');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [user, setUser] = React.useState<any>(null);
  const [userRole, setUserRole] = React.useState<UserRoleRecord | null>(null);
  const [isUserRoleLoading, setIsUserRoleLoading] = React.useState(false);
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [loginError, setLoginError] = React.useState('');
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = React.useState(false);
  const [storeCustomerId, setStoreCustomerId] = React.useState<string | null>(null);
  const [mobileCols, setMobileCols] = React.useState<2 | 3>(2);
  
  const [isOfflineMode, setIsOfflineMode] = React.useState(getOfflineFallbackActive());
  const [settings, setSettings] = React.useState<StoreSettings>({
    storeName: 'SwitchShop',
    heroTitle: 'Calidad y TradiciÃ³n Hecha a Mano.',
    heroSubtitle: 'Descubre nuestra cuidada selecciÃ³n de cafÃ© premium de especialidad y piezas de joyerÃ­a artesanal Ãºnica. Cultivados y creados con dedicaciÃ³n para deleitar tus sentidos.',
    heroImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000',
    logoImage: '',
    footerText: 'Productos seleccionados con alma, sabor y tradiciÃ³n.',
    socialLinks: {
      instagram: { enabled: false, url: '' },
      facebook: { enabled: false, url: '' },
      tiktok: { enabled: false, url: '' },
      twitter: { enabled: false, url: '' }
    },
  });

  const [activeCompany, setActiveCompany] = React.useState<Company | null>(null);
  const [isCompaniesLoading, setIsCompaniesLoading] = React.useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = React.useState(true);
  const canLoadStorefrontPublicly = isClientStoreRoute;

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

  const ensureStoreCustomerProfile = React.useCallback(async (
    customerUser = auth.currentUser,
    nameOverride = '',
    location?: LogisticsLocation | null
  ) => {
    if (getAuthEntryContext() !== 'store' || !customerUser || !activeCompany || activeCompany.id === 'comp-default') {
      setStoreCustomerId(null);
      return null;
    }

    const customerName =
      nameOverride.trim() ||
      customerUser.displayName ||
      customerUser.email?.split('@')[0] ||
      'Cliente';

    const customerQuery = query(
      collection(db, 'customers'),
      where('companyId', '==', activeCompany.id),
      where('authUid', '==', customerUser.uid),
      limit(1)
    );
    const snapshot = await getDocs(customerQuery);

    if (!snapshot.empty) {
      const customerDoc = snapshot.docs[0];
      setStoreCustomerId(customerDoc.id);
      return customerDoc.id;
    }

    const customerPayload: Record<string, unknown> = {
      authUid: customerUser.uid,
      name: customerName,
      email: customerUser.email || null,
      totalSpent: 0,
      currentDebt: 0,
      status: 'pending',
      companyId: activeCompany.id,
      createdAt: serverTimestamp()
    };

    if (location) {
      customerPayload.logisticsLocationId = location.id;
      customerPayload.city = location.canton;
      customerPayload.province = location.province;
    }

    const created = await addDoc(collection(db, 'customers'), customerPayload);
    setStoreCustomerId(created.id);
    return created.id;
  }, [activeCompany]);

  React.useEffect(() => {
    const handleUrlChange = () => {
      setIsClientStoreRoute(isStorefrontRoute());
      setActiveStoreSection(getStoreRouteSection());
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

  React.useEffect(() => {
    if (!isAuthReady || !isClientStoreRoute || !user || !activeCompany || getAuthEntryContext() !== 'store') {
      setStoreCustomerId(null);
      return;
    }

    ensureStoreCustomerProfile(user).catch((error) => {
      console.warn('No se pudo asociar el cliente a la tienda:', error);
    });
  }, [activeCompany, ensureStoreCustomerProfile, isAuthReady, isClientStoreRoute, user]);

  const openMerchantManager = () => {
    setActiveCompany(null);
    setActiveStoreSection('inicio');
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
    setActiveStoreSection('inicio');
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
        heroSubtitle: settings.heroSubtitle || activeCompany.description || 'Te damos la bienvenida a nuestra tienda virtual. Descubre los mejores productos seleccionados y gestionados con dedicaciÃ³n.',
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
    if (isClientStoreRoute) {
      return [];
    }
    // Filter out products belonging to the template company or with missing companyId entirely in public directory/catalog views
    return products.filter(p => p.companyId && p.companyId !== 'comp-default');
  }, [products, activeCompany, isClientStoreRoute]);

  const activeStoreBasePath = activeCompany ? `/tienda/${slugify(activeCompany.storeName)}` : undefined;

  React.useEffect(() => {
    if (activeStoreSection === 'nosotros') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (activeStoreSection === 'inicio') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    requestAnimationFrame(() => {
      document.getElementById(activeStoreSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeStoreSection]);

  const isAdmin = isSuperAdminUser(user?.email, user?.emailVerified, userRole);
  const userCompany = user ? companies.find(c => canAccessCompany(c, user.email, user.emailVerified, userRole)) : null;
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
        const isUserAdmin = isSuperAdminUser(currentUser.email, currentUser.emailVerified);
        const comps = offlineDb.getCompanies();
        const isOwner = comps.some(c => canAccessCompany(c, currentUser.email, currentUser.emailVerified));
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

  React.useEffect(() => {
    const email = normalizeEmail(user?.email);
    if (!isAuthReady || !user || !email || isOfflineMode) {
      setUserRole(null);
      setIsUserRoleLoading(false);
      return;
    }

    setIsUserRoleLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'userRoles', email), (snapshot) => {
      setUserRole(snapshot.exists() ? (snapshot.data() as UserRoleRecord) : null);
      setIsUserRoleLoading(false);
    }, (error) => {
      console.warn("Firestore user role connection failed:", error);
      setUserRole(null);
      setIsUserRoleLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthReady, isOfflineMode, user]);

  // Real-time Companies Listener (with graceful offline fallback)
  React.useEffect(() => {
    if (!isAuthReady || (!user && !canLoadStorefrontPublicly)) return;
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
  }, [canLoadStorefrontPublicly, isAuthReady, isOfflineMode, user]);

  // Real-time Products Listener (with graceful offline fallback)
  React.useEffect(() => {
    if (!isAuthReady || (!user && !canLoadStorefrontPublicly)) return;
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
  }, [canLoadStorefrontPublicly, isAuthReady, isOfflineMode, user]);

  const activeCompanyIdForSettings = activeCompany ? activeCompany.id : 'store';

  // Real-time Settings Listener (with graceful offline fallback)
  React.useEffect(() => {
    if (!isAuthReady || (!user && !canLoadStorefrontPublicly)) return;
    
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
            heroSubtitle: activeCompany.description || 'Te damos la bienvenida a nuestra tienda virtual. Descubre los mejores productos seleccionados y gestionados con dedicaciÃ³n.',
            heroImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000',
            logoImage: '',
            footerText: `Productos de ${activeCompany.storeName}. Calidad y buen servicio garantizado.`,
            socialLinks: {
              instagram: { enabled: false, url: '' },
              facebook: { enabled: false, url: '' },
              tiktok: { enabled: false, url: '' },
              twitter: { enabled: false, url: '' }
            },
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
  }, [canLoadStorefrontPublicly, isAuthReady, isOfflineMode, activeCompanyIdForSettings, activeCompany, user]);

  const ensurePrivateUserRole = React.useCallback(async (currentUser: any, nameOverride = '') => {
    const email = normalizeEmail(currentUser?.email);
    if (!currentUser || !email || isOfflineMode) return;

    const roleRef = doc(db, 'userRoles', email);
    const roleSnap = await getDoc(roleRef);
    if (roleSnap.exists()) return;

    const displayName = (nameOverride || currentUser.displayName || '').trim();
    const nameParts = displayName.split(/\s+/).filter(Boolean);
    const fallbackName = email.split('@')[0] || 'Usuario';
    const now = new Date().toISOString();
    const pendingRole: UserRoleRecord = {
      email,
      firstName: nameParts[0] || fallbackName,
      lastName: nameParts.slice(1).join(' ') || 'Pendiente',
      role: 'company_staff',
      companyId: null,
      status: 'inactive',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(roleRef, pendingRole);
  }, [isOfflineMode]);
  const loginWithGoogle = async () => {
    setAuthEntryContext('private');
    setIsLoggingIn(true);
    setLoginError('');

    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      await ensurePrivateUserRole(result.user);
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

  const loginWithPassword = async (email: string, password: string) => {
    setAuthEntryContext('private');
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      await ensurePrivateUserRole(result.user);
      setUser(result.user);
      setIsAuthReady(true);
      setIsLoggingIn(false);
      setLoginError('');
    } catch (error) {
      console.error("Password Login Error", error);
      setLoginError(getAuthErrorMessage(error));
      setIsLoggingIn(false);
    }
  };

  const registerWithPassword = async (email: string, password: string, name = '') => {
    setAuthEntryContext('private');
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(result.user, { displayName: name.trim() });
      }
      if (!result.user.emailVerified) {
        await sendEmailVerification(result.user);
      }
      await ensurePrivateUserRole(result.user, name);
      setUser(result.user);
      setIsAuthReady(true);
      setIsLoggingIn(false);
      setLoginError('');
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
        try {
          const result = await signInWithEmailAndPassword(auth, email.trim(), password);
          await ensurePrivateUserRole(result.user, name);
          setUser(result.user);
          setIsAuthReady(true);
          setIsLoggingIn(false);
          setLoginError('');
          return;
        } catch (loginError) {
          console.error("Existing Account Login Error", loginError);
          try {
            await sendPasswordResetEmail(auth, email.trim());
            setLoginError('Ese correo ya existe en Firebase Auth. Te enviamos un enlace para recuperar la contraseña y luego entrar para solicitar acceso.');
          } catch (resetError) {
            console.error("Existing Account Password Reset Error", resetError);
            setLoginError('Ese correo ya existe en Firebase Auth, pero no pudimos enviar el enlace de recuperación. Revisa que Email/Password esté habilitado en Firebase Authentication.');
          }
          setIsLoggingIn(false);
          return;
        }
      }

      console.error("Register Error", error);
      setLoginError(getAuthErrorMessage(error));
      setIsLoggingIn(false);
    }
  };

  const recoverPassword = async (email: string) => {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setIsLoggingIn(false);
      setLoginError('');
    } catch (error) {
      console.error("Password Recovery Error", error);
      setLoginError(getAuthErrorMessage(error));
      setIsLoggingIn(false);
      throw error;
    }
  };

  const loginStoreCustomerWithPassword = async (email: string, password: string) => {
    setAuthEntryContext('store');
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      setUser(result.user);
      setIsAuthReady(true);
      await ensureStoreCustomerProfile(result.user);
      setIsCustomerAuthOpen(false);
      setIsLoggingIn(false);
      setLoginError('');
    } catch (error) {
      console.error("Store Customer Login Error", error);
      setLoginError(getAuthErrorMessage(error));
      setIsLoggingIn(false);
    }
  };

  const registerStoreCustomerWithPassword = async (name: string, email: string, password: string, location?: LogisticsLocation | null) => {
    setAuthEntryContext('store');
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(result.user, { displayName: name.trim() });
      if (!result.user.emailVerified) {
        await sendEmailVerification(result.user);
      }
      setUser(result.user);
      setIsAuthReady(true);
      await ensureStoreCustomerProfile(result.user, name, location);
      setIsCustomerAuthOpen(false);
      setIsLoggingIn(false);
      setLoginError('');
    } catch (error) {
      console.error("Store Customer Register Error", error);
      setLoginError(getAuthErrorMessage(error));
      setIsLoggingIn(false);
    }
  };

  const loginStoreCustomerWithGoogle = async () => {
    setAuthEntryContext('store');
    setIsLoggingIn(true);
    setLoginError('');

    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setIsAuthReady(true);
      await ensureStoreCustomerProfile(result.user);
      setIsCustomerAuthOpen(false);
      setIsLoggingIn(false);
      setLoginError('');
    } catch (error) {
      console.error("Store Customer Google Login Error", error);
      setLoginError(getAuthErrorMessage(error));
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      clearAuthEntryContext();
      setIsMerchantMode(false);
      setProducts([]);
      setCompanies([]);
      setCartItems([]);
      setSelectedProduct(null);
      setActiveCompany(null);
      setStoreCustomerId(null);
      setIsCustomerAuthOpen(false);
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

  if (!user && !isClientStoreRoute) {
    return (
      <>
        <ToastHost />
        <LoginScreen
          onGoogleLogin={loginWithGoogle}
          onPasswordLogin={loginWithPassword}
          onRegister={registerWithPassword}
          onForgotPassword={recoverPassword}
          isLoggingIn={isLoggingIn}
          loginError={loginError}
        />
      </>
    );
  }

  if (isCompaniesLoading || isSettingsLoading || (user && !isClientStoreRoute && isUserRoleLoading)) {
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

  if (user && !isMerchant && !isClientStoreRoute) {
    return (
      <>
        <ToastHost />
        <NoAccessScreen onLogout={logout} />
      </>
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
          onLogin={() => {
            if (isClientStoreRoute) {
              setIsCustomerAuthOpen(true);
              return;
            }
            loginWithGoogle();
          }}
          onLogout={logout}
          storeName={activeSettings.storeName}
          logoImage={activeSettings.logoImage}
          storeBasePath={activeStoreBasePath}
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
              onClick={() => {
                if (isClientStoreRoute) {
                  setIsCustomerAuthOpen(true);
                  return;
                }
                loginWithGoogle();
              }}
              className="p-4 bg-white text-stone-600 rounded-full shadow-2xl hover:text-primary transition-all hover:scale-110 border border-stone-100"
              title="Iniciar SesiÃ³n"
            >
              <LogIn size={24} />
            </button>
          )}
        </div>
      
        {activeStoreSection === 'nosotros' ? (
          <AboutView
            settings={activeSettings}
            activeCompany={activeCompany}
            storeBasePath={activeStoreBasePath}
          />
        ) : (
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
        )}

        <Cart 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)} 
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onClearCart={() => setCartItems([])}
          activeCompanyId={activeCompany?.id}
          activeCustomerId={storeCustomerId}
          requireCustomerAuth={Boolean(isClientStoreRoute && activeCompany && activeCompany.id !== 'comp-default')}
          onRequireCustomerAuth={() => setIsCustomerAuthOpen(true)}
        />

        <StoreCustomerAuthModal
          storeName={activeSettings.storeName}
          isOpen={isCustomerAuthOpen}
          isLoggingIn={isLoggingIn}
          loginError={loginError}
          onClose={() => setIsCustomerAuthOpen(false)}
          onGoogleLogin={loginStoreCustomerWithGoogle}
          onPasswordLogin={loginStoreCustomerWithPassword}
          onRegister={registerStoreCustomerWithPassword}
          onForgotPassword={recoverPassword}
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


