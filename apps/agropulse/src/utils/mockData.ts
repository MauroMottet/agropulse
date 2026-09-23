import { Plot, Reading, Valve, Station, Organization } from '../types/database';

export const MOCK_ORGANIZATION: Organization = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Estancia Didáctica Concordia',
  created_at: new Date().toISOString(),
};

export const MOCK_PLOTS: Plot[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    organization_id: MOCK_ORGANIZATION.id,
    name: 'Costa 1',
    crop_type: 'Citrus (Naranjas Valencia)',
    polygon: [
      { latitude: -31.375, longitude: -58.012 },
      { latitude: -31.375, longitude: -58.005 },
      { latitude: -31.382, longitude: -58.005 },
      { latitude: -31.382, longitude: -58.012 },
    ],
    threshold_min: 25.0,
    threshold_max: 45.0,
    created_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    organization_id: MOCK_ORGANIZATION.id,
    name: 'Costa 2',
    crop_type: 'Citrus (Mandarinas Murcott)',
    polygon: [
      { latitude: -31.385, longitude: -58.012 },
      { latitude: -31.385, longitude: -58.004 },
      { latitude: -31.393, longitude: -58.004 },
      { latitude: -31.393, longitude: -58.012 },
    ],
    threshold_min: 25.0,
    threshold_max: 45.0,
    created_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    organization_id: MOCK_ORGANIZATION.id,
    name: 'Monte A',
    crop_type: 'Soja 1ra',
    polygon: [
      { latitude: -31.37, longitude: -58.025 },
      { latitude: -31.37, longitude: -58.015 },
      { latitude: -31.379, longitude: -58.015 },
      { latitude: -31.379, longitude: -58.025 },
    ],
    threshold_min: 25.0,
    threshold_max: 45.0,
    created_at: new Date().toISOString(),
  },
];

export const MOCK_STATIONS: Station[] = [
  {
    id: '33333333-3333-3333-3333-333333333331',
    organization_id: MOCK_ORGANIZATION.id,
    plot_id: '22222222-2222-2222-2222-222222222221',
    name: 'Estación C1-Alpha',
    hardware_id: 'ST-CONC-01',
    lat: -31.3785,
    lng: -58.0085,
    created_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333332',
    organization_id: MOCK_ORGANIZATION.id,
    plot_id: '22222222-2222-2222-2222-222222222222',
    name: 'Estación C2-Beta',
    hardware_id: 'ST-CONC-02',
    lat: -31.389,
    lng: -58.008,
    created_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    organization_id: MOCK_ORGANIZATION.id,
    plot_id: '22222222-2222-2222-2222-222222222223',
    name: 'Estación MA-Gamma',
    hardware_id: 'ST-CONC-03',
    lat: -31.3745,
    lng: -58.02,
    created_at: new Date().toISOString(),
  },
];

export const MOCK_VALVES: Valve[] = [
  {
    id: '44444444-4444-4444-4444-444444444441',
    organization_id: MOCK_ORGANIZATION.id,
    plot_id: '22222222-2222-2222-2222-222222222221',
    name: 'Válvula Principal Costa 1',
    status: 'closed',
    last_command_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444442',
    organization_id: MOCK_ORGANIZATION.id,
    plot_id: '22222222-2222-2222-2222-222222222222',
    name: 'Válvula Principal Costa 2',
    status: 'closed',
    last_command_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444443',
    organization_id: MOCK_ORGANIZATION.id,
    plot_id: '22222222-2222-2222-2222-222222222223',
    name: 'Válvula Pivot Monte A',
    status: 'closed',
    last_command_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
];

// Generates 14 data points spanning the last 6 hours
export function generateInitialHistory(plotId: string): Reading[] {
  const readings: Reading[] = [];
  const now = Date.now();
  const station = MOCK_STATIONS.find((s) => s.plot_id === plotId) || MOCK_STATIONS[0];

  let base = 35.0;
  let isStale = false;
  if (plotId === '22222222-2222-2222-2222-222222222222') {
    base = 18.0; // Dry (< 25%)
  } else if (plotId === '22222222-2222-2222-2222-222222222223') {
    base = 29.0;
    isStale = true; // Stale (> 15 min)
  }

  const count = 14;
  const stepMs = (6 * 3600 * 1000) / count;

  for (let i = count - 1; i >= 0; i--) {
    let pointTime = now - i * stepMs;
    if (isStale && i === 0) {
      // Latest reading is 42 minutes ago (stale)
      pointTime = now - 42 * 60 * 1000;
    }

    const noise = Math.sin(i * 0.8) * 1.8;
    const moisture = Math.max(10, Math.min(95, +(base + noise).toFixed(1)));

    readings.push({
      id: `reading-${plotId}-${i}`,
      station_id: station.id,
      plot_id: plotId,
      moisture_pct: moisture,
      temperature_c: +(23.5 + Math.cos(i) * 2).toFixed(1),
      battery_pct: +(95 - i * 0.2).toFixed(1),
      measured_at: new Date(pointTime).toISOString(),
      created_at: new Date(pointTime).toISOString(),
    });
  }

  return readings;
}
