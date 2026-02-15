// Mirrors config/thresholds.yaml

export const COLORS = {
  primary: '#1F77B4',
  primaryLight: '#4A9BD9',
  primaryDark: '#15567D',
  healthy: '#2CA02C',
  healthyLight: '#47C747',
  warning: '#FF7F0E',
  warningLight: '#FFB347',
  critical: '#D62728',
  criticalLight: '#E85D5E',
  background: '#F8F9FA',
  backgroundDark: '#0D1117',
  surfaceDark: '#161B22',
  borderDark: '#30363D',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textDark: '#E6EDF3',
} as const;

export const SENSOR_THRESHOLDS = {
  vibration_mms: {
    normal_range: [1.5, 4.5] as [number, number],
    warning: 6.0,
    critical: 8.0,
    unit: 'mm/s',
    label: 'Vibration',
  },
  discharge_temp_f: {
    normal_range: [180, 220] as [number, number],
    warning: 240,
    critical: 260,
    unit: '\u00B0F',
    label: 'Temperature',
  },
  suction_pressure_psi: {
    normal_range: [40, 80] as [number, number],
    warning_low: 30,
    critical_low: 20,
    unit: 'PSI',
    label: 'Inlet Pressure',
    inverted: true,
  },
  discharge_pressure_psi: {
    normal_range: [900, 1200] as [number, number],
    warning: 1300,
    critical: 1400,
    unit: 'PSI',
    label: 'Outlet Pressure',
  },
  horsepower_consumption: {
    normal_range: [1200, 1600] as [number, number],
    warning: 1800,
    unit: 'HP',
    label: 'Flow Rate',
  },
  gas_flow_mcf: {
    normal_range: [8000, 12000] as [number, number],
    warning_low: 6000,
    unit: 'Mcf/day',
    label: 'Gas Flow',
    inverted: true,
  },
} as const;

export const DERIVED_THRESHOLDS = {
  pressure_differential: {
    normal_range: [800, 1150] as [number, number],
    warning: 1250,
    unit: 'PSI',
    label: 'Pressure Differential',
  },
  temp_rate_of_change: {
    warning: 20.0,
    critical: 40.0,
    unit: '\u00B0F/hr',
    label: 'Temp Rate of Change',
  },
} as const;

export const WINDOW_OPTIONS = [
  { value: '1hr' as const, label: '1 Hour' },
  { value: '4hr' as const, label: '4 Hours' },
  { value: '24hr' as const, label: '24 Hours' },
];

export const TIME_RANGE_OPTIONS = [
  { value: '1h' as const, label: '1H' },
  { value: '4h' as const, label: '4H' },
  { value: '24h' as const, label: '24H' },
  { value: '7d' as const, label: '7D' },
];

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Fleet Overview', icon: 'grid' },
  { href: '/dashboard/monitoring', label: 'Monitoring', icon: 'activity' },
  { href: '/dashboard/alerts', label: 'Alerts', icon: 'bell' },
  { href: '/dashboard/data-quality', label: 'Data Quality', icon: 'check-circle' },
] as const;
