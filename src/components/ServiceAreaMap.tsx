"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";

export type ServiceCity = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  cities: ServiceCity[];
  activeIds: Set<string>;
  onToggle: (id: string) => void;
};

export default function ServiceAreaMap({ cities, activeIds, onToggle }: Props) {
  return (
    <MapContainer
      center={[32.85, -96.95]}
      zoom={9}
      scrollWheelZoom={false}
      style={{ height: "320px", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {cities.map((city) => {
        const active = activeIds.has(city.id);
        return (
          <CircleMarker
            key={city.id}
            center={[city.lat, city.lng]}
            radius={active ? 12 : 8}
            pathOptions={{
              color: active ? "#1D4ED8" : "#9CA3AF",
              fillColor: active ? "#2563EB" : "#D1D5DB",
              fillOpacity: active ? 0.85 : 0.55,
              weight: active ? 2.5 : 1.5,
            }}
            eventHandlers={{
              click: () => onToggle(city.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={false}>
              <span className="text-[12px] font-semibold">
                {city.name} {active ? "(active)" : "(tap to add)"}
              </span>
            </Tooltip>
            <Popup>
              <div className="text-[12px]">
                <p className="font-bold">{city.name}</p>
                <p className="text-text-secondary">
                  {active ? "Currently serving" : "Not yet served"}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
