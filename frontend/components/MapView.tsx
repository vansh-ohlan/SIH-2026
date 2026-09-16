"use client";

import { useEffect, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
import AskAIPanel from "@/components/AskAIPanel";

// ==========================================
// Color Palettes & Legend Constants (GovTech Theme)
// ==========================================
const LAND_USE_COLORS: Record<string, string> = {
  Residential: "#C08A28", // Ochre / Gold
  Agricultural: "#2F5233", // Forest Land green
  Commercial: "#14213D", // Ink Navy
  Industrial: "#8A3828", // Terracotta
  "Restriction Zone": "#7C2D12", // Deep Amber
  "Eco-Sensitive": "#047857", // Deep Emerald
};

const ZONING_COLORS: Record<string, string> = {
  Residential: "#DDA84B",
  Commercial: "#233257",
  Industrial: "#8A3828",
  Agricultural: "#3E6B43",
  "Restriction Zone": "#B91C1C",
  "Eco-Sensitive": "#059669",
};

const TAX_BAND_COLORS: Record<string, string> = {
  "Band A (Prime Commercial)": "#14213D",
  "Band B (Standard Residential)": "#C08A28",
  "Band C (Agricultural/Rural)": "#8F6518",
};

const UTILITY_COLORS: Record<string, string> = {
  power_grid: "#D97706",
  water_main: "#0284C7",
  stormwater_drain: "#0D9488",
};

// ==========================================
// Map Controller for Camera & Auto-Bounds
// ==========================================
function MapController({
  parcelsGeo,
  focusCoords,
  fitTrigger,
  demoFocusTrigger,
  resetTrigger,
  defaultCenter,
  defaultZoom,
}: {
  parcelsGeo: GeoFeatureCollection | null;
  focusCoords: [number, number] | null;
  fitTrigger: number;
  demoFocusTrigger: number;
  resetTrigger: number;
  defaultCenter: [number, number];
  defaultZoom: number;
}) {
  const map = useMap();

  // 1. Auto-fit bounds on initial data load
  useEffect(() => {
    if (parcelsGeo && parcelsGeo.features.length > 0) {
      try {
        const geoLayer = L.geoJSON(parcelsGeo as any);
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      } catch {
        map.setView(defaultCenter, defaultZoom);
      }
    }
  }, [parcelsGeo, map, defaultCenter, defaultZoom]);

  // 2. React to external focus prop
  useEffect(() => {
    if (focusCoords) {
      map.flyTo(focusCoords, 16, { duration: 1.0 });
    }
  }, [focusCoords, map]);

  // 3. Trigger "Fit All Parcels"
  useEffect(() => {
    if (fitTrigger > 0 && parcelsGeo && parcelsGeo.features.length > 0) {
      try {
        const geoLayer = L.geoJSON(parcelsGeo as any);
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      } catch {
        map.setView(defaultCenter, 15);
      }
    }
  }, [fitTrigger, parcelsGeo, map, defaultCenter]);

  // 4. Trigger "Focus Demo Parcel" (PB-LDH-0042 at [30.905, 75.855])
  useEffect(() => {
    if (demoFocusTrigger > 0) {
      map.flyTo([30.905, 75.855], 16, { duration: 1.0 });
    }
  }, [demoFocusTrigger, map]);

  // 5. Trigger "Reset View"
  useEffect(() => {
    if (resetTrigger > 0) {
      map.flyTo(defaultCenter, defaultZoom, { duration: 1.0 });
    }
  }, [resetTrigger, map, defaultCenter, defaultZoom]);

  return null;
}

// ==========================================
// Main Cadastral Map View Component
// ==========================================
export default function MapView({
  focus,
  onSelectParcel,
  selectedUlpidProp,
}: {
  focus?: [number, number] | null;
  onSelectParcel?: (props: GeoFeatureProperties) => void;
  selectedUlpidProp?: string;
}) {
  const router = useRouter();

  // Region State
  const [regions, setRegions] = useState<PilotRegion[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<RegionId>("punjab");
  const [mapCenter, setMapCenter] = useState<[number, number]>([30.908, 75.855]);
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Trigger counters for map actions
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [demoFocusTrigger, setDemoFocusTrigger] = useState<number>(0);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Data State
  const [parcelsGeo, setParcelsGeo] = useState<GeoFeatureCollection | null>(null);
  const [encroachments, setEncroachments] = useState<EncroachmentAlert[]>([]);
  const [utilities, setUtilities] = useState<UtilityLine[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<GeoFeatureProperties | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<EncroachmentAlert | null>(null);

  // Layer Visibility Controls
  const [baseLayerType, setBaseLayerType] = useState<"osm" | "satellite">("osm");
  const [showUlpinBadges, setShowUlpinBadges] = useState<boolean>(true);
  const [colorMode, setColorMode] = useState<"land_use" | "zoning" | "tax_bands">("land_use");
  const [showEncroachmentAlerts, setShowEncroachmentAlerts] = useState<boolean>(false);
  const [showUtilities, setShowUtilities] = useState<boolean>(false);
  const [controlPanelOpen, setControlPanelOpen] = useState<boolean>(false);
  const [showAskAI, setShowAskAI] = useState<boolean>(false);

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

      // Default highlight PB-LDH-0042 if in Punjab
      if (activeRegionId === "punjab") {
        const demoFeature = geo.features.find((f) => f.properties.ulpid === "PB-LDH-0042");
        if (demoFeature) {
          setSelectedParcel(demoFeature.properties);
        }
      } else if (geo.features.length > 0) {
        setSelectedParcel(geo.features[0].properties);
      }
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

  // Sync selected ULPID prop if provided
  useEffect(() => {
    if (selectedUlpidProp && parcelsGeo) {
      const feat = parcelsGeo.features.find((f) => f.properties.ulpid === selectedUlpidProp);
      if (feat) {
        setSelectedParcel(feat.properties);
      }
    }
  }, [selectedUlpidProp, parcelsGeo]);

  // Handle Region Jumper Selection
  const handleRegionSwitch = (region: PilotRegion) => {
    setActiveRegionId(region.id);
    setMapCenter(region.center);
    setMapZoom(region.zoom);
  };

  // Quick Action Handlers
  const handleFocusDemoParcel = () => {
    if (activeRegionId !== "punjab") {
      setActiveRegionId("punjab");
    }
    const demoFeature = parcelsGeo?.features.find((f) => f.properties.ulpid === "PB-LDH-0042");
    if (demoFeature) {
      setSelectedParcel(demoFeature.properties);
    }
    setDemoFocusTrigger((prev) => prev + 1);
  };

  const handleFitAllParcels = () => {
    setFitTrigger((prev) => prev + 1);
  };

  const handleResetView = () => {
    setResetTrigger((prev) => prev + 1);
  };

  // Dynamic GeoJSON Polygon Styler
  const getParcelStyle = (feature?: Feature): PathOptions => {
    const props = feature?.properties as GeoFeatureProperties | undefined;
    if (!props) return { color: "#14213D", weight: 1.5 };

    const isSelected = selectedParcel?.ulpid === props.ulpid;
    const isDemoParcel = props.ulpid === "PB-LDH-0042";

    let fillColor = "#14213D";
    if (colorMode === "land_use") {
      fillColor = LAND_USE_COLORS[props.land_use] || "#14213D";
    } else if (colorMode === "zoning") {
      fillColor = (props.zoning && ZONING_COLORS[props.zoning]) || LAND_USE_COLORS[props.land_use] || "#14213D";
    } else if (colorMode === "tax_bands") {
      if (props.tax_arrears) {
        fillColor = "#8A3828";
      } else {
        fillColor = (props.tax_band && TAX_BAND_COLORS[props.tax_band]) || "#8F6518";
      }
    }

    const isRestriction = props.zoning === "Restriction Zone" || props.zoning === "Eco-Sensitive";

    // Demo parcel PB-LDH-0042 gets distinct amber border and subtle fill
    if (isDemoParcel) {
      return {
        color: isSelected ? "#C08A28" : "#8F6518",
        weight: isSelected ? 3.5 : 2.5,
        fillColor: "#DDA84B",
        fillOpacity: isSelected ? 0.5 : 0.35,
        dashArray: isSelected ? undefined : "6 4",
        className: "parcel-polygon",
      };
    }

    return {
      color: isSelected ? "#14213D" : isRestriction ? "#B91C1C" : fillColor,
      weight: isSelected ? 3 : isRestriction ? 2.5 : 1.5,
      dashArray: isRestriction ? "8 4" : undefined,
      fillColor,
      fillOpacity: isSelected ? 0.55 : isRestriction ? 0.45 : baseLayerType === "satellite" ? 0.35 : 0.25,
      className: "parcel-polygon",
    };
  };

  // Parcel Feature Interactions & Popups
  const onEachParcel = (feature: Feature, layer: Layer) => {
    const props = feature.properties as GeoFeatureProperties;
    const isDemoMismatch = props.ulpid === "PB-LDH-0042";

    // Rich Standard Parcel Popup
    const popupHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #14213D; min-width: 210px; padding: 2px;">
        <div style="font-family: monospace; font-size: 11px; font-weight: bold; color: #C08A28; letter-spacing: 0.5px;">${props.ulpid}</div>
        <div style="font-size: 14px; font-weight: 700; margin-top: 2px; color: #14213D;">${props.owner_name || (isDemoMismatch ? "Ramesh Kumar" : "Titleholder")}</div>
        <div style="margin-top: 6px; font-size: 11px; color: #4A5568; line-height: 1.4;">
          <div><strong>Area:</strong> ${props.area_sqm?.toLocaleString() || (isDemoMismatch ? "1,250" : "—")} sqm</div>
          <div><strong>Land Use:</strong> ${props.land_use || "Residential"}</div>
        </div>
        ${
          isDemoMismatch
            ? `<div style="margin-top: 8px; padding: 6px 8px; background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 4px; font-size: 11px;">
                <div style="font-weight: 700; color: #92400E;">⚠ Potential Area Mismatch</div>
                <div style="color: #78350F; margin-top: 2px;">RoR: 1,250 sqm | Survey: 1,180 sqm</div>
              </div>`
            : ""
        }
        <div style="margin-top: 10px;">
          <a href="/citizen/parcel/${props.ulpid}" style="display: block; text-align: center; background-color: #14213D; color: #EFEEE4; padding: 6px 10px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 11px;">
            Open Full Parcel Record →
          </a>
        </div>
      </div>
    `;

    layer.bindPopup(popupHtml, { maxWidth: 280 });

    layer.on({
      mouseover: (e) => {
        const target = e.target;
        target.setStyle({
          fillOpacity: 0.55,
          weight: 3,
        });
      },
      mouseout: (e) => {
        const target = e.target;
        if (selectedParcel?.ulpid !== props.ulpid) {
          target.setStyle({
            fillOpacity: baseLayerType === "satellite" ? 0.35 : 0.25,
            weight: props.ulpid === "PB-LDH-0042" ? 2.5 : 1.5,
          });
        }
      },
      click: () => {
        setSelectedParcel(props);
        setSelectedAlert(null);
        onSelectParcel?.(props);
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
      {/* TOP-LEFT: Quick Action Bar & Multi-State Region Jumper              */}
      {/* =================================================================== */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5 max-w-sm sm:max-w-md">
        {/* Quick Map Controls */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-sm bg-parchment/95 p-1.5 plot-border-solid shadow-sm backdrop-blur">
          <button
            onClick={handleFocusDemoParcel}
            className="flex items-center gap-1.5 rounded bg-ochre/20 hover:bg-ochre/30 border border-ochre/40 px-2.5 py-1 text-xs font-bold text-ochre-dark transition-all"
            title="Center and highlight demo parcel PB-LDH-0042 (Ludhiana)"
          >
            <span>🎯 Focus Demo Parcel</span>
          </button>
          <button
            onClick={handleFitAllParcels}
            className="flex items-center gap-1 rounded bg-ink/5 hover:bg-ink/10 px-2.5 py-1 text-xs font-semibold text-ink transition-all"
            title="Fit all parcels in view"
          >
            <span>⛶ Fit All Parcels</span>
          </button>
          <button
            onClick={handleResetView}
            className="flex items-center gap-1 rounded bg-ink/5 hover:bg-ink/10 px-2 py-1 text-xs font-medium text-ink/70 transition-all"
            title="Reset map camera"
          >
            <span>↺ Reset View</span>
          </button>
        </div>

        {/* Region Jumper */}
        <div className="flex flex-col gap-1 rounded-sm bg-parchment/95 p-1.5 plot-border-solid shadow-sm backdrop-blur">
          <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] font-mono uppercase tracking-wider text-ink/60">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-land animate-pulse" />
              <span>Pilot Region:</span>
            </div>
            <span className="text-[10px] text-ochre-dark font-semibold">
              {activeRegionId === "punjab" ? "Ludhiana (Demo)" : activeRegionId}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {regions.map((reg) => {
              const isActive = reg.id === activeRegionId;
              return (
                <button
                  key={reg.id}
                  onClick={() => handleRegionSwitch(reg)}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-ink text-parchment shadow-sm"
                      : "bg-parchment-dark/60 text-ink/75 hover:bg-ink/10 hover:text-ink"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-70">
                    {reg.id === "punjab" ? "📍 PB" : reg.id === "chandigarh" ? "📍 CH" : "📍 TN"}
                  </span>
                  <span>{reg.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TOP-RIGHT: Compact Layer Controls                                   */}
      {/* =================================================================== */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end">
        <button
          onClick={() => setControlPanelOpen(!controlPanelOpen)}
          className="flex items-center gap-2 rounded-sm bg-parchment/95 px-3 py-1.5 text-xs font-medium text-ink plot-border-solid shadow-sm backdrop-blur hover:bg-parchment"
        >
          <span className="font-mono text-ochre-dark">❖</span>
          <span>{controlPanelOpen ? "Hide Controls" : "Map Layers"}</span>
        </button>

        {controlPanelOpen && (
          <div className="mt-2 w-64 sm:w-72 rounded-sm bg-parchment/95 p-3 plot-border-solid shadow-md backdrop-blur max-h-[calc(100vh-140px)] overflow-y-auto">
            <div className="border-b border-ink/15 pb-1.5">
              <span className="font-serif text-xs font-bold text-ink">
                Geospatial Cadastral Layers
              </span>
              <p className="text-[10px] text-ink/60">
                PostGIS SRID 4326 Layer Controls
              </p>
            </div>

            {/* 1. Base Imagery Toggle */}
            <div className="mt-2.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-ink/60">
                1. Base Map Layer
              </label>
              <div className="mt-1 grid grid-cols-2 gap-1 rounded bg-ink/5 p-1">
                <button
                  onClick={() => setBaseLayerType("osm")}
                  className={`rounded py-1 text-xs font-medium transition ${
                    baseLayerType === "osm"
                      ? "bg-ink text-parchment shadow"
                      : "text-ink/70 hover:text-ink"
                  }`}
                >
                  🗺️ Cadastral
                </button>
                <button
                  onClick={() => setBaseLayerType("satellite")}
                  className={`rounded py-1 text-xs font-medium transition ${
                    baseLayerType === "satellite"
                      ? "bg-ink text-parchment shadow"
                      : "text-ink/70 hover:text-ink"
                  }`}
                >
                  🛰️ Satellite
                </button>
              </div>
            </div>

            {/* 2. Base Cadastral Options */}
            <div className="mt-2.5 border-t border-ink/10 pt-2">
              <label className="flex items-center justify-between text-xs text-ink cursor-pointer">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="font-mono text-xs text-ochre">#</span> ULPID Badges
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
            <div className="mt-2.5 border-t border-ink/10 pt-2">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-ink/60">
                2. Land Classification
              </label>
              <div className="mt-1 flex flex-col gap-1">
                {[
                  ["land_use", "Land Use Classification"],
                  ["zoning", "Statutory Zoning"],
                  ["tax_bands", "Tax Valuation Bands"],
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

            {/* 4. AI/ML Change Detection Overlay (Honest Prototype Label) */}
            <div className="mt-2.5 border-t border-ink/10 pt-2">
              <div className="rounded border border-ochre/30 bg-ochre/5 p-2">
                <label className="flex items-center justify-between text-xs text-ink cursor-pointer">
                  <span className="flex items-center gap-1.5 font-medium text-ochre-dark">
                    <span>🛰️</span>
                    AI Change Detection
                  </span>
                  <input
                    type="checkbox"
                    checked={showEncroachmentAlerts}
                    onChange={(e) => setShowEncroachmentAlerts(e.target.checked)}
                    className="accent-ochre cursor-pointer"
                  />
                </label>
                <div className="mt-1 text-[10px] text-ink/60">
                  <span className="font-semibold text-ochre-dark font-mono">[Planned — Stage 4]</span> Prototype capability for satellite NDVI/SAR anomaly detection.
                </div>
              </div>
            </div>

            {/* 5. Utility Infrastructure (Honest Prototype Label) */}
            <div className="mt-2.5 border-t border-ink/10 pt-2">
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
                <span className="font-semibold text-ink/70 font-mono">[Planned — Stage 4]</span> Power corridors &amp; water mains
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* BOTTOM-LEFT: Selected Parcel Inspector Card                         */}
      {/* =================================================================== */}
      {selectedParcel && (
        <div className="absolute bottom-3 left-3 z-[1000] w-72 sm:w-80 rounded-sm bg-parchment/95 p-3.5 plot-border-solid shadow-md backdrop-blur">
          <div className="flex items-start justify-between border-b border-ink/15 pb-1.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-bold text-ochre-dark">
                  {selectedParcel.ulpid}
                </span>
                {selectedParcel.ulpid === "PB-LDH-0042" && (
                  <span className="bg-ochre/20 text-ochre-dark text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                    Demo Parcel
                  </span>
                )}
              </div>
              <h4 className="font-serif text-sm font-bold text-ink mt-0.5">
                {selectedParcel.owner_name ?? (selectedParcel.ulpid === "PB-LDH-0042" ? "Ramesh Kumar" : "Landowner")}
              </h4>
            </div>
            <button
              onClick={() => setSelectedParcel(null)}
              className="text-xs text-ink/50 hover:text-ink p-0.5"
            >
              ✕
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-ink/50 uppercase font-mono">Land Use</span>
              <div className="font-medium text-ink">
                {selectedParcel.land_use ?? "Residential"}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-ink/50 uppercase font-mono">Total Area</span>
              <div className="font-serif font-bold text-ink">
                {selectedParcel.area_sqm?.toLocaleString() ?? (selectedParcel.ulpid === "PB-LDH-0042" ? "1,250" : "—")} sqm
              </div>
            </div>
          </div>

          {/* Prominent Mismatch Box for Demo Parcel PB-LDH-0042 */}
          {selectedParcel.ulpid === "PB-LDH-0042" && (
            <div className="mt-2 rounded bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-300">
              <div className="font-bold flex items-center gap-1 text-amber-800">
                <span>⚠</span>
                <span>Potential Area Mismatch</span>
              </div>
              <div className="mt-1 text-[10px] text-amber-900/80 font-mono">
                RoR: 1,250 sqm · Survey: 1,180 sqm (Diff: 70 sqm)
              </div>
            </div>
          )}

          <div className="mt-2.5">
            <button
              onClick={() => router.push(`/citizen/parcel/${selectedParcel.ulpid}`)}
              className="w-full rounded-sm bg-ink px-3 py-1.5 text-center text-xs font-medium text-parchment hover:bg-ink-light transition"
            >
              Open Full Parcel Record →
            </button>
            <button
              onClick={() => setShowAskAI(true)}
              className="w-full mt-2 rounded-sm bg-ochre text-parchment px-3 py-1.5 text-center text-xs font-medium hover:bg-ochre/90 transition"
            >
              Ask AI
            </button>
          </div>
        </div>
      )}

      {showAskAI && selectedParcel && (
        <AskAIPanel
          ulpid={selectedParcel.ulpid}
          onClose={() => setShowAskAI(false)}
        />
      )}

      {/* =================================================================== */}
      {/* BOTTOM-RIGHT: Compact Map Legend                                    */}
      {/* =================================================================== */}
      <div className="absolute bottom-3 right-3 z-[1000] hidden sm:flex flex-col gap-1 rounded-sm bg-parchment/95 p-2 plot-border-solid shadow-sm backdrop-blur text-[11px]">
        <div className="font-mono text-[9px] font-semibold text-ink/60 uppercase">
          Legend: {colorMode.replace("_", " ")}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {colorMode === "land_use" &&
            Object.entries(LAND_USE_COLORS).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1 text-[10px]">
                <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
                <span>{label}</span>
              </span>
            ))}
        </div>
      </div>

      {/* =================================================================== */}
      {/* LEAFLET MAP CONTAINER                                               */}
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
            opacity={0.65}
          />
        ) : (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            opacity={0.85}
          />
        )}

        {/* Layer 2: Cadastral GeoJSON Parcels (Source of Truth) */}
        {parcelsGeo && (
          <GeoJSON
            key={`${activeRegionId}-${colorMode}-${baseLayerType}-${selectedParcel?.ulpid ?? ""}`}
            data={parcelsGeo as any}
            style={getParcelStyle}
            onEachFeature={onEachParcel}
          />
        )}

        {/* Layer 2b: Permanent/Hover ULPID Badges */}
        {showUlpinBadges &&
          parcelsGeo?.features.map((f) => {
            const coords = f.geometry.coordinates[0];
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

        {/* Layer 2c: Encroachment Overlays (Prototype / Planned) */}
        {showEncroachmentAlerts &&
          encroachments.map((alert) => {
            const polygonCoords = alert.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
            const isSelected = selectedAlert?.id === alert.id;

            return (
              <Polygon
                key={alert.id}
                positions={polygonCoords}
                pathOptions={{
                  color: "#B45309",
                  weight: isSelected ? 3 : 2,
                  fillColor: "#F59E0B",
                  fillOpacity: isSelected ? 0.45 : 0.25,
                  dashArray: "4 3",
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
                    <div className="font-bold text-amber-800">⚠️ Change Detection Alert (Stage 4)</div>
                    <div className="font-mono text-[10px] text-ink/70">{alert.id} · {alert.area_sqm} sqm</div>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* Layer 3: Utility Infrastructure Lines */}
        {showUtilities &&
          utilities.map((line) => (
            <Polyline
              key={line.id}
              positions={line.coordinates}
              pathOptions={{
                color: UTILITY_COLORS[line.type] || "#D97706",
                weight: 3,
                dashArray: line.type === "power_grid" ? "6 4" : undefined,
                opacity: 0.9,
              }}
            >
              <Tooltip direction="top" opacity={0.95}>
                <div className="font-sans text-xs">
                  <div className="font-semibold text-ink">{line.name} [Planned]</div>
                  <div className="font-mono text-[10px] text-ink/60">{line.specification}</div>
                </div>
              </Tooltip>
            </Polyline>
          ))}

        {/* Controller for Camera Animations & Auto-fitBounds */}
        <MapController
          parcelsGeo={parcelsGeo}
          focusCoords={focus ?? null}
          fitTrigger={fitTrigger}
          demoFocusTrigger={demoFocusTrigger}
          resetTrigger={resetTrigger}
          defaultCenter={currentRegion?.center ?? [30.908, 75.855]}
          defaultZoom={currentRegion?.zoom ?? 14}
        />
      </MapContainer>
    </div>
  );
}
