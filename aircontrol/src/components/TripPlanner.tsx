import { useState } from "react";
import { CalendarDays, Loader2, MapPin, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTripPlan, type TripActivity } from "@/hooks/useLocalities";

const ACTIVITIES: { value: TripActivity; label: string }[] = [
  { value: "school_trip", label: "School trip (children)" },
  { value: "sports", label: "Outdoor sports / training" },
  { value: "picnic", label: "Picnic / family outing" },
  { value: "walk", label: "Walk or jog" },
  { value: "errand", label: "General outdoor errand" },
];

interface Props {
  onViewStation?: (uid: number) => void;
}

export default function TripPlanner({ onViewStation }: Props) {
  const { result, loading, error, fetchTripPlan } = useTripPlan();
  const [activity, setActivity] = useState<TripActivity>("school_trip");

  return (
    <Card className="bg-neutral-900/80 backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-400" />
          Plan an Outdoor Activity
        </CardTitle>
        <p className="text-sm text-neutral-400">
          Gemini picks the best Delhi locality and time window from live station data + forecasts.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={activity} onValueChange={(v) => setActivity(v as TripActivity)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Activity" />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITIES.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => fetchTripPlan(activity)} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Thinking…" : "Get Recommendation"}
          </Button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {result && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="text-sm gap-1.5" variant="secondary">
                <MapPin className="h-3.5 w-3.5" />
                {result.recommendation.locality}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {result.recommendation.day} · {result.recommendation.time_of_day}
              </Badge>
            </div>

            <p className="text-sm leading-relaxed bg-white/[0.06] rounded-lg p-4">
              {result.recommendation.reasoning}
            </p>

            <p className="text-sm text-amber-300/90">
              <span className="font-medium">Safety note: </span>
              {result.recommendation.safety_note}
            </p>

            {onViewStation && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onViewStation(result.uid)}
              >
                View this station above
              </Button>
            )}

            <details className="text-xs text-neutral-500">
              <summary className="cursor-pointer hover:text-neutral-300">
                Other localities considered
              </summary>
              <ul className="mt-2 space-y-1">
                {result.candidates_considered.map((c) => (
                  <li key={c.name}>{c.name} — AQI {c.aqi}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
