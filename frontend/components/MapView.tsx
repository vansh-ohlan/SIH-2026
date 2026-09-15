"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  Polygon,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature } from "geojson";
import { useRouter } from "next/navigation";
import {
  getPilotRegions,
  getMapParcelsByRegion,
  getEncroachmentAlerts,
  getUtilityLines,
} from "@/lib/api";
import {
  GeoFeatureCollection,
  PilotRegion,
  RegionId,
  EncroachmentAlert,
  UtilityLine,
  GeoFeatureProperties,
} from "@/lib/types";

// ==========================================
// Color Palettes & Legend Constants
// ==========================================
const LAND_USE_COLORS: Record<string, string> = {
  Residential: "#C08A28", // Ochre
  Agricultural: "#2F5233", // Land green
  Commercial: "#14213D", // Ink
  Industrial: "#B0432D", // Brick
  "Restriction Zone": "#7C2D12", // Deep amber/brown
  "Eco-Sensitive": "#047857", // Deep emerald
};

const ZONING_COLORS: Record<string, string> = {
  Residential: "#DDA84B",
  Commercial: "#233257",
  Industrial: "#991B1B",
  Agricultural: "#3E6B43",
  "Restriction Zone": "#B91C1C", // Vivid crimson for restricted greenbelts
  "Eco-Sensitive": "#059669",
};

const TAX_BAND_COLORS: Record<string, string> = {
  "Band A (Prime Commercial)": "#14213D",
  "Band B (Standard Residential)": "#C08A28",
  "Band C (Agricultural/Rural)": "#8F6518",
};

const UTILITY_COLORS: Record<string, string> = {
  power_grid: "#EAB308", // Electric yellow
  water_main: "#0284C7", // Cyan water
  stormwater_drain: "#0D9488", // Teal drainage
};

// ==========================================
// Camera Pan Helper Component
// ==========================================
function MapController({
  center,
  zoom,
}: {
  center: [number, number] | null;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
    }
  }, [center, zoom, map]);
  return null;
}

