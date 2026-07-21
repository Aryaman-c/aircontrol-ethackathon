import { useState, useCallback } from "react";
import { Brain, TrendingUp, Loader2, AlertCircle, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Prediction {
  hour: string;
  predicted_aqi: number;
  lower: number;
  upper: number;
  label: string;
  color: string;
  pm2_5: number;
  no2: number;
  o3: number;
}

interface MLResult {
  city: string;
  model: string;
  training_samples: number;
  r2_score: number;
  feature_importances: { feature: string; importance: number }[];
  predictions: Prediction[];
}

const API = import.meta.env.VITE_API_URL ?? "";

export default function MLPrediction({ city }: { city?: string }) {
  const [result, setResult] = useState<MLResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (c: string) => {
    if (!c) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/ml?name=${encodeURIComponent(c)}`);
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || "Prediction failed");
      }
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const chartData = result?.predictions.map(p => ({
    time: p.hour,
    aqi: p.predicted_aqi,
    lower: p.lower,
    upper: p.upper,
  })) ?? [];

  return (
    <section className="py-12 bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Brain className="h-8 w-8 text-purple-400" />
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI-Powered AQI Forecast
            </h2>
          </div>
          <p className="text-gray-400 text-lg">
            Random Forest trained live on 7 days of local data — predicts next 6 hours with confidence bounds
          </p>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          {/* Run button */}
          <div className="flex justify-center">
            <button
              onClick={() => city && run(city)}
              disabled={loading || !city}
              className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-900/30"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Training model...</>
              ) : (
                <><Brain className="h-5 w-5" /> {city ? `Run ML for ${city}` : "Search a city first"}</>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 border border-red-900 rounded-xl px-4 py-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <>
              {/* Model stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5">
                    <p className="text-xs text-gray-500 mb-1">Model</p>
                    <p className="text-white font-semibold">{result.model}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5">
                    <p className="text-xs text-gray-500 mb-1">Training samples</p>
                    <p className="text-2xl font-bold text-purple-400">{result.training_samples}</p>
                    <p className="text-xs text-gray-600">hourly observations</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5">
                    <p className="text-xs text-gray-500 mb-1">R² score</p>
                    <p className="text-2xl font-bold text-green-400">{result.r2_score}</p>
                    <p className="text-xs text-gray-600">fit on historical data</p>
                  </CardContent>
                </Card>
              </div>

              {/* Prediction cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {result.predictions.map((p, i) => (
                  <Card key={i} className="bg-gray-900 border-gray-800 text-center">
                    <CardContent className="pt-4 pb-3">
                      <p className="text-xs text-gray-500 mb-2">{p.hour}</p>
                      <p className="text-3xl font-bold mb-1" style={{ color: p.color }}>
                        {p.predicted_aqi}
                      </p>
                      <Badge
                        className="text-xs px-2 py-0.5 mb-2"
                        style={{ backgroundColor: p.color + "22", color: p.color, border: `1px solid ${p.color}55` }}
                      >
                        {p.label}
                      </Badge>
                      <p className="text-xs text-gray-600">
                        {p.lower}–{p.upper}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Chart */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    Predicted AQI with 80% Confidence Interval
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                          labelStyle={{ color: "#e5e7eb" }}
                          itemStyle={{ color: "#a855f7" }}
                          formatter={(v: number, name: string) => [
                            v,
                            name === "aqi" ? "Predicted AQI" : name === "upper" ? "Upper bound" : "Lower bound",
                          ]}
                        />
                        <ReferenceLine y={50}  stroke="#22c55e" strokeDasharray="4 4" opacity={0.5} />
                        <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 4" opacity={0.5} />
                        <ReferenceLine y={150} stroke="#f97316" strokeDasharray="4 4" opacity={0.5} />
                        <Area type="monotone" dataKey="upper" stroke="none" fill="url(#ciGrad)" />
                        <Area type="monotone" dataKey="lower" stroke="none" fill="#111827" />
                        <Area
                          type="monotone"
                          dataKey="aqi"
                          stroke="#a855f7"
                          strokeWidth={3}
                          fill="none"
                          dot={{ fill: "#a855f7", r: 5, stroke: "#fff", strokeWidth: 2 }}
                          activeDot={{ r: 8 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Feature importance */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-base">
                    <BarChart2 className="h-5 w-5 text-purple-400" />
                    Feature Importances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.feature_importances.map((f) => (
                      <div key={f.feature} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-28 shrink-0">{f.feature}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500"
                            style={{ width: `${(f.importance * 100).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">
                          {(f.importance * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
