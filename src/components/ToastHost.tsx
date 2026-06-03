import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

function inferToastType(message: string): ToastType {
  const normalized = message.toLowerCase();

  if (/(error|fall[oó]|hubo|inv[aá]lido|no pudo|no se pudo)/.test(normalized)) {
    return 'error';
  }

  if (/(debe|requiere|excede|verifica|revisa)/.test(normalized)) {
    return 'warning';
  }

  if (/(exitosamente|guardado|registrado|creado|actualizado|eliminado|aprobado|copiado)/.test(normalized)) {
    return 'success';
  }

  return 'info';
}

const toastStyles: Record<ToastType, { icon: React.ElementType; bar: string; iconBg: string; iconText: string }> = {
  success: { icon: CheckCircle2, bar: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  error: { icon: AlertCircle, bar: 'bg-red-500', iconBg: 'bg-red-50', iconText: 'text-red-600' },
  warning: { icon: AlertCircle, bar: 'bg-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  info: { icon: Info, bar: 'bg-stone-800', iconBg: 'bg-stone-100', iconText: 'text-stone-700' },
};

export default function ToastHost() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const dismissToast = React.useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = React.useCallback((message: string, type: ToastType = inferToastType(message)) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    window.setTimeout(() => dismissToast(id), 4200);
  }, [dismissToast]);

  React.useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message?: unknown) => {
      showToast(String(message ?? ''));
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, [showToast]);

  return (
    <div className="fixed left-4 right-4 top-5 z-[9999] flex flex-col items-stretch gap-3 sm:left-auto sm:right-5 sm:w-[380px]">
      <AnimatePresence>
        {toasts.map(toast => {
          const style = toastStyles[toast.type];
          const Icon = style.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden rounded-xl border border-stone-200/70 bg-white shadow-2xl shadow-stone-900/15"
              role="status"
            >
              <div className={`h-1 ${style.bar}`} />
              <div className="flex items-start gap-3 px-4 py-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconBg} ${style.iconText}`}>
                  <Icon size={17} />
                </div>
                <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-stone-800">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                  title="Cerrar notificacion"
                >
                  <X size={15} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
