import { useState, useCallback } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

export interface AQICurrent {
  aqi: number | null;
  label: string;
  pm2_5: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  uv_index: number | null;
}

export interface AQIHourly {
  time: string;
  hour: string;
  aqi: number | null;
  pm2_5: number | null;
  no2: number | null;
  o3: number | null;
}

export interface CityData {
  city: string;
  lat: number;
  lon: number;
  current: AQICurrent;
  forecast: AQIHourly[];
  historical: AQIHourly[];
}

export function useAirQuality() {
  const [data, setData] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (city: string) => {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/city?name=${encodeURIComponent(city)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to fetch");
      }
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, search };
}
