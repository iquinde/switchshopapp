import { LogisticsLocation } from '../types';
import ciudadesData from './ciudades.json';

interface RawCanton {
  canton: string;
  parroquias?: Record<string, string> | null;
}

interface RawProvince {
  provincia?: string;
  cantones: Record<string, RawCanton>;
}

const rawCities = ciudadesData as Record<string, RawProvince>;

export const logisticsLocations: LogisticsLocation[] = Object.entries(rawCities).flatMap(([provinceCode, provinceData]) => {
  const province = provinceData.provincia || 'SIN PROVINCIA';

  return Object.entries(provinceData.cantones || {}).map(([cantonCode, cantonData]) => {
    const canton = cantonData.canton;

    return {
      id: cantonCode,
      provinceCode,
      province,
      cantonCode,
      canton,
      parishCode: cantonCode,
      parish: canton,
      label: `${province} / ${canton}`,
    };
  });
}).sort((a, b) => a.label.localeCompare(b.label));

export function findLogisticsLocation(locationId: string) {
  return logisticsLocations.find(location => location.id === locationId) || null;
}
