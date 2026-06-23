import React from 'react';
import { Bell, CalendarDays, CheckCircle2, Sparkles } from 'lucide-react';
import { latestSystemUpdate, systemUpdates } from '../data/systemUpdates';

interface SystemUpdatesManagerProps {
  hasUnreadUpdates: boolean;
  onMarkUpdatesSeen: () => void;
}

function formatReleaseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function SystemUpdatesManager({ hasUnreadUpdates, onMarkUpdatesSeen }: SystemUpdatesManagerProps) {
  React.useEffect(() => {
    if (hasUnreadUpdates) {
      onMarkUpdatesSeen();
    }
  }, [hasUnreadUpdates, onMarkUpdatesSeen]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell size={21} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Actualizaciones</span>
            <h2 className="mt-1 font-serif text-2xl font-bold text-stone-950">Novedades del sistema</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-500">
              Revisa las mejoras que se han subido al sistema y los cambios disponibles para tu operacion diaria.
            </p>
          </div>
        </div>

        {latestSystemUpdate && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
            Ultima version: {latestSystemUpdate.version}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {systemUpdates.map((update, index) => {
          const isLatest = index === 0;

          return (
            <article key={update.id} className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                      {update.version}
                    </span>
                    {isLatest && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <Sparkles size={12} />
                        Nuevo
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-stone-950">{update.title}</h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-500">{update.summary}</p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-500">
                  <CalendarDays size={15} />
                  {formatReleaseDate(update.releasedAt)}
                </div>
              </div>

              <div className="px-5 py-4">
                <ul className="grid gap-3 md:grid-cols-2">
                  {update.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2.5 text-sm leading-6 text-stone-600">
                      <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
