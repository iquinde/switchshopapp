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

export function toCapitalCase(value: string) {
  return value
    .toLocaleLowerCase('es-EC')
    .replace(/(^|\s|\/|-)(\p{L})/gu, (_match, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase('es-EC')}`);
}

export const logisticsLocations: LogisticsLocation[] = Object.entries(rawCities).flatMap(([provinceCode, provinceData]) => {
  const province = provinceData.provincia || 'SIN PROVINCIA';

  return Object.entries(provinceData.cantones || {}).map(([cantonCode, cantonData]) => {
    const canton = cantonData.canton;
    const formattedProvince = toCapitalCase(province);
    const formattedCanton = toCapitalCase(canton);

    return {
      id: cantonCode,
      provinceCode,
      province: formattedProvince,
      cantonCode,
      canton: formattedCanton,
      parishCode: cantonCode,
      parish: formattedCanton,
      label: `${formattedProvince} / ${formattedCanton}`,
    };
  });
}).sort((a, b) => a.label.localeCompare(b.label));

export function findLogisticsLocation(locationId: string) {
  return logisticsLocations.find(location => location.id === locationId) || null;
}
