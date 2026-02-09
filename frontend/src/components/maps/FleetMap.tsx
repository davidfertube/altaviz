'use client';

import { useEffect, useState } from 'react';
import type { FleetHealthSummary } from '@/lib/types';
import { COLORS } from '@/lib/constants';

interface StationGroup {
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  compressors: FleetHealthSummary[];
  worstStatus: 'healthy' | 'warning' | 'critical';
}

function groupByStation(fleet: FleetHealthSummary[]): StationGroup[] {
  const map = new Map<string, StationGroup>();
  for (const c of fleet) {
    if (!c.latitude || !c.longitude) continue;
    const existing = map.get(c.station_id);
    if (existing) {
      existing.compressors.push(c);
      if (c.health_status === 'critical') existing.worstStatus = 'critical';
      else if (c.health_status === 'warning' && existing.worstStatus !== 'critical') existing.worstStatus = 'warning';
    } else {
      map.set(c.station_id, {
        station_id: c.station_id,
        station_name: c.station_name,
        latitude: c.latitude,
        longitude: c.longitude,
        compressors: [c],
        worstStatus: c.health_status,
      });
    }
  }
  return Array.from(map.values());
}

const STATUS_COLORS = {
  healthy: COLORS.healthy,
  warning: COLORS.warning,
  critical: COLORS.critical,
};

export default function FleetMap({ fleet }: { fleet: FleetHealthSummary[] }) {
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import('react-leaflet')['MapContainer'];
    TileLayer: typeof import('react-leaflet')['TileLayer'];
    CircleMarker: typeof import('react-leaflet')['CircleMarker'];
    Popup: typeof import('react-leaflet')['Popup'];
  } | null>(null);

  useEffect(() => {
    import('react-leaflet').then(mod => {
      setMapComponents({
        MapContainer: mod.MapContainer,
        TileLayer: mod.TileLayer,
        CircleMarker: mod.CircleMarker,
        Popup: mod.Popup,
      });
    });
    // @ts-expect-error -- CSS import handled by bundler at runtime
    import('leaflet/dist/leaflet.css');
  }, []);

  const stations = groupByStation(fleet);

  if (!MapComponents) {
    return (
      <div className="h-full bg-surface border border-border rounded-[--radius-card] flex items-center justify-center">
        <p className="text-sm text-muted">Loading map...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = MapComponents;

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
        {stations.map(station => (
          <CircleMarker
            key={station.station_id}
            center={[station.latitude, station.longitude]}
            radius={14}
            pathOptions={{
              fillColor: STATUS_COLORS[station.worstStatus],
              color: STATUS_COLORS[station.worstStatus],
              fillOpacity: 0.3,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{station.station_name}</p>
                <p className="text-gray-600">{station.compressors.length} compressors</p>
                <ul className="mt-1 space-y-0.5">
                  {station.compressors.map(c => (
                    <li key={c.compressor_id} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        c.health_status === 'healthy' ? 'bg-green-500' :
                        c.health_status === 'warning' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`} />
                      <span>{c.compressor_id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
