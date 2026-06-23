export interface SystemUpdate {
  id: string;
  version: string;
  title: string;
  releasedAt: string;
  summary: string;
  highlights: string[];
}

export const systemUpdates: SystemUpdate[] = [
  {
    id: '2026-06-23-nuestra-historia',
    version: 'v0.7.0-dev',
    title: 'Nuestra Historia editable',
    releasedAt: '2026-06-23',
    summary: 'La tienda ahora tiene una pagina independiente para contar la historia de la marca.',
    highlights: [
      'Nueva ruta publica /tienda/:slug/nosotros.',
      'Configuracion con imagen propia para Nuestra Historia.',
      'Bloques editables de titulo y parrafo, con minimo 1 y maximo 5.',
      'Reglas de Firebase actualizadas para guardar el contenido y subir imagenes.',
    ],
  },
];

export const latestSystemUpdate = systemUpdates[0] || null;
