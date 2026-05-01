"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMapEvents } from "react-leaflet";
import { useEffect } from "react";

export type ServiceCity = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  custom?: boolean;
};

type Props = {
  cities: ServiceCity[];
  activeIds: Set<string>;
  onToggle: (id: string) => void;
  dropPinMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
};

function MapClickHandler({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick?: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click: (e) => {
      if (!enabled || !onClick) return;
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    const container = map.getContainer();
    if (enabled) {
      container.style.cursor = "crosshair";
    } else {
      container.style.cursor = "";
    }
    return () => {
      container.style.cursor = "";
    };
  }, [enabled, map]);

  return null;
}

export default function ServiceAreaMap({
  cities,
  activeIds,
  onToggle,
  dropPinMode = false,
  onMapClick,
}: Props) {
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
      <MapClickHandler enabled={dropPinMode} onClick={onMapClick} />
      {cities.map((city) => {
        const active = activeIds.has(city.id);
        const isCustom = city.custom;
        return (
          <CircleMarker
            key={city.id}
            center={[city.lat, city.lng]}
            radius={active ? 12 : 8}
            pathOptions={{
              color: isCustom
                ? active
                  ? "#7C3AED"
                  : "#A78BFA"
                : active
                  ? "#3E7B7E"
                  : "#9CA3AF",
              fillColor: isCustom
                ? active
                  ? "#8B5CF6"
                  : "#C4B5FD"
                : active
                  ? "#4F9598"
                  : "#D1D5DB",
              fillOpacity: active ? 0.85 : 0.55,
              weight: active ? 2.5 : 1.5,
            }}
            eventHandlers={{
              click: () => {
                if (dropPinMode) return;
                onToggle(city.id);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={false}>
              <span className="text-[12px] font-semibold">
                {city.name} {active ? "(active)" : "(tap to add)"}
                {isCustom ? " *" : ""}
              </span>
            </Tooltip>
            <Popup>
              <div className="text-[12px]">
                <p className="font-bold">
                  {city.name}
                  {isCustom ? " (custom)" : ""}
                </p>
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
