import { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

export const CARTO_DARK_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export const UK_BOUNDS = [
  [49.7, -8.7],
  [60.9, 2.1],
];

const incidentLocations = [
  {
    aliases: ["north ridge", "north ridge / high fell"],
    label: "North Ridge, Lake District",
    latitude: 54.5936,
    longitude: -3.1044,
  },
];

function normaliseLocation(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function resolveIncidentLocation(value) {
  if (!value) return null;
  const location = normaliseLocation(value);
  return (
    incidentLocations.find(({ aliases }) =>
      aliases.some((alias) => location.includes(normaliseLocation(alias))),
    ) || null
  );
}

function buildTeamMarker(team, isSelected) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = `map-marker team-marker ${team.status} ${isSelected ? "selected" : ""}`;
  marker.setAttribute(
    "aria-label",
    `${team.name}, ${team.location.label}, ${team.status}, ${team.etaMinutes} minute ETA`,
  );
  marker.title = `${team.name} · ${team.location.label} · ${team.etaMinutes} min ETA`;

  const dot = document.createElement("i");
  dot.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.textContent = team.name;
  marker.append(dot, label);
  return marker;
}

function buildIncidentMarker(location) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "incident-map-marker";
  marker.setAttribute("aria-label", `Incident at ${location.label}`);
  marker.title = `Incident · ${location.label}`;

  const pulse = document.createElement("i");
  pulse.setAttribute("aria-hidden", "true");
  const dot = document.createElement("span");
  pulse.append(dot);
  marker.append(pulse);
  return marker;
}

function popupContent({ heading, label, status, etaMinutes }) {
  const content = document.createElement("div");
  content.className = "map-popup-content";

  const title = document.createElement("strong");
  title.textContent = heading;
  const place = document.createElement("span");
  place.textContent = label;
  content.append(title, place);

  if (status) {
    const detail = document.createElement("small");
    detail.textContent = `${status.toUpperCase()} · ${etaMinutes} MIN ETA`;
    content.append(detail);
  }

  return content;
}

export default function MapPanel({ teams, incident, selected }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState(false);
  const location =
    incident?.fields?.find((field) => field.key === "exactLocation")?.value ||
    "Incident location";
  const incidentPoint = useMemo(() => resolveIncidentLocation(location), [location]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    try {
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        minZoom: 4,
        maxZoom: 13,
        maxBounds: [
          [48, -12],
          [63, 5],
        ],
        maxBoundsViscosity: 1,
      });
      mapRef.current = map;

      map.fitBounds(UK_BOUNDS, { padding: [28, 28], animate: false });
      L.control.zoom({ position: "topright" }).addTo(map);
      L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

      const tiles = L.tileLayer(CARTO_DARK_TILE_URL, {
        subdomains: "abcd",
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      });
      tiles.on("load", () => setMapError(false));
      tiles.on("tileerror", () => setMapError(true));
      tiles.addTo(map);
      map.whenReady(() => map.invalidateSize(false));

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch {
      setMapError(true);
      return undefined;
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const markers = teams
      .filter(
        (team) =>
          Number.isFinite(team.location?.latitude) &&
          Number.isFinite(team.location?.longitude),
      )
      .map((team) => {
        const element = buildTeamMarker(team, selected === team.id);
        const icon = L.divIcon({
          className: "operational-div-icon",
          html: element,
          iconSize: undefined,
          iconAnchor: undefined,
        });
        return L.marker([team.location.latitude, team.location.longitude], {
          icon,
          keyboard: true,
          riseOnHover: true,
          title: `${team.name} · ${team.location.label}`,
        })
          .bindPopup(
            popupContent({
              heading: team.name,
              label: team.location.label,
              status: team.status,
              etaMinutes: team.etaMinutes,
            }),
            { offset: [0, -12], closeButton: true },
          )
          .addTo(map);
      });

    return () => markers.forEach((marker) => marker.remove());
  }, [selected, teams]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !incidentPoint) return undefined;

    const element = buildIncidentMarker(incidentPoint);
    const icon = L.divIcon({
      className: "operational-div-icon incident-div-icon",
      html: element,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    const marker = L.marker([incidentPoint.latitude, incidentPoint.longitude], {
      icon,
      keyboard: true,
      zIndexOffset: 1000,
      title: `Incident · ${incidentPoint.label}`,
    })
      .bindPopup(popupContent({ heading: "INCIDENT", label: location }), {
        offset: [0, -16],
        closeButton: true,
      })
      .addTo(map);

    return () => marker.remove();
  }, [incidentPoint, location]);

  return (
    <section className="panel map-panel">
      <div className="panel-head">
        <div>
          <span className="step">04</span>
          <h2>Response map</h2>
        </div>
        <span className="badge live">SEEDED LOCATIONS</span>
      </div>
      <div
        className="map-canvas"
        role="region"
        aria-label={`Map of rescue teams and incident at ${location}`}
      >
        <div className="map-surface" ref={containerRef} />
        {mapError && (
          <div className="map-notice map-error" role="status">
            Map tiles unavailable
          </div>
        )}
        {!incidentPoint && (
          <div className="map-notice incident-unmapped" role="status">
            Incident location not mapped
          </div>
        )}
        <div className="map-legend" aria-label="Map legend">
          <span><i className="incident-dot" /> Incident</span>
          <span><i className="available-dot" /> Available</span>
          <span><i className="standby-dot" /> Standby</span>
          <span><i className="tasked-dot" /> Tasked</span>
        </div>
        <ul className="visually-hidden">
          {teams.map((team) => (
            <li key={team.id}>
              {team.name}, {team.location?.label || "location unavailable"}, {team.status},{" "}
              {team.etaMinutes} minute ETA
            </li>
          ))}
          {incidentPoint && <li>Incident at {location}</li>}
        </ul>
      </div>
    </section>
  );
}
