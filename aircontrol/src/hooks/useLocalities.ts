import { useState, useCallback } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

export interface Locality {
  uid: number;
  locality: string;
  full_name: string;
  lat: number;
  lon: number;
  aqi: number | null;
  label: string;
}

export interface StationSnapshot {
  locality: string;
  aqi: number | null;
  label: string;
  dominant_pollutant: string | null;
  pm2_5: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  so2: number | null;
  co: number | null;
}

export interface HistoryPoint {
  timestamp: string | number;
  pm2_5?: number | null;
  pm10?: number | null;
  aqi?: number | null;
}

export type HealthProfile =
  | "healthy"
  | "asthma"
  | "copd"
  | "heart"
  | "diabetes"
  | "child"
  | "elderly"
  | "pregnant"
  | "athlete"
  | "outdoor_worker";

const PROFILE_KEY = "vayu-watch-health-profile";
const STATION_KEY = "vayu-watch-last-station-uid";

export function getSavedProfile(): HealthProfile | null {
  try {
    return (localStorage.getItem(PROFILE_KEY) as HealthProfile) || null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: HealthProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, profile);
  } catch {
    // ignore — localStorage unavailable (private browsing, etc.)
  }
}

export function getSavedStationUid(): number | null {
  try {
    const raw = localStorage.getItem(STATION_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function saveStationUid(uid: number) {
  try {
    localStorage.setItem(STATION_KEY, String(uid));
  } catch {
    // ignore
  }
}

export function useLocalities() {
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [elasticEnabled, setElasticEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocalities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/localities`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setLocalities(json.localities);
      setElasticEnabled(json.elastic_enabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load localities");
    } finally {
      setLoading(false);
    }
  }, []);

  return { localities, elasticEnabled, loading, error, fetchLocalities };
}

export function useHistory() {
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async (uid: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/history?uid=${uid}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      setPoints(json.points);
      setSource(json.source);
    } catch {
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { points, source, loading, fetchHistory };
}

export function useAdvisory() {
  const [snapshot, setSnapshot] = useState<StationSnapshot | null>(null);
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvisory = useCallback(async (uid: number, profile: HealthProfile) => {
    setLoading(true);
    setError(null);
    setAdvisory(null);
    setSnapshot(null);
    try {
      const res = await fetch(`${API}/api/advisory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, profile }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Advisory failed");
      }
      const json = await res.json();
      setSnapshot(json.snapshot);
      setAdvisory(json.advisory);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Advisory failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { snapshot, advisory, loading, error, fetchAdvisory };
}

export type TripActivity = "school_trip" | "sports" | "picnic" | "walk" | "errand";

export interface TripRecommendation {
  locality: string;
  day: string;
  time_of_day: string;
  reasoning: string;
  safety_note: string;
}

export interface TripPlanResult {
  recommendation: TripRecommendation;
  uid: number;
  candidates_considered: { name: string; aqi: number }[];
}

export function useTripPlan() {
  const [result, setResult] = useState<TripPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTripPlan = useCallback(async (activity: TripActivity) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Trip planning failed");
      }
      const json: TripPlanResult = await res.json();
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trip planning failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, fetchTripPlan };
}
