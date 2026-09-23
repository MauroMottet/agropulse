export type UserRole = 'producer' | 'operator' | 'advisor';

export type SemaphoreState = 'stale' | 'dry' | 'optimal' | 'wet';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Plot {
  id: string;
  organization_id: string;
  name: string;
  crop_type: string;
  polygon: GeoPoint[];
  threshold_min: number;
  threshold_max: number;
  created_at: string;
}

export interface Station {
  id: string;
  organization_id: string;
  plot_id: string;
  name: string;
  hardware_id: string;
  lat: number;
  lng: number;
  created_at: string;
}

export interface Reading {
  id: string;
  station_id: string;
  plot_id: string;
  moisture_pct: number;
  temperature_c: number;
  battery_pct: number;
  measured_at: string;
  created_at: string;
}

export interface Valve {
  id: string;
  organization_id: string;
  plot_id: string;
  name: string;
  status: 'open' | 'closed';
  last_command_at: string | null;
  created_at: string;
}

export interface IrrigationCommand {
  id: string;
  organization_id: string;
  valve_id: string;
  requested_by: string | null;
  action: 'open' | 'close';
  status: 'pending' | 'applied' | 'failed';
  client_request_id: string;
  error_message: string | null;
  created_at: string;
  executed_at: string | null;
}

export interface PlotWithTelemetry extends Plot {
  lastReading?: Reading;
  status: SemaphoreState;
  valve?: Valve;
  activeCommand?: IrrigationCommand;
}
