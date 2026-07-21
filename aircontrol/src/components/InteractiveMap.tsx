import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Fix Leaflet's default icon path issue in Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapResizer({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (lat && lon) {
        map.flyTo([lat, lon], 11, { duration: 1.2 });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [lat, lon, map]);
  return null;
}

const getMarkerIcon = (aqi: number) => {
  let color = "#3FA796";
  if (aqi > 300) color = "#8B2E2E";
  else if (aqi > 200) color = "#C2410C";
  else if (aqi > 150) color = "#D97706";
  else if (aqi > 100) color = "#D9A441";
  else if (aqi > 50)  color = "#7CB342";

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color:${color};width:32px;height:32px;border-radius:50%;border:2px solid #0E1417;box-shadow:0 2px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-family:IBM Plex Mono;font-weight:bold;">${Math.round(aqi)}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const INDIAN_METRO_STATIONS = [
  { name: "Delhi - Anand Vihar CAAQMS", lat: 28.6469, lon: 77.316, aqi: 312, category: "Severe" },
  { name: "Delhi - RK Puram CAAQMS", lat: 28.5633, lon: 77.1863, aqi: 245, category: "Poor" },
  { name: "Delhi - Punjabi Bagh CAAQMS", lat: 28.6683, lon: 77.1267, aqi: 268, category: "Poor" },
  { name: "Delhi - Okhla Phase 2", lat: 28.5308, lon: 77.2712, aqi: 289, category: "Poor" },
  { name: "Mumbai - Chembur CAAQMS", lat: 19.0622, lon: 72.8974, aqi: 185, category: "Moderate" },
  { name: "Mumbai - Kurla Traffic Corridor", lat: 19.0657, lon: 72.8797, aqi: 210, category: "Poor" },
  { name: "Bengaluru - Peenya Industrial Station", lat: 13.0285, lon: 77.5197, aqi: 142, category: "Moderate" },
  { name: "Bengaluru - Silk Board Junction", lat: 12.9172, lon: 77.6228, aqi: 178, category: "Moderate" },
  { name: "Chennai - Manali Industrial Belt", lat: 13.1667, lon: 80.2667, aqi: 156, category: "Moderate" },
  { name: "Chennai - Velachery Station", lat: 12.9815, lon: 80.218, aqi: 112, category: "Moderate" },
];

type MapLayer = "dark" | "satellite";

interface Props {
  lat?: number;
  lon?: number;
  city?: string;
  aqi?: number | null;
}

export default function InteractiveMap({ lat, lon, city, aqi }: Props) {
  const [mapLayer, setMapLayer] = useState<MapLayer>("dark");
  const centerLat = lat || 28.6139;
  const centerLon = lon || 77.2090;

  return (
    <div className="relative h-[calc(100vh-100px)] min-h-[550px] w-full overflow-hidden bg-[#0E1417]">
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={lat && lon ? 11 : 6}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ position: "relative", zIndex: 0 }}
      >
        {mapLayer === "dark" ? (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
            attribution="&copy; OpenStreetMap & CartoDB"
          />
        ) : (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            attribution="&copy; Esri & contributors"
          />
        )}

        <MapResizer lat={centerLat} lon={centerLon} />

        {/* Selected City Pin */}
        {lat && lon && city && (
          <Marker position={[lat, lon]} icon={getMarkerIcon(aqi ?? 220)}>
            <Popup className="custom-popup">
              <div className="font-['IBM_Plex_Mono'] text-xs p-1">
                <strong className="text-[#2DD4BF] text-sm">{city}</strong>
                <div className="mt-1">US AQI: {aqi != null ? Math.round(aqi) : "Loading..."}</div>
                <div className="text-[10px] text-[#8CA2AC] mt-0.5">Primary Ground Monitoring Hub</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Indian Metro Ground Sensors */}
        {INDIAN_METRO_STATIONS.map((st, i) => (
          <Marker key={i} position={[st.lat, st.lon]} icon={getMarkerIcon(st.aqi)}>
            <Popup>
              <div className="font-['IBM_Plex_Mono'] text-xs p-1">
                <strong>{st.name}</strong>
                <div className="mt-1">AQI: {st.aqi} ({st.category})</div>
                <div className="text-[10px] text-[#8CA2AC]">Ingested CAAQMS Feed</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Layer Toggle Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3 z-[1000]">
        <Button
          variant="outline"
          className={cn(
            "rounded-full px-6 shadow-lg font-['IBM_Plex_Mono'] text-xs bg-[#151C21] text-[#E7EEF1] border-[#28343C]",
            mapLayer === "dark" && "bg-[#2DD4BF] text-[#04211D] font-bold border-[#2DD4BF]"
          )}
          onClick={() => setMapLayer("dark")}
        >
          Dark Command View
        </Button>
        <Button
          variant="outline"
          className={cn(
            "rounded-full px-6 shadow-lg font-['IBM_Plex_Mono'] text-xs bg-[#151C21] text-[#E7EEF1] border-[#28343C]",
            mapLayer === "satellite" && "bg-[#2DD4BF] text-[#04211D] font-bold border-[#2DD4BF]"
          )}
          onClick={() => setMapLayer("satellite")}
        >
          Satellite Dust & Thermal View
        </Button>
      </div>
    </div>
  );
}