// ==========================================
// Main Cadastral Map View Component
// ==========================================
export default function MapView({
  focus,
}: {
  focus?: [number, number] | null;
}) {
  const router = useRouter();

  // Region State (Multi-State Jumper)
  const [regions, setRegions] = useState<PilotRegion[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<RegionId>("punjab");
  const [mapCenter, setMapCenter] = useState<[number, number]>([30.908, 75.855]);
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Data State
  const [parcelsGeo, setParcelsGeo] = useState<GeoFeatureCollection | null>(null);
  const [encroachments, setEncroachments] = useState<EncroachmentAlert[]>([]);
  const [utilities, setUtilities] = useState<UtilityLine[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<GeoFeatureProperties | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<EncroachmentAlert | null>(null);

  // Layer Visibility Controls (Land Stack Framework)
  const [baseLayerType, setBaseLayerType] = useState<"osm" | "satellite">("osm");
  const [showUlpinBadges, setShowUlpinBadges] = useState<boolean>(true);
  const [colorMode, setColorMode] = useState<"land_use" | "zoning" | "tax_bands">("land_use");
  const [showEncroachmentAlerts, setShowEncroachmentAlerts] = useState<boolean>(true);
  const [showUtilities, setShowUtilities] = useState<boolean>(false);
  const [controlPanelOpen, setControlPanelOpen] = useState<boolean>(true);

  // Load Regions Metadata
  useEffect(() => {
    getPilotRegions().then((regs) => {
      setRegions(regs);
    });
  }, []);

  // Load Region Specific Data
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getMapParcelsByRegion(activeRegionId),
      getEncroachmentAlerts(activeRegionId),
      getUtilityLines(activeRegionId),
    ]).then(([geo, alerts, utilLines]) => {
      if (!isMounted) return;
      setParcelsGeo(geo);
      setEncroachments(alerts);
      setUtilities(utilLines);
      setSelectedParcel(null);
      setSelectedAlert(null);
    });
    return () => {
      isMounted = false;
    };
  }, [activeRegionId]);

  // Sync external focus prop
  useEffect(() => {
    if (focus) {
      setMapCenter(focus);
      setMapZoom(16);
    }
  }, [focus]);

  // Handle Region Jumper Selection
  const handleRegionSwitch = (region: PilotRegion) => {
    setActiveRegionId(region.id);
    setMapCenter(region.center);
    setMapZoom(region.zoom);
  };

  // Dynamic GeoJSON Polygon Styler based on Land Stack layer selection
  const getParcelStyle = (feature?: Feature): PathOptions => {
    const props = feature?.properties as GeoFeatureProperties | undefined;
    if (!props) return { color: "#14213D", weight: 1.5 };

    const isSelected = selectedParcel?.ulpid === props.ulpid;

    let fillColor = "#14213D";
    if (colorMode === "land_use") {
      fillColor = LAND_USE_COLORS[props.land_use] || "#14213D";
    } else if (colorMode === "zoning") {
      fillColor = (props.zoning && ZONING_COLORS[props.zoning]) || LAND_USE_COLORS[props.land_use] || "#14213D";
    } else if (colorMode === "tax_bands") {
      if (props.tax_arrears) {
        fillColor = "#B0432D"; // Highlighting tax arrears in alert red
      } else {
        fillColor = (props.tax_band && TAX_BAND_COLORS[props.tax_band]) || "#8F6518";
      }
    }

    const isRestriction = props.zoning === "Restriction Zone" || props.zoning === "Eco-Sensitive";

    return {
      color: isSelected ? "#FF0055" : isRestriction ? "#B91C1C" : fillColor,
      weight: isSelected ? 3 : isRestriction ? 2.5 : 1.5,
      dashArray: isRestriction ? "8 4" : "5 4",
      fillColor,
      fillOpacity: isSelected ? 0.6 : isRestriction ? 0.45 : baseLayerType === "satellite" ? 0.35 : 0.25,
      className: "parcel-polygon",
    };
  };

  // Parcel Feature Interactions
  const onEachParcel = (feature: Feature, layer: Layer) => {
    const props = feature.properties as GeoFeatureProperties;

    // Interactive Hover & Click Handler
    layer.on({
      mouseover: (e) => {
        const target = e.target;
        target.setStyle({
          fillOpacity: 0.55,
          weight: 2.5,
        });
      },
      mouseout: (e) => {
        const target = e.target;
        if (selectedParcel?.ulpid !== props.ulpid) {
          target.setStyle({
            fillOpacity: baseLayerType === "satellite" ? 0.35 : 0.25,
            weight: 1.5,
          });
        }
      },
      click: () => {
        setSelectedParcel(props);
        setSelectedAlert(null);
      },
    });
  };

  // Active Region Object
  const currentRegion = useMemo(
    () => regions.find((r) => r.id === activeRegionId) || regions[0],
    [regions, activeRegionId]
  );

  return (
    <div className="relative h-full w-full overflow-hidden font-sans">
      {/* =================================================================== */}
      {/* TOP-LEFT: Multi-State Region Jumper (Land Stack Framework) */}
      {/* =================================================================== */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-1.5 rounded-sm bg-parchment/95 p-1.5 plot-border-solid shadow-[4px_4px_0_rgba(20,33,61,0.18)] backdrop-blur">
        <div className="flex items-center gap-1.5 px-2.5 pt-1 text-[10px] font-mono uppercase tracking-wider text-ink/60">
          <span className="h-2 w-2 rounded-full bg-land animate-pulse" />
          <span>Multi-State Pilot Jumper</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {regions.map((reg) => {
            const isActive = reg.id === activeRegionId;
            return (
              <button
                key={reg.id}
                onClick={() => handleRegionSwitch(reg)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-ink text-parchment shadow-sm"
                    : "bg-parchment-dark/60 text-ink/75 hover:bg-ink/10 hover:text-ink"
                }`}
              >
                <span className="font-mono text-[11px] opacity-70">
                  {reg.id === "punjab" ? "📍 PB" : reg.id === "chandigarh" ? "📍 CH" : "📍 TN"}
                </span>
                <span>{reg.name}</span>
              </button>
            );
          })}
        </div>
        {currentRegion && (
          <div className="px-2 pb-1 text-[11px] text-ink/60 max-w-xs truncate">
            {currentRegion.description}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* TOP-RIGHT: Land Stack 3-Tier Layer Controls */}
      {/* =================================================================== */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end">
        <button
          onClick={() => setControlPanelOpen(!controlPanelOpen)}
          className="flex items-center gap-2 rounded-sm bg-parchment/95 px-3 py-1.5 text-xs font-medium text-ink plot-border-solid shadow-[3px_3px_0_rgba(20,33,61,0.18)] backdrop-blur hover:bg-parchment"
        >
          <span className="font-mono text-ochre-dark">❖</span>
          <span>{controlPanelOpen ? "Hide Layers" : "Layer Controls"}</span>
        </button>

        {controlPanelOpen && (
          <div className="mt-2 w-72 rounded-sm bg-parchment/95 p-3.5 plot-border-solid shadow-[5px_5px_0_rgba(20,33,61,0.22)] backdrop-blur max-h-[calc(100vh-140px)] overflow-y-auto">
            <div className="border-b border-ink/15 pb-2">
              <span className="font-serif text-sm font-semibold text-ink">
                Geospatial Layers
              </span>
              <p className="text-[10px] text-ink/60">
                Land Stack 3-Tier Architecture
              </p>
            </div>

            {/* 1. Base Imagery Toggle */}
            <div className="mt-3">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-ink/60">
                1. Base Imagery Layer
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1 rounded bg-ink/5 p-1">
                <button
                  onClick={() => setBaseLayerType("osm")}
                  className={`rounded py-1 text-xs font-medium transition ${
                    baseLayerType === "osm"
                      ? "bg-ink text-parchment shadow"
                      : "text-ink/70 hover:text-ink"
                  }`}
                >
                  🗺️ Cadastral Map
                </button>
                <button
                  onClick={() => setBaseLayerType("satellite")}
                  className={`rounded py-1 text-xs font-medium transition ${
                    baseLayerType === "satellite"
                      ? "bg-ink text-parchment shadow"
                      : "text-ink/70 hover:text-ink"
                  }`}
                >
                  🛰️ Satellite High-Res
                </button>
              </div>
            </div>

            {/* 2. Base Cadastral Options */}
            <div className="mt-3 border-t border-ink/10 pt-2.5">
              <label className="flex items-center justify-between text-xs text-ink cursor-pointer">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="font-mono text-xs text-ochre">#</span> ULPIN Badges
                </span>
                <input
                  type="checkbox"
                  checked={showUlpinBadges}
                  onChange={(e) => setShowUlpinBadges(e.target.checked)}
                  className="accent-ink cursor-pointer"
                />
              </label>
            </div>

            {/* 3. Essential Layer: Zoning / Classification State */}
            <div className="mt-3 border-t border-ink/10 pt-2.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-ink/60">
                2. Essential Zoning Layer
              </label>
              <div className="mt-1.5 flex flex-col gap-1">
                {[
                  ["land_use", "Land Use Classification"],
                  ["zoning", "Statutory Zoning & Restrictions"],
                  ["tax_bands", "Tax Valuation & Arrears Bands"],
                ].map(([modeKey, label]) => (
                  <button
                    key={modeKey}
                    onClick={() => setColorMode(modeKey as any)}
                    className={`flex items-center justify-between rounded px-2 py-1 text-left text-xs transition ${
                      colorMode === modeKey
                        ? "bg-ochre/25 text-ink font-semibold border border-ochre/60"
                        : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                    }`}
                  >
                    <span>{label}</span>
                    {colorMode === modeKey && (
                      <span className="h-1.5 w-1.5 rounded-full bg-ochre-dark" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. AI/ML Change Detection Overlay */}
            <div className="mt-3 border-t border-ink/10 pt-2.5">
              <div className="rounded border border-[#FF0055]/30 bg-[#FF0055]/5 p-2">
                <label className="flex items-center justify-between text-xs text-ink cursor-pointer">
                  <span className="flex items-center gap-1.5 font-medium text-[#B91C1C]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF0055] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF0055]" />
                    </span>
                    AI Encroachment Alerts
                  </span>
                  <input
                    type="checkbox"
                    checked={showEncroachmentAlerts}
                    onChange={(e) => setShowEncroachmentAlerts(e.target.checked)}
                    className="accent-[#FF0055] cursor-pointer"
                  />
                </label>
                <div className="mt-1 text-[10px] text-ink/60">
                  {encroachments.length} satellite change detections active in region
                </div>
              </div>
            </div>

            {/* 5. Use-Case Layer: Utility Infrastructure */}
            <div className="mt-3 border-t border-ink/10 pt-2.5">
              <label className="flex items-center justify-between text-xs text-ink cursor-pointer">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="text-sm">⚡</span> Utility Infrastructure
                </span>
                <input
                  type="checkbox"
                  checked={showUtilities}
                  onChange={(e) => setShowUtilities(e.target.checked)}
                  className="accent-ink cursor-pointer"
                />
              </label>
              <div className="mt-1 text-[10px] text-ink/50">
                Power corridors, potable water mains &amp; drain canals
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* BOTTOM-LEFT: Selected Parcel or AI Alert Inspector Card */}
      {/* =================================================================== */}
      {selectedParcel && (
        <div className="absolute bottom-4 left-4 z-[1000] w-80 rounded-sm bg-parchment/95 p-4 plot-border-solid shadow-[5px_5px_0_rgba(20,33,61,0.22)] backdrop-blur">
          <div className="flex items-start justify-between border-b border-ink/15 pb-2">
            <div>
              <span className="font-mono text-[11px] text-ink/50">
                {selectedParcel.ulpid}
              </span>
              <h4 className="font-serif text-base font-semibold text-ink">
                {selectedParcel.owner_name ?? "Parcel Record"}
              </h4>
            </div>
            <button
              onClick={() => setSelectedParcel(null)}
              className="text-xs text-ink/50 hover:text-ink"
            >
              ✕
            </button>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-ink/50 uppercase font-mono">Zoning</span>
              <div className="font-medium text-ink">
                {selectedParcel.zoning ?? selectedParcel.land_use}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-ink/50 uppercase font-mono">Area</span>
              <div className="font-medium text-ink">
                {selectedParcel.area_sqm?.toLocaleString() ?? "—"} sqm
              </div>
            </div>
            <div>
              <span className="text-[10px] text-ink/50 uppercase font-mono">Valuation</span>
              <div className="font-medium text-ink">
                {selectedParcel.tax_band ?? "Band B (Mid)"}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-ink/50 uppercase font-mono">Tax Arrears</span>
              <div
                className={`font-medium ${
                  selectedParcel.tax_arrears ? "text-brick font-semibold" : "text-land"
                }`}
              >
                {selectedParcel.tax_arrears ? "Pending Dues" : "Zero Dues"}
              </div>
            </div>
          </div>

          {selectedParcel.zoning === "Restriction Zone" || selectedParcel.zoning === "Eco-Sensitive" ? (
            <div className="mt-2.5 rounded bg-brick/10 p-2 text-[11px] text-brick border border-brick/30 font-medium">
              ⚠️ Statutory Restriction Zone: Construction and commercial conversion strictly prohibited.
            </div>
          ) : null}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => router.push(`/parcel/${selectedParcel.ulpid}`)}
              className="w-full rounded-sm bg-ink px-3 py-1.5 text-center text-xs font-medium text-parchment hover:bg-ink-light transition"
            >
              View Full Deed &amp; Mutation History →
            </button>
          </div>
        </div>
      )}

      {selectedAlert && (
        <div className="absolute bottom-4 left-4 z-[1000] w-84 rounded-sm bg-parchment/95 p-4 plot-border-solid shadow-[5px_5px_0_rgba(20,33,61,0.22)] backdrop-blur border-l-4 border-l-[#FF0055]">
          <div className="flex items-start justify-between border-b border-ink/15 pb-2">
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#FF0055]">
                <span className="h-2 w-2 rounded-full bg-[#FF0055] animate-ping" />
                <span>AI SATELLITE ENCROACHMENT ALERT</span>
              </div>
              <h4 className="font-serif text-sm font-semibold text-ink mt-0.5">
                {selectedAlert.id} · {selectedAlert.ulpid}
              </h4>
            </div>
            <button
              onClick={() => setSelectedAlert(null)}
              className="text-xs text-ink/50 hover:text-ink"
            >
              ✕
            </button>
          </div>

          <p className="mt-2 text-xs text-ink/80 leading-relaxed">
            {selectedAlert.description}
          </p>

          <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs bg-[#FF0055]/5 p-2 rounded">
            <div>
              <span className="text-[10px] text-ink/50 uppercase font-mono">Encroached Area</span>
              <div className="font-bold text-ink">{selectedAlert.area_sqm} sqm</div>
            </div>
            <div>
              <span className="text-[10px] text-ink/50 uppercase font-mono">AI Model Confidence</span>
              <div className="font-bold text-[#B91C1C]">
                {(selectedAlert.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => router.push(`/parcel/${selectedAlert.ulpid}`)}
              className="w-full rounded-sm bg-[#B91C1C] px-3 py-1.5 text-center text-xs font-medium text-parchment hover:bg-[#991B1B] transition"
            >
              Examine Affected Parcel →
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* BOTTOM-RIGHT: Dynamic Legend */}
      {/* =================================================================== */}
      <div className="absolute bottom-4 right-4 z-[1000] hidden sm:flex flex-col gap-1.5 rounded-sm bg-parchment/95 p-2.5 plot-border-solid shadow-[3px_3px_0_rgba(20,33,61,0.18)] backdrop-blur text-[11px]">
        <div className="font-mono text-[10px] font-semibold text-ink/60 uppercase">
          Active Layer: {colorMode.replace("_", " ")}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {colorMode === "land_use" &&
            Object.entries(LAND_USE_COLORS).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                <span>{label}</span>
              </span>
            ))}

          {colorMode === "zoning" &&
            Object.entries(ZONING_COLORS).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                <span>{label}</span>
              </span>
            ))}

          {colorMode === "tax_bands" && (
            <>
              {Object.entries(TAX_BAND_COLORS).map(([label, color]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                  <span>{label}</span>
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-brick font-medium">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#B0432D]" />
                <span>Tax Arrears Alert</span>
              </span>
            </>
          )}
        </div>

        {showEncroachmentAlerts && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-ink/10 text-[#B91C1C]">
            <span className="h-2 w-2 rounded-full bg-[#FF0055] animate-ping" />
            <span className="font-medium">Neon Box: AI Change Detection / Encroachment</span>
          </div>
        )}

        {showUtilities && (
          <div className="flex flex-col gap-1 pt-1 border-t border-ink/10">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-amber-600">
                <span className="h-1 w-4 border-t-2 border-dashed border-yellow-500 inline-block" /> HT Power Corridor
              </span>
              <span className="flex items-center gap-1 text-sky-600">
                <span className="h-1 w-4 bg-sky-600 inline-block" /> Water Main
              </span>
              <span className="flex items-center gap-1 text-teal-600">
                <span className="h-1 w-4 bg-teal-600 inline-block" /> Storm Drain
              </span>
            </div>
            <div className="flex items-center gap-1 text-amber-700 text-[10px]">
              <span className="h-2.5 w-4 border border-dashed border-yellow-500 bg-yellow-400/20 inline-block rounded-sm" />
              Statutory Safety Buffer Zone
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* LEAFLET MAP CONTAINER */}
      {/* =================================================================== */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: baseLayerType === "satellite" ? "#111" : "#E3E1D2" }}
      >
        {/* Layer 1: Base Imagery Switching */}
        {baseLayerType === "osm" ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            opacity={0.6}
          />
        ) : (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            opacity={0.85}
          />
        )}

        {/* Layer 2: Cadastral GeoJSON Parcels */}
        {parcelsGeo && (
          <GeoJSON
            key={`${activeRegionId}-${colorMode}-${baseLayerType}-${selectedParcel?.ulpid ?? ""}`}
            data={parcelsGeo as any}
            style={getParcelStyle}
            onEachFeature={onEachParcel}
          />
        )}

        {/* Layer 2b: Permanent/Hover ULPIN Badges */}
        {showUlpinBadges &&
          parcelsGeo?.features.map((f) => {
            const coords = f.geometry.coordinates[0];
            // Center centroid calculation
            const avgLat = (coords[0][1] + coords[2][1]) / 2;
            const avgLng = (coords[0][0] + coords[2][0]) / 2;

            return (
              <Polygon
                key={`ulpin-${f.properties.ulpid}`}
                positions={coords.map(([lng, lat]) => [lat, lng])}
                pathOptions={{ opacity: 0, fillOpacity: 0 }}
              >
                <Tooltip
                  permanent={showUlpinBadges}
                  direction="center"
                  className="ulpin-map-label"
                >
                  {f.properties.ulpid}
                </Tooltip>
              </Polygon>
            );
          })}

        {/* Layer 2c: AI/ML Change Detection Encroachment Overlays */}
        {showEncroachmentAlerts &&
          encroachments.map((alert) => {
            const polygonCoords = alert.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
            const isSelected = selectedAlert?.id === alert.id;

            return (
              <Polygon
                key={alert.id}
                positions={polygonCoords}
                pathOptions={{
                  color: "#FF0055",
                  weight: isSelected ? 3.5 : 2.5,
                  fillColor: "#FF0055",
                  fillOpacity: isSelected ? 0.45 : 0.28,
                  dashArray: "4 3",
                  className: "neon-encroachment-alert",
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedAlert(alert);
                    setSelectedParcel(null);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <div className="font-sans text-xs">
                    <div className="font-bold text-[#FF0055]">⚠️ AI Encroachment Alert</div>
                    <div className="font-mono text-[10px] text-ink/70">{alert.id} · {alert.area_sqm} sqm</div>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* Layer 3a: Power Corridor Safety Buffer Zones (Statutory Clearance Polygons) */}
        {showUtilities &&
          utilities
            .filter((line) => line.type === "power_grid" && line.buffer_polygon && line.buffer_polygon.length > 0)
            .map((line) => (
              <Polygon
                key={`buf-${line.id}`}
                positions={line.buffer_polygon!}
                pathOptions={{
                  color: "#EAB308",
                  weight: 1.5,
                  dashArray: "6 4",
                  fillColor: "#EAB308",
                  fillOpacity: 0.10,
                  opacity: 0.55,
                  className: "power-buffer-corridor",
                }}
              >
                <Tooltip direction="center" sticky opacity={0.95}>
                  <div className="font-sans text-xs">
                    <div className="font-bold text-amber-700">⚡ Statutory Safety Buffer</div>
                    <div className="font-mono text-[10px] text-ink/70">
                      {line.safety_buffer_meters}m No-Build Clearance Zone
                    </div>
                    <div className="text-[10px] text-ink/60">{line.name}</div>
                  </div>
                </Tooltip>
              </Polygon>
            ))}

        {/* Layer 3b: Utility Infrastructure Lines (Polyline overlays) */}
        {showUtilities &&
          utilities.map((line) => (
            <Polyline
              key={line.id}
              positions={line.coordinates}
              pathOptions={{
                color: UTILITY_COLORS[line.type] || "#EAB308",
                weight: line.type === "power_grid" ? 4 : 3,
                dashArray: line.type === "power_grid" ? "8 5" : undefined,
                opacity: 0.95,
              }}
            >
              <Tooltip direction="top" opacity={0.95}>
                <div className="font-sans text-xs">
                  <div className="font-semibold text-ink">{line.name}</div>
                  <div className="font-mono text-[10px] text-ink/60">{line.specification}</div>
                  {line.voltage_or_flow && (
                    <div className="font-mono text-[10px] text-ink/50">Flow: {line.voltage_or_flow}</div>
                  )}
                  {line.safety_buffer_meters && (
                    <div className="text-[10px] text-amber-700 font-medium">
                      ⚠️ {line.safety_buffer_meters}m statutory clearance zone
                    </div>
                  )}
                </div>
              </Tooltip>
            </Polyline>
          ))}

        {/* Controller to animate view changes */}
        <MapController center={mapCenter} zoom={mapZoom} />
      </MapContainer>
    </div>
  );
}
