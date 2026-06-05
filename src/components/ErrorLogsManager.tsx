import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { getOfflineFallbackActive } from '../lib/offlineDb';

interface ClientErrorLog {
  id: string;
  message: string;
  code?: string | null;
  userEmail?: string | null;
  emailVerified?: boolean;
  context?: Record<string, any>;
  createdAt?: any;
}

export default function ErrorLogsManager() {
  const [clientErrorLogs, setClientErrorLogs] = React.useState<ClientErrorLog[]>([]);

  React.useEffect(() => {
    if (getOfflineFallbackActive()) return;

    const logsQuery = query(collection(db, 'clientErrorLogs'), orderBy('createdAt', 'desc'), limit(8));
    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      setClientErrorLogs(snapshot.docs.map(logDoc => ({
        id: logDoc.id,
        ...logDoc.data(),
      })) as ClientErrorLog[]);
    }, (error) => {
      console.warn('Error al cargar logs de errores:', error);
      setClientErrorLogs([]);
    });

    return () => unsubscribe();
  }, []);

  const formatLogDate = (value: any) => {
    if (!value) return 'Sin fecha';
    const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
    return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString('es-EC');
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="px-1">
        <h2 className="text-xl sm:text-3xl font-serif font-bold text-stone-900">Log de Errores</h2>
        <p className="text-stone-500 text-xs sm:text-sm">Revisa los problemas recientes reportados por usuarios al guardar datos.</p>
      </div>

      <section className="bg-white border border-stone-100 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="font-serif font-bold text-lg text-stone-900">Errores recientes</h3>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">{clientErrorLogs.length} logs</span>
        </div>

        {clientErrorLogs.length > 0 ? (
          <div className="space-y-2">
            {clientErrorLogs.map(log => {
              const action = log.context?.action || 'accion_desconocida';
              const companyContext = log.context?.targetCompanyId || log.context?.companyId || 'sin_empresa';
              return (
                <div key={log.id} className="rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-stone-900 truncate">{log.userEmail || 'usuario sin email'}</p>
                      <p className="mt-1 text-xs font-semibold text-red-700">{log.code || log.message}</p>
                      {log.code && <p className="mt-1 text-[11px] text-stone-500 line-clamp-2">{log.message}</p>}
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{formatLogDate(log.createdAt)}</p>
                      <p className="mt-1 text-[10px] font-mono text-stone-500">{companyContext}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-white border border-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">{action}</span>
                    {log.context?.paymentMethod && (
                      <span className="rounded-full bg-white border border-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                        pago: {log.context.paymentMethod}
                      </span>
                    )}
                    {log.context?.hasInitialPayment && (
                      <span className="rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        con pago inicial
                      </span>
                    )}
                    {log.emailVerified === false && (
                      <span className="rounded-full bg-red-50 border border-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        email no verificado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-4 py-8 text-center text-xs font-semibold text-stone-400">
            No hay errores reportados todavia.
          </div>
        )}
      </section>
    </div>
  );
}
