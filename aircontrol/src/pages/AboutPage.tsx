import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Brain, Map, Wind } from "lucide-react";

const stack = [
  { layer: "Frontend",      tech: "React 18 + TypeScript + Vite" },
  { layer: "UI",            tech: "shadcn/ui + Tailwind CSS + Recharts + Leaflet" },
  { layer: "Backend",       tech: "FastAPI (Python) — Vercel serverless functions" },
  { layer: "Delhi AQI",     tech: "WAQI — 24 live DPCC/CPCB ground stations" },
  { layer: "Health Advisory", tech: "Google Gemini — profile-aware guidance per station" },
  { layer: "Locality History", tech: "Elasticsearch — indexes every reading in real time" },
  { layer: "ML Forecast",   tech: "Hour-of-day seasonal average — computed per-request on live data (no ML deps, keeps serverless bundle lean)" },
  { layer: "Auth",          tech: "Supabase (email / password)" },
  { layer: "Global AQI",    tech: "Open-Meteo Air Quality + Forecast API" },
  { layer: "Geocoding",     tech: "OpenStreetMap Nominatim" },
  { layer: "Hosting",       tech: "Vercel (free tier)" },
];

const features = [
  { icon: Wind,  title: "Delhi Locality Watch", desc: "24 real DPCC/CPCB ground stations ranked worst-to-best, refreshed live." },
  { icon: Brain, title: "AI Health Advisory",    desc: "Gemini-generated, profile-aware guidance — asthma, elderly, child, pregnant — per station." },
  { icon: Map,   title: "Global City Search",    desc: "Search any city worldwide for live AQI, forecast, and interactive map." },
];

const team = ["Satyansh Gaur", "Saksham Arora"];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-3">About Vayu Watch</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Built at the Elastic × Google Cloud Hacknight (Delhi) on top of an earlier hackathon project
            (OrbitAir). Real Delhi ground station data, indexed live in Elasticsearch, with Gemini-powered
            personalized public health advisories.
          </p>
          <a
            href="https://github.com/saksham10arora-dotcom/vayu-watch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white text-sm rounded-md transition-colors"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <f.icon className="h-5 w-5 text-blue-400" />
                  {f.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {stack.map((s) => (
                <div key={s.layer} className="flex items-start gap-4 py-3">
                  <span className="text-sm font-medium w-28 shrink-0 text-muted-foreground">{s.layer}</span>
                  <span className="text-sm">{s.tech}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {team.map((name) => (
              <Badge key={name} variant="secondary" className="text-sm px-3 py-1">{name}</Badge>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
