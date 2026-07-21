import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Cigarette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmogCanvas from "@/components/SmogCanvas";
import LocalityHistoryChart from "@/components/LocalityHistoryChart";
import { useCountUp } from "@/hooks/useCountUp";
import {
  useLocalities, useAdvisory,
  getSavedProfile, saveProfile, getSavedStationUid, saveStationUid,
  type Locality, type HealthProfile,
} from "@/hooks/useLocalities";
import TripPlanner from "@/components/TripPlanner";

function aqiColor(aqi: number | null): string {
  if (aqi === null) return "text-gray-400";
  if (aqi <= 50) return "text-green-400";
  if (aqi <= 100) return "text-yellow-400";
  if (aqi <= 150) return "text-orange-400";
  if (aqi <= 200) return "text-red-400";
  return "text-purple-400";
}

function aqiDot(aqi: number | null): string {
  if (aqi === null) return "bg-gray-400";
  if (aqi <= 50) return "bg-green-400";
  if (aqi <= 100) return "bg-yellow-400";
  if (aqi <= 150) return "bg-orange-400";
  if (aqi <= 200) return "bg-red-400";
  return "bg-purple-400";
}

/** Inverse US-EPA PM2.5 breakpoints: estimate concentration (µg/m³) from AQI. */
function pm25FromAqi(aqi: number): number {
  const bp: [number, number, number, number][] = [
    [0, 50, 0, 12],
    [50, 100, 12.1, 35.4],
    [100, 150, 35.5, 55.4],
    [150, 200, 55.5, 150.4],
    [200, 300, 150.5, 250.4],
    [300, 500, 250.5, 500.4],
  ];
  const a = Math.min(Math.max(aqi, 0), 500);
  for (const [aLo, aHi, cLo, cHi] of bp) {
    if (a <= aHi) return cLo + ((a - aLo) / (aHi - aLo)) * (cHi - cLo);
  }
  return 500;
}

const PROFILES: { value: HealthProfile; label: string }[] = [
  { value: "healthy", label: "Healthy Adult" },
  { value: "asthma", label: "Asthma / Respiratory" },
  { value: "copd", label: "COPD / Chronic Lung" },
  { value: "heart", label: "Heart Condition" },
  { value: "diabetes", label: "Diabetes" },
  { value: "child", label: "Young Child" },
  { value: "elderly", label: "Elderly" },
  { value: "pregnant", label: "Pregnant" },
  { value: "athlete", label: "Athlete / Regular Exerciser" },
  { value: "outdoor_worker", label: "Outdoor Worker" },
];

