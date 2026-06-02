import React, { useState, useEffect, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    let userMessage = "Algo salió mal. Por favor, intenta recargar la página.";
    
    try {
      if (error?.message) {
        const firestoreError = JSON.parse(error.message);
        if (firestoreError.error.includes("insufficient permissions")) {
          userMessage = "No tienes permisos para realizar esta acción. Asegúrate de haber iniciado sesión como administrador.";
        }
      }
    } catch (e) {
      // Not a JSON error
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">¡Ups! Ha ocurrido un error</h1>
          <p className="text-stone-500">{userMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center space-x-2 bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-primary transition-colors"
          >
            <RefreshCcw size={20} />
            <span>Recargar Aplicación</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
