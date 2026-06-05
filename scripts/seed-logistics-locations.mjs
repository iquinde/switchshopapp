import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const [firebaseConfigRaw, citiesRaw] = await Promise.all([
  readFile(resolve(rootDir, 'firebase-applet-config.json'), 'utf8'),
  readFile(resolve(rootDir, 'src/data/ciudades.json'), 'utf8'),
]);

const firebaseConfig = JSON.parse(firebaseConfigRaw);
const cities = JSON.parse(citiesRaw);
const projectId = firebaseConfig.projectId;
const databaseId = firebaseConfig.firestoreDatabaseId;

if (!projectId) {
  throw new Error('firebase-applet-config.json no tiene projectId.');
}

const locations = Object.entries(cities).flatMap(([provinceCode, provinceData]) => {
  const province = provinceData.provincia || 'SIN PROVINCIA';

  return Object.entries(provinceData.cantones || {}).map(([cantonCode, cantonData]) => {
    const city = cantonData.canton;

    return {
      id: cantonCode,
      provinceCode,
      province,
      cantonCode,
      canton: city,
      parishCode: cantonCode,
      parish: city,
      label: `${province} / ${city}`,
      updatedAt: new Date().toISOString(),
    };
  });
});

try {
  const app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

  for (let i = 0; i < locations.length; i += 450) {
    const batch = db.batch();
    locations.slice(i, i + 450).forEach(location => {
      batch.set(db.collection('logisticsLocations').doc(location.id), location, { merge: true });
    });
    await batch.commit();
  }

  console.log(`Ciudades importadas: ${locations.length}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Could not load the default credentials')) {
    console.warn(
      [
        'No se sembraron ciudades porque no hay credenciales de administrador disponibles.',
        'El deploy puede continuar, pero para sembrar Firestore configura GOOGLE_APPLICATION_CREDENTIALS',
        'con una service account o ejecuta: gcloud auth application-default login',
      ].join('\n')
    );
    process.exit(0);
  }

  throw error;
}