const DelhiLocalitiesPage = () => {
  const { localities, elasticEnabled, loading, error, fetchLocalities } = useLocalities();
  const { snapshot, advisory, loading: advisoryLoading, error: advisoryError, fetchAdvisory } = useAdvisory();
  const [selected, setSelected] = useState<Locality | null>(null);
  const [profile, setProfile] = useState<HealthProfile>(() => getSavedProfile() ?? "healthy");

  useEffect(() => {
    fetchLocalities();
    const id = window.setInterval(fetchLocalities, 60_000); // refresh + feed Elastic
    return () => window.clearInterval(id);
  }, [fetchLocalities]);

  // restore the last-viewed station once the board loads, else fall back to worst
  useEffect(() => {
    if (selected || !localities.length) return;
    const savedUid = getSavedStationUid();
    const saved = savedUid != null ? localities.find((l) => l.uid === savedUid) : null;
    const loc = saved ?? localities[0];
    setSelected(loc);
    fetchAdvisory(loc.uid, profile);
  }, [localities, selected, profile, fetchAdvisory]);

  const heroAqi = selected?.aqi ?? null;
  // WAQI iaqi values are US-AQI sub-indices, not µg/m³ — invert EPA breakpoints
  // to get concentration. Prefer the station's PM2.5 sub-index when loaded.
  const pm25 = useMemo(() => {
    if (snapshot && selected && snapshot.locality === selected.locality && snapshot.pm2_5 != null) {
      return pm25FromAqi(snapshot.pm2_5);
    }
    return heroAqi != null ? pm25FromAqi(heroAqi) : 0;
  }, [snapshot, selected, heroAqi]);

  const cigarettes = pm25 / 22; // Berkeley Earth: 22 µg/m³ PM2.5 ≈ 1 cigarette/day
  const animatedAqi = useCountUp(heroAqi ?? 0);
  const animatedCigs = useCountUp(cigarettes);

  const handleSelect = (loc: Locality) => {
    setSelected(loc);
    saveStationUid(loc.uid);
    fetchAdvisory(loc.uid, profile);
  };

  const handleSelectByUid = (uid: number) => {
    const loc = localities.find((l) => l.uid === uid);
    if (loc) handleSelect(loc);
  };

  return (
    <div className="dark">
      <div className="relative min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
        <SmogCanvas pm25={pm25} />

        <div className="relative z-10 flex flex-col min-h-screen">
          <Header />

          <main className="flex-1">
            {/* Hero — the air you are breathing */}
            <section className="container mx-auto px-4 pt-14 pb-10">
              <div className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                Live from {localities.length || 24} DPCC/CPCB ground stations · the haze on this page is {selected?.locality ?? "Delhi"}'s air right now
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end">
                <div>
                  <h1 className="text-2xl font-semibold text-neutral-300 mb-1 text-balance">
                    {selected?.locality ?? "Delhi"}
                  </h1>
                  <div className="flex items-end gap-4 flex-wrap">
                    <span
                      className={`font-black leading-none tracking-tight ${aqiColor(heroAqi)}`}
                      style={{ fontSize: "clamp(4rem, 14vw, 6rem)" }}
                    >
                      {heroAqi != null ? Math.round(animatedAqi) : "--"}
                    </span>
                    <div className="pb-2">
                      <div className="text-lg font-semibold">{selected?.label ?? ""}</div>
                      <div className="text-sm text-neutral-400">US AQI</div>
                    </div>
                  </div>
                </div>

                <div className="lg:justify-self-end">
                  <div className="flex items-center gap-4">
                    <Cigarette className="h-10 w-10 text-neutral-500 shrink-0" aria-hidden="true" />
                    <div>
                      <div className="text-4xl font-bold">
                        {animatedCigs.toFixed(1)}
                        <span className="text-lg font-medium text-neutral-400"> cigarettes/day</span>
                      </div>
                      <p className="text-sm text-neutral-400 max-w-xs">
                        Breathing this air ≈ smoking {cigarettes.toFixed(1)} cigarettes daily
                        <span className="text-neutral-500"> (Berkeley Earth: 22 µg/m³ PM2.5 ≈ 1 cig)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Station rail */}
            <section className="container mx-auto px-4 pb-10">
              {loading && localities.length === 0 && (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                </div>
              )}
              {error && <p className="text-red-400 mb-4">{error}</p>}

              <div className="flex flex-wrap gap-2">
                {localities.map((loc) => (
                  <button
                    key={loc.uid}
                    onClick={() => handleSelect(loc)}
                    aria-pressed={selected?.uid === loc.uid}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                      selected?.uid === loc.uid
                        ? "border-neutral-100 bg-neutral-100 text-neutral-950 font-semibold"
                        : "border-white/15 bg-white/[0.04] text-neutral-200 hover:bg-white/10"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${aqiDot(loc.aqi)}`} aria-hidden="true" />
                    {loc.locality}
                    <span className={selected?.uid === loc.uid ? "font-bold" : `font-semibold ${aqiColor(loc.aqi)}`}>
                      {loc.aqi != null ? Math.round(loc.aqi) : "--"}
                    </span>
                  </button>
                ))}
              </div>
              {elasticEnabled && (
                <p className="mt-3 text-xs text-neutral-500">
                  Every reading is being indexed to Elasticsearch as you watch.
                </p>
              )}
            </section>

            {/* Advisory */}
            <section className="container mx-auto px-4 pb-16 max-w-3xl">
              <Card className="bg-neutral-900/80 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                    Personalized Health Advisory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <Select
                      value={profile}
                      onValueChange={(v) => {
                        setProfile(v as HealthProfile);
                        saveProfile(v as HealthProfile);
                        if (selected) fetchAdvisory(selected.uid, v as HealthProfile);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-56">
                        <SelectValue placeholder="Health profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROFILES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-neutral-400">
                      {selected ? `for ${selected.locality}` : "Select a station above"}
                    </span>
                  </div>

                  {advisoryLoading && (
                    <div className="flex items-center gap-2 text-neutral-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating advisory via Gemini…
                    </div>
                  )}
                  {advisoryError && <p className="text-red-400 text-sm">{advisoryError}</p>}

                  {snapshot && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs text-neutral-400" title="Pollutant sub-indices on the US AQI scale">
                      <div>PM2.5<div className="text-neutral-100 font-medium">{snapshot.pm2_5 ?? "--"}</div></div>
                      <div>PM10<div className="text-neutral-100 font-medium">{snapshot.pm10 ?? "--"}</div></div>
                      <div>NO₂<div className="text-neutral-100 font-medium">{snapshot.no2 ?? "--"}</div></div>
                      <div>O₃<div className="text-neutral-100 font-medium">{snapshot.o3 ?? "--"}</div></div>
                      <div>SO₂<div className="text-neutral-100 font-medium">{snapshot.so2 ?? "--"}</div></div>
                      <div>CO<div className="text-neutral-100 font-medium">{snapshot.co ?? "--"}</div></div>
                    </div>
                  )}

                  {advisory && (
                    <div className="bg-white/[0.06] rounded-lg p-4 text-sm leading-relaxed">
                      {advisory}
                    </div>
                  )}

                  {selected && (
                    <div className="pt-2 border-t border-white/10">
                      <LocalityHistoryChart uid={selected.uid} locality={selected.locality} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Trip Planner */}
            <section className="container mx-auto px-4 pb-16 max-w-3xl">
              <TripPlanner onViewStation={handleSelectByUid} />
            </section>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default DelhiLocalitiesPage;
