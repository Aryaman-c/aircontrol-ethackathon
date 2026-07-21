import { useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useHistory } from "@/hooks/useLocalities";

interface Props {
  uid: number;
  locality: string;
}

export default function LocalityHistoryChart({ uid, locality }: Props) {
  const { points, source, loading, fetchHistory } = useHistory();

  useEffect(() => {
    fetchHistory(uid);
  }, [uid, fetchHistory]);

  const chartData = points.map((p) => ({
    time:
      typeof p.timestamp === "number"
        ? new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : p.timestamp,
    aqi: p.aqi ?? null,
    pm2_5: p.pm2_5 ?? null,
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          {locality} — live history
        </h4>
        {source && (
          <Badge variant="outline" className="text-[10px]">
            {source === "elastic" ? "from Elasticsearch" : "WAQI forecast (no Elastic history yet)"}
          </Badge>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </div>
      )}

      {!loading && chartData.length <= 1 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Only {chartData.length} reading indexed so far — refresh the locality board
          a few times to build up Elastic history.
        </p>
      )}

      {!loading && chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={36} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey={source === "elastic" ? "aqi" : "pm2_5"} stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
