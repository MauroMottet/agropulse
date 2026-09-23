import { GeoPoint, Reading, SemaphoreState } from '../types/database';

/**
 * Algoritmo Ray-Casting para Point-in-Polygon (PiP)
 * Determina de forma precisa si una coordenada geográfica está dentro del perímetro del lote.
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calcula la distancia en metros entre dos coordenadas geográficas usando la fórmula de Haversine
 */
export function getDistanceMeters(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const phi1 = (p1.latitude * Math.PI) / 180;
  const phi2 = (p2.latitude * Math.PI) / 180;
  const deltaPhi = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const deltaLambda = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Calcula el estado de semáforo del lote:
 * - 'stale' (Gris): sin lectura o measured_at > 15 minutos de antigüedad.
 * - 'dry' (Rojo): moisture_pct < threshold_min.
 * - 'optimal' (Verde): threshold_min <= moisture_pct <= threshold_max.
 * - 'wet' (Azul): moisture_pct > threshold_max.
 */
export function calculateSemaphoreStatus(
  reading?: Reading,
  thresholdMin: number = 25,
  thresholdMax: number = 45,
  staleMinutesLimit: number = 15
): SemaphoreState {
  if (!reading || !reading.measured_at) {
    return 'stale';
  }

  const measuredTime = new Date(reading.measured_at).getTime();
  const now = Date.now();
  const diffMinutes = (now - measuredTime) / (1000 * 60);

  if (diffMinutes > staleMinutesLimit) {
    return 'stale';
  }

  if (reading.moisture_pct < thresholdMin) {
    return 'dry';
  }

  if (reading.moisture_pct > thresholdMax) {
    return 'wet';
  }

  return 'optimal';
}

/**
 * Devuelve la configuración visual del semáforo (colores, etiqueta, descripción)
 */
export function getSemaphoreConfig(status: SemaphoreState) {
  switch (status) {
    case 'stale':
      return {
        label: 'Sin señal / Desactualizado',
        shortLabel: 'Stale',
        color: '#64748B', // Slate 500
        bgColor: '#F1F5F9',
        borderColor: '#94A3B8',
        badgeBg: 'rgba(100, 116, 139, 0.15)',
        description: 'Última lectura hace más de 15 minutos o estación fuera de línea.',
      };
    case 'dry':
      return {
        label: 'Suelo Seco - Riego requerido',
        shortLabel: 'Seco',
        color: '#EF4444', // Red 500
        bgColor: '#FEF2F2',
        borderColor: '#F87171',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        description: 'La humedad está por debajo del umbral mínimo configurado.',
      };
    case 'optimal':
      return {
        label: 'Humedad Óptima',
        shortLabel: 'Óptimo',
        color: '#10B981', // Emerald 500
        bgColor: '#ECFDF5',
        borderColor: '#34D399',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        description: 'Nivel hídrico ideal para el desarrollo del cultivo.',
      };
    case 'wet':
      return {
        label: 'Exceso Hídrico',
        shortLabel: 'Exceso',
        color: '#3B82F6', // Blue 500
        bgColor: '#EFF6FF',
        borderColor: '#60A5FA',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        description: 'Humedad por encima del umbral máximo de absorción.',
      };
  }
}

/**
 * Formato de tiempo relativo en español ("hace X min", "hace X s", etc.)
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Sin datos';
  const time = new Date(dateString).getTime();
  const diffSec = Math.floor((Date.now() - time) / 1000);

  if (diffSec < 5) return 'hace instantes';
  if (diffSec < 60) return `hace ${diffSec} s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}
