'use client';

import { useEffect, useState, useMemo } from 'react';
import type { FleetHealthSummary } from '@/lib/types';
import { COLORS } from '@/lib/constants';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StationGroup {
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  compressors: FleetHealthSummary[];
  worstStatus: 'healthy' | 'warning' | 'critical';
  healthyCt: number;
  warningCt: number;
  criticalCt: number;
}

export interface FleetMapProps {
  fleet: FleetHealthSummary[];
  selectedStationId?: string | null;
  onStationSelect?: (stationId: string | null) => void;
  linkPrefix?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function groupByStation(fleet: FleetHealthSummary[]): StationGroup[] {
  const map = new Map<string, StationGroup>();
  for (const c of fleet) {
    if (!c.latitude || !c.longitude) continue;
    const existing = map.get(c.station_id);
    if (existing) {
      existing.compressors.push(c);
      if (c.health_status === 'critical') {
        existing.worstStatus = 'critical';
        existing.criticalCt++;
      } else if (c.health_status === 'warning') {
        if (existing.worstStatus !== 'critical') existing.worstStatus = 'warning';
        existing.warningCt++;
      } else {
        existing.healthyCt++;
      }
    } else {
      const ct = { healthyCt: 0, warningCt: 0, criticalCt: 0 };
      if (c.health_status === 'critical') ct.criticalCt = 1;
      else if (c.health_status === 'warning') ct.warningCt = 1;
      else ct.healthyCt = 1;
      map.set(c.station_id, {
        station_id: c.station_id,
        station_name: c.station_name,
        latitude: c.latitude,
        longitude: c.longitude,
        compressors: [c],
        worstStatus: c.health_status,
        ...ct,
      });
    }
  }
  return Array.from(map.values());
}

const STATUS_COLORS: Record<string, string> = {
  healthy: COLORS.healthy,
  warning: COLORS.warning,
  critical: COLORS.critical,
};

/* ------------------------------------------------------------------ */
/*  FitBounds — auto-zoom to show all stations                         */
/* ------------------------------------------------------------------ */

function FitBoundsComponent({
  stations,
  useMapHook,
  L,
}: {
  stations: StationGroup[];
  useMapHook: typeof import('react-leaflet')['useMap'];
  L: typeof import('leaflet');
}) {
  const map = useMapHook();

  useEffect(() => {
    if (stations.length === 0) return;
    const bounds = L.latLngBounds(stations.map(s => [s.latitude, s.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
  }, [stations, map, L]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  DivIcon HTML builder                                               */
/* ------------------------------------------------------------------ */

function buildMarkerHtml(station: StationGroup, isSelected: boolean): string {
  const color = STATUS_COLORS[station.worstStatus];
  const ringColor = isSelected ? '#C4A77D' : color;
  const ringWidth = isSelected ? '3px' : '2px';
  const pipelineCount = station.compressors.length;

  return `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: white;
        border: ${ringWidth} solid ${ringColor};
        box-shadow: 0 2px 8px rgba(0,0,0,0.15)${isSelected ? ', 0 0 0 4px rgba(196,167,125,0.25)' : ''};
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        font-weight: 700;
        color: ${color};
      ">${pipelineCount}</div>
      <div style="
        margin-top: 4px;
        background: white;
        border-radius: 4px;
        padding: 1px 6px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        font-family: Inter, -apple-system, sans-serif;
        font-size: 10px;
        font-weight: 600;
        color: #1C1917;
        white-space: nowrap;
      ">${station.station_name}</div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Popup HTML builder                                                 */
/* ------------------------------------------------------------------ */

function buildPopupContent(station: StationGroup, linkPrefix: string): string {
  const statusDot = (s: string) =>
    `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${STATUS_COLORS[s]};"></span>`;

  const summary: string[] = [];
  if (station.healthyCt > 0) summary.push(`${station.healthyCt} healthy`);
  if (station.warningCt > 0) summary.push(`${station.warningCt} warning`);
  if (station.criticalCt > 0) summary.push(`${station.criticalCt} critical`);

  const pipelineList = station.compressors
    .map(
      c => `<li style="display:flex;align-items:center;gap:6px;padding:3px 0;">
        ${statusDot(c.health_status)}
        <a href="${linkPrefix}/${c.compressor_id}" style="color:#1C1917;text-decoration:none;font-size:13px;font-weight:500;">${c.compressor_id}</a>
        <span style="color:#A8A29E;font-size:11px;margin-left:auto;">${c.model}</span>
      </li>`
    )
    .join('');

  return `
    <div style="font-family:Inter,-apple-system,sans-serif;min-width:180px;">
      <p style="font-weight:700;font-size:14px;color:#1C1917;margin:0 0 2px;">${station.station_name}</p>
      <p style="font-size:11px;color:#78716C;margin:0 0 8px;">${summary.join(' · ')}</p>
      <ul style="list-style:none;margin:0;padding:0;">${pipelineList}</ul>
    </div>
  `;
}

/* ================================================================== */
/*  FleetMap                                                           */
/* ================================================================== */

export default function FleetMap({
  fleet,
  selectedStationId = null,
  onStationSelect,
  linkPrefix = '/dashboard/monitoring',
}: FleetMapProps) {
  const [MapModules, setMapModules] = useState<{
    MapContainer: typeof import('react-leaflet')['MapContainer'];
    TileLayer: typeof import('react-leaflet')['TileLayer'];
    Marker: typeof import('react-leaflet')['Marker'];
    Popup: typeof import('react-leaflet')['Popup'];
    useMap: typeof import('react-leaflet')['useMap'];
    L: typeof import('leaflet');
  } | null>(null);

  useEffect(() => {
    Promise.all([import('react-leaflet'), import('leaflet')]).then(
      ([rl, leaflet]) => {
        setMapModules({
          MapContainer: rl.MapContainer,
          TileLayer: rl.TileLayer,
          Marker: rl.Marker,
          Popup: rl.Popup,
          useMap: rl.useMap,
          L: leaflet.default ?? leaflet,
        });
      }
    );
    // @ts-expect-error -- CSS import handled by bundler at runtime
    import('leaflet/dist/leaflet.css');
  }, []);

  const stations = useMemo(() => groupByStation(fleet), [fleet]);

  if (!MapModules) {
    return (
      <div className="h-full bg-surface border border-border rounded-[--radius-card] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap, L } = MapModules;

  return (
    <div className="h-full rounded-[--radius-card] overflow-hidden border border-border">
      <MapContainer
        center={[30.5, -98.5]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <FitBoundsComponent stations={stations} useMapHook={useMap} L={L} />

        {stations.map(station => {
          const isSelected = selectedStationId === station.station_id;
          const icon = new L.DivIcon({
            html: buildMarkerHtml(station, isSelected),
            className: '',
            iconSize: [80, 60],
            iconAnchor: [40, 30],
          });

          return (
            <Marker
              key={station.station_id}
              position={[station.latitude, station.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onStationSelect) {
                    onStationSelect(isSelected ? null : station.station_id);
                  }
                },
              }}
            >
              <Popup>
                <div
                  dangerouslySetInnerHTML={{
                    __html: buildPopupContent(station, linkPrefix),
                  }}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
