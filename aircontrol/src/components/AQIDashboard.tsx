import { Thermometer, Droplets, Wind, Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CityData } from "@/hooks/useAirQuality";

interface Props {
  data: CityData | null;
  loading: boolean;
}

function aqiColor(aqi: number | null): string {
  if (aqi === null) return "text-gray-400";
  if (aqi <= 50) return "text-green-400";
  if (aqi <= 100) return "text-yellow-400";
  if (aqi <= 150) return "text-orange-400";
  if (aqi <= 200) return "text-red-400";
  return "text-purple-400";
}

function fmt(val: number | null | undefined, decimals = 1): string {
  return val != null ? val.toFixed(decimals) : "--";
}

const AQIDashboard = ({ data, loading }: Props) => {
  const cur = data?.current;

  const pollutants = [
    { name: "PM2.5", value: fmt(cur?.pm2_5), unit: "μg/m³" },
    { name: "O₃",    value: fmt(cur?.o3),    unit: "μg/m³" },
    { name: "NO₂",   value: fmt(cur?.no2),   unit: "μg/m³" },
    { name: "PM10",  value: fmt(cur?.pm10),  unit: "μg/m³" },
  ];

  const weatherData = [
    { icon: Thermometer, label: "Temperature", value: cur?.temperature != null ? `${cur.temperature}°C`    : "--", color: "text-orange-400" },
    { icon: Droplets,    label: "Humidity",    value: cur?.humidity    != null ? `${cur.humidity}%`        : "--", color: "text-blue-400"   },
    { icon: Wind,        label: "Wind Speed",  value: cur?.wind_speed  != null ? `${cur.wind_speed} km/h`  : "--", color: "text-green-400"  },
    { icon: Activity,    label: "UV Index",    value: cur?.uv_index    != null ? String(cur.uv_index)       : "--", color: "text-yellow-400" },
  ];

  return (
    <section id="home" className="py-12 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Current Air Quality</h2>
          <p className="text-muted-foreground">
            {data ? `Live data for ${data.city}` : "Search a city above to load live data"}
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-8">
          <Card className="text-center bg-gradient-to-r from-card to-muted/10 border-2">
            <CardHeader>
              <CardTitle className="text-lg text-muted-foreground">Air Quality Index (US AQI)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`text-8xl font-bold ${aqiColor(cur?.aqi ?? null)}`}>
                    {cur?.aqi != null ? Math.round(cur.aqi) : "--"}
                  </div>
                  <Badge variant="secondary" className="text-lg px-6 py-2">
                    {cur?.label ?? "No data — search a city"}
                  </Badge>
                  {data && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Updated {new Date().toLocaleTimeString()} · Open-Meteo Air Quality API
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {pollutants.map((p) => (
            <Card key={p.name} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">{p.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{p.value}</div>
                <div className="text-xs text-muted-foreground">{p.unit}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Weather Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {weatherData.map((item, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/20">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <div>
                    <div className="font-semibold">{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default AQIDashboard;
