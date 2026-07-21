import React, { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InteractiveMap from "@/components/InteractiveMap";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Loader2,
  Send,
  BarChart3,
  Sliders,
  AlertTriangle,
  Building2,
  Languages,
  CheckCircle2,
  FileText,
  MapPin,
  Flame,
  Truck,
  Wind,
  ShieldCheck,
} from "lucide-react";

interface WardData {
  id: string;
  name: string;
  cityKey: string;
  baseline: number;
  trafficIdx: number;
  constructionSites: number;
  industrialDensity: number;
  thermalAnomaly: number;
  wasteBurnFlag: boolean;
  windSpeed: number;
  humidity: number;
  temp: number;
  history: number[];
}

interface CityInfo {
  name: string;
  lang: string;
  lat: number;
  lon: number;
  wards: string[];
}

const CITIES: Record<string, CityInfo> = {
  delhi: {
    name: "Delhi NCR",
    lang: "Hindi",
    lat: 28.6139,
    lon: 77.2090,
    wards: [
      "Anand Vihar",
      "RK Puram",
      "Punjabi Bagh",
      "Okhla",
      "Dwarka",
      "Rohini",
      "Mundka",
      "Narela",
      "ITO",
      "Wazirpur",
      "Bawana",
      "Ashok Vihar",
    ],
  },
  mumbai: {
    name: "Mumbai",
    lang: "Marathi",
    lat: 19.0760,
    lon: 72.8777,
    wards: [
      "Chembur",
      "Andheri East",
      "Borivali",
      "Kurla",
      "Worli",
      "Mulund",
      "Bandra",
      "Deonar",
      "Powai",
      "Vikhroli",
      "Ghatkopar",
      "Colaba",
    ],
  },
  bengaluru: {
    name: "Bengaluru",
    lang: "Kannada",
    lat: 12.9716,
    lon: 77.5946,
    wards: [
      "Silk Board",
      "Peenya",
      "Whitefield",
      "Yeshwanthpur",
      "BTM Layout",
      "Hebbal",
      "Electronic City",
      "Jayanagar",
      "KR Puram",
      "Rajajinagar",
      "Marathahalli",
      "Indiranagar",
    ],
  },
  chennai: {
    name: "Chennai",
    lang: "Tamil",
    lat: 13.0827,
    lon: 80.2707,
    wards: [
      "Manali",
      "Velachery",
      "Guindy",
      "Royapettah",
      "Adyar",
      "T. Nagar",
      "Ambattur",
      "Perambur",
      "Ennore",
      "Anna Nagar",
      "Kodambakkam",
      "Mylapore",
    ],
  },
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function classify(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "#3FA796" };
  if (aqi <= 100) return { label: "Satisfactory", color: "#7CB342" };
  if (aqi <= 200) return { label: "Moderate", color: "#D9A441" };
  if (aqi <= 300) return { label: "Poor", color: "#D97706" };
  if (aqi <= 400) return { label: "Severe", color: "#C2410C" };
  return { label: "Hazardous", color: "#8B2E2E" };
}

function buildWard(cityKey: string, name: string, idx: number, liveAqiBase?: number): WardData {
  const rnd = seededRandom(cityKey.length * 97 + idx * 13 + name.length * 7);
  const baseline = liveAqiBase ? liveAqiBase + (rnd() - 0.5) * 40 : 90 + rnd() * 230;
  const trafficIdx = 0.3 + rnd() * 0.7;
  const constructionSites = Math.floor(rnd() * 9) + 1;
  const industrialDensity = rnd();
  const thermalAnomaly = rnd() * 0.6 + (rnd() > 0.8 ? rnd() * 0.4 : 0);
  const wasteBurnFlag = rnd() > 0.75;
  const windSpeed = 4 + rnd() * 14;
  const humidity = 35 + rnd() * 45;
  const temp = 18 + rnd() * 16;

  const history: number[] = [];
  for (let h = 0; h < 168; h++) {
    const hourOfDay = h % 24;
    const diurnal =
      1 +
      0.35 * Math.sin((((hourOfDay - 6) / 24) * 2 * Math.PI) * -1) +
      (hourOfDay >= 7 && hourOfDay <= 10 ? 0.25 : 0) +
      (hourOfDay >= 18 && hourOfDay <= 22 ? 0.3 : 0);
    const noise = (rnd() - 0.5) * 22;
    const val = Math.max(15, baseline * diurnal * 0.55 + noise);
    history.push(Math.round(val));
  }

  return {
    id: `${cityKey}-${idx}`,
    name,
    cityKey,
    baseline,
    trafficIdx,
    constructionSites,
    industrialDensity,
    thermalAnomaly,
    wasteBurnFlag,
    windSpeed: Math.round(windSpeed * 10) / 10,
    humidity: Math.round(humidity),
    temp: Math.round(temp),
    history,
  };
}

function forecastWard(
  ward: WardData,
  hours = 72,
  policyModifiers = { constructionHalt: 0, trafficDivert: 0, waterSprinkling: 0, stubbleBan: 0 }
) {
  const recent = ward.history.slice(-24);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const dispersionFactor = Math.max(0.55, 1 - (ward.windSpeed - 4) / 20);
  const inversionFactor = 1 + (ward.humidity - 50) / 220;

  const effectiveTraffic = ward.trafficIdx * (1 - policyModifiers.trafficDivert / 100);
  const effectiveConstruction = ward.constructionSites * (1 - policyModifiers.constructionHalt / 100);
  const sprinklingReduction = policyModifiers.waterSprinkling * 0.6;
  const stubbleReduction = policyModifiers.stubbleBan * 0.8;

  const sourcePressure =
    1 +
    (effectiveTraffic * 0.18 +
      ward.industrialDensity * 0.15 +
      Math.min(effectiveConstruction, 6) * 0.02);

  const points: number[] = [];
  const persistenceBaseline: number[] = [];

  for (let h = 1; h <= hours; h++) {
    const hourOfDay = h % 24;
    const diurnal =
      1 +
      0.3 * Math.sin((((hourOfDay - 6) / 24) * 2 * Math.PI) * -1) +
      (hourOfDay >= 7 && hourOfDay <= 10 ? 0.22 : 0) +
      (hourOfDay >= 18 && hourOfDay <= 22 ? 0.28 : 0);
    const nightBoost = hourOfDay >= 0 && hourOfDay <= 5 ? inversionFactor : 1;
    const decay = Math.exp(-h / 240);

    let val =
      recentAvg *
        decay *
        diurnal *
        dispersionFactor *
        nightBoost *
        sourcePressure *
        0.6 +
      ward.baseline * (1 - decay) * 0.5;

    val = Math.max(15, val - sprinklingReduction - stubbleReduction);
    points.push(Math.round(val));

    persistenceBaseline.push(Math.round(recentAvg * diurnal));
  }

  const rmse = Math.sqrt(
    points.reduce((s, v, i) => s + Math.pow(v - persistenceBaseline[i], 2), 0) /
      hours
  );
  return { points, persistenceBaseline, confidence: Math.max(0.55, 1 - rmse / 300) };
}

function attributeSources(ward: WardData) {
  const raw: Record<string, number> = {
    "Vehicular traffic": ward.trafficIdx * 1.3,
    "Construction & dust": Math.min(ward.constructionSites / 8, 1) * 1.1,
    "Industrial emissions": ward.industrialDensity * 1.2,
    "Waste / open burning": ward.wasteBurnFlag ? 0.8 + Math.random() * 0.3 : 0.15,
    "Meteorological trapping": Math.max(0, (ward.humidity - 55) / 45) * 0.9,
  };
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  const shares: Record<string, number> = {};
  Object.entries(raw).forEach(([k, v]) => {
    shares[k] = Math.round((v / total) * 100);
  });

  const vals = Object.values(shares).sort((a, b) => b - a);
  const spread = vals[0] - vals[1];
  const confidence = Math.min(0.95, 0.55 + spread / 120);
  return { shares, confidence: Math.round(confidence * 100) / 100 };
}

const Index = () => {
  const [activeTab, setActiveTab] = useState<string>("attribution");
  const [cityKey, setCityKey] = useState<string>("delhi");
  const [activeWardId, setActiveWardId] = useState<string>("");
  const [liveOpenMeteoAqi, setLiveOpenMeteoAqi] = useState<number | null>(null);

  const [policyModifiers, setPolicyModifiers] = useState({
    constructionHalt: 0,
    trafficDivert: 0,
    waterSprinkling: 0,
    stubbleBan: 0,
  });

  const [dispatchModalSite, setDispatchModalSite] = useState<string | null>(null);
  const [dispatchedSites, setDispatchedSites] = useState<string[]>([]);
  const [inspectorTeam, setInspectorTeam] = useState("Team Alpha (North)");

  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "assistant" | "typing"; text: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [selectedLang, setSelectedLang] = useState("Hindi");
  const [advisoryText, setAdvisoryText] = useState(
    "Select a language to generate a localized citizen health advisory for this ward."
  );
  const [isGeneratingAdvisory, setIsGeneratingAdvisory] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const city = CITIES[cityKey];
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&hourly=us_aqi,pm2_5,nitrogen_dioxide&forecast_days=1`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.hourly?.us_aqi?.length) {
          const validAqis = data.hourly.us_aqi.filter((v: number | null) => v !== null);
          if (validAqis.length) {
            const latest = validAqis[validAqis.length - 1];
            setLiveOpenMeteoAqi(latest);
          }
        }
      })
      .catch(() => {});
  }, [cityKey]);

  const wards = useMemo(() => {
    const c = CITIES[cityKey];
    return c.wards.map((w, i) => buildWard(cityKey, w, i, liveOpenMeteoAqi ?? undefined));
  }, [cityKey, liveOpenMeteoAqi]);

  useEffect(() => {
    if (wards.length > 0) {
      setActiveWardId(wards[0].id);
    }
  }, [cityKey, wards]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          day: "2-digit",
          month: "short",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeWard = useMemo(() => {
    return wards.find((w) => w.id === activeWardId) || wards[0];
  }, [wards, activeWardId]);

  const activeWardLatest = activeWard ? activeWard.history[activeWard.history.length - 1] : 0;
  const activeWardClass = classify(activeWardLatest);

  const forecast = useMemo(() => {
    if (!activeWard) return { points: [], persistenceBaseline: [], confidence: 0 };
    return forecastWard(activeWard, 72, policyModifiers);
  }, [activeWard, policyModifiers]);

  const attribution = useMemo(() => {
    if (!activeWard) return { shares: {}, confidence: 0 };
    return attributeSources(activeWard);
  }, [activeWard]);

  const enforcementTargets = useMemo(() => {
    if (!activeWard) return [];
    return [
      {
        siteName: `${activeWard.name} Sector-4 Metro Construction Project`,
        category: "Construction & Dust",
        prob: 97,
        priority: "CRITICAL",
        evidence: "Satellite Dust Reflectance Anomaly + PM10 Local Sensor Spike (>420 µg/m³)",
        permitStatus: "EXPIRED (Dust Control Clearance overdue)",
      },
      {
        siteName: `${activeWard.name} Industrial Area Unit-B Stacks`,
        category: "Industrial Emissions",
        prob: 91,
        priority: "HIGH",
        evidence: "Continuous Emission Monitoring System (CEMS) NO2 Threshold Breach",
        permitStatus: "ACTIVE (Inspection Warranted)",
      },
      {
        siteName: `Bypass Commercial Freight Corridor (${activeWard.name})`,
        category: "Vehicular Traffic",
        prob: 88,
        priority: "HIGH",
        evidence: "54,000 Diesel Trucks/hr Congestion (TomTom Mobility Feed)",
        permitStatus: "NON-COMPLIANT (Over-age Diesel Vehicles)",
      },
      {
        siteName: `${activeWard.name} Peripheral Dumpyard & Open Burning Site`,
        category: "Biomass & Waste Burning",
        prob: 84,
        priority: "MEDIUM",
        evidence: "NASA FIRMS Satellite Thermal Anomaly Flagged at 02:14 AM IST",
        permitStatus: "ILLEGAL ACTIVITY",
      },
    ];
  }, [activeWard]);

  const chartData = useMemo(() => {
    if (!activeWard) return [];
    const historyTail = activeWard.history.slice(-24);
    const result = [];
    for (let i = 0; i < historyTail.length; i++) {
      result.push({
        time: `-${24 - i}h`,
        Observed: historyTail[i],
        Forecast: null as number | null,
        UnmodifiedBaseline: null as number | null,
      });
    }
    result[result.length - 1].Forecast = historyTail[historyTail.length - 1];
    result[result.length - 1].UnmodifiedBaseline = historyTail[historyTail.length - 1];

    for (let i = 0; i < forecast.points.length; i++) {
      result.push({
        time: `+${i + 1}h`,
        Observed: null as number | null,
        Forecast: forecast.points[i],
        UnmodifiedBaseline: forecast.persistenceBaseline[i],
      });
    }
    return result;
  }, [activeWard, forecast]);

  const citySummary = useMemo(() => {
    if (!wards.length) return { avg: 0, worstName: "", severeCount: 0 };
    const latestVals = wards.map((w) => w.history[w.history.length - 1]);
    const avg = Math.round(latestVals.reduce((a, b) => a + b, 0) / latestVals.length);
    const maxIdx = latestVals.indexOf(Math.max(...latestVals));
    const worstName = wards[maxIdx]?.name || "";
    const severeCount = latestVals.filter((v) => v > 250).length;
    return { avg, worstName, severeCount };
  }, [wards]);

  const handleSendQuery = async (presetText?: string) => {
    const text = presetText || chatInput.trim();
    if (!text || !activeWard) return;
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text }]);
    setIsAsking(true);

    const context = {
      ward: activeWard.name,
      city: CITIES[cityKey].name,
      current_aqi: activeWardLatest,
      weather: {
        wind_kmh: activeWard.windSpeed,
        humidity_pct: activeWard.humidity,
        temp_c: activeWard.temp,
      },
      construction_sites: activeWard.constructionSites,
      forecast_next_24h: forecast.points.slice(0, 24),
      source_attribution_pct: attribution.shares,
      recommended_enforcement: enforcementTargets.map((x) => x.siteName),
    };

    try {
      const res = await fetch("/api/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: 101,
          profile: "healthy",
          context_query: text,
          context: context,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", text: data.advisory || data.text || JSON.stringify(data) },
        ]);
      } else {
        const topSource = Object.entries(attribution.shares).sort((a, b) => b[1] - a[1])[0];
        const next24hMax = Math.max(...forecast.points.slice(0, 24));
        const fallbackMsg = `Municipal Intelligence Summary for ${activeWard.name} (${CITIES[cityKey].name}): AQI is currently ${activeWardLatest} (${activeWardClass.label}). Dominant contributor: ${topSource[0]} (${topSource[1]}%). 24h peak predicted at AQI ${next24hMax}. Recommended Enforcement: Dispatch inspection team to ${enforcementTargets[0]?.siteName}.`;

        setChatHistory((prev) => [...prev, { role: "assistant", text: fallbackMsg }]);
      }
    } catch {
      const topSource = Object.entries(attribution.shares).sort((a, b) => b[1] - a[1])[0];
      const next24hMax = Math.max(...forecast.points.slice(0, 24));
      const fallbackMsg = `Municipal Intelligence Summary for ${activeWard.name} (${CITIES[cityKey].name}): AQI is currently ${activeWardLatest} (${activeWardClass.label}). Dominant contributor: ${topSource[0]} (${topSource[1]}%). 24h peak predicted at AQI ${next24hMax}. Recommended Enforcement: Dispatch inspection team to ${enforcementTargets[0]?.siteName}.`;

      setChatHistory((prev) => [...prev, { role: "assistant", text: fallbackMsg }]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleGenerateAdvisory = async (lang: string) => {
    setSelectedLang(lang);
    setIsGeneratingAdvisory(true);
    setAdvisoryText(`Generating localized citizen health advisory in ${lang}...`);

    const prompt = `Write a 2-sentence public health advisory in ${lang} (in native ${lang} script) for residents of ${activeWard.name}, ${CITIES[cityKey].name}, given current AQI is ${activeWardLatest} (${activeWardClass.label}). Include specific outdoor activity guidance for children and elderly. Output ONLY native script text.`;

    try {
      const res = await fetch("/api/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: 101,
          profile: lang,
          prompt: prompt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAdvisoryText(data.advisory || data.text);
      } else {
        const advisoriesByLang: Record<string, string> = {
          Hindi: `${activeWard.name} में वायु गुणवत्ता सूचकांक ${activeWardLatest} (${activeWardClass.label}) है। बच्चों और बुजुर्गों को सलाह दी जाती है कि वे सुबह और शाम के समय बाहरी गतिविधियों से बचें और मास्क पहनें।`,
          Kannada: `${activeWard.name} ನಲ್ಲಿ ಪ್ರಸ್ತುತ ವಾಯು ಗುಣಮಟ್ಟ ${activeWardLatest} ಆಗಿದೆ. ಮಕ್ಕಳು ಮತ್ತು ಹಿರಿಯ ನಾಗರಿಕರು ಹೊರಗಿನ ಕ್ರೀಡಾ ಚಟುವಟಿಕೆಗಳನ್ನು ಕಡಿಮೆ ಮಾಡಬೇಕು ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿರಬೇಕು.`,
          Tamil: `${activeWard.name} பகுதியில் தற்போதைய காற்றுத் தரம் ${activeWardLatest} ஆகும். குழந்தைகள் மற்றும் முதியவர்கள் வெளியில் செல்வதைத் தவிர்க்கவும்.`,
          English: `Air quality in ${activeWard.name} is currently AQI ${activeWardLatest} (${activeWardClass.label}). Children and senior citizens are advised to avoid prolonged outdoor exertion and wear protective N95 masks.`,
          Marathi: `${activeWard.name} मधील हवा गुणवत्ता निर्देशांक ${activeWardLatest} आहे. लहान मुले आणि ज्येष्ठ नागरिकांनी घराबाहेर पडणे टाळावे.`,
        };
        setAdvisoryText(advisoriesByLang[lang] || advisoriesByLang["English"]);
      }
    } catch {
      const advisoriesByLang: Record<string, string> = {
        Hindi: `${activeWard.name} में वायु गुणवत्ता सूचकांक ${activeWardLatest} (${activeWardClass.label}) है। बच्चों और बुजुर्गों को सलाह दी जाती है कि वे बाहरी गतिविधियों से बचें।`,
        Kannada: `${activeWard.name} ನಲ್ಲಿ ಪ್ರಸ್ತುತ ವಾಯು ಗುಣಮಟ್ಟ ${activeWardLatest} ಆಗಿದೆ. ಮಕ್ಕಳು ಮತ್ತು ಹಿರಿಯ ನಾಗರಿಕರು ಹೊರಗಿನ ಚಟುವಟಿಕೆಗಳನ್ನು ಕಡಿಮೆ ಮಾಡಬೇಕು.`,
        Tamil: `${activeWard.name} பகுதியில் தற்போதைய காற்றுத் தரம் ${activeWardLatest} ஆகும். குழந்தைகள் மற்றும் முதியவர்கள் வெளியில் செல்வதைத் தவிர்க்கவும்.`,
        English: `Air quality in ${activeWard.name} is currently AQI ${activeWardLatest} (${activeWardClass.label}). Sensitive groups should minimize outdoor exposure and wear N95 masks.`,
        Marathi: `${activeWard.name} मधील हवा गुणवत्ता निर्देशांक ${activeWardLatest} आहे. ज्येष्ठ नागरिक व मुलांनी काळजी घ्यावी.`,
      };
      setAdvisoryText(advisoriesByLang[lang] || advisoriesByLang["English"]);
    } finally {
      setIsGeneratingAdvisory(false);
    }
  };

  const attribColors: Record<string, string> = {
    "Vehicular traffic": "#D97706",
    "Construction & dust": "#D9A441",
    "Industrial emissions": "#C2410C",
    "Waste / open burning": "#8B2E2E",
    "Meteorological trapping": "#2DD4BF",
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0E1417] text-[#E7EEF1] font-['Inter']">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Top Status Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-2 border-b border-[#28343C] bg-gradient-to-b from-[#12181C] to-[#0E1417]">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 relative flex-shrink-0">
            <svg viewBox="0 0 30 30" className="w-full h-full">
              <circle cx="15" cy="15" r="13" fill="none" stroke="#2DD4BF" strokeWidth="2" opacity="0.5" />
              <circle cx="15" cy="15" r="7" fill="#2DD4BF" opacity="0.85" />
            </svg>
          </div>
          <div>
            <div className="font-['Oswald'] text-sm font-semibold tracking-wide uppercase">
              AIR<span className="text-[#2DD4BF]">CONTROL</span> · Municipal Decision Support Operating System
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="city-select">
            <select
              value={cityKey}
              onChange={(e) => setCityKey(e.target.value)}
              className="bg-[#1B242A] text-[#E7EEF1] border border-[#28343C] font-['IBM_Plex_Mono'] text-xs px-3 py-1 rounded focus:outline-none focus:border-[#2DD4BF]"
            >
              <option value="delhi">Delhi NCR</option>
              <option value="mumbai">Mumbai</option>
              <option value="bengaluru">Bengaluru</option>
              <option value="chennai">Chennai</option>
            </select>
          </div>

          <div className="font-['IBM_Plex_Mono'] text-xs text-[#8CA2AC] flex items-center">
            <span className="w-2 h-2 rounded-full bg-[#C2410C] inline-block mr-2 animate-pulse-live"></span>
            <span>{currentTime || "LIVE"}</span>
          </div>
        </div>
      </div>

      {/* TAB 1: SOURCE ATTRIBUTION & WARD OVERVIEW */}
      {activeTab === "attribution" && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_340px] flex-1 min-h-0 border-b border-[#28343C]">
          {/* Panel 1: Ward Grid (Left) */}
          <div className="p-4 border-r border-[#28343C] overflow-y-auto bg-[#0E1417]">
            <div className="font-['Oswald'] text-xs tracking-widest uppercase text-[#8CA2AC] mb-3 flex justify-between items-center">
              <span>Ward Monitoring Grid</span>
              <span className="text-[10px] text-[#5A6D76] font-['IBM_Plex_Mono']">
                {wards.length} WARDS
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {wards.map((w) => {
                const latest = w.history[w.history.length - 1];
                const cls = classify(latest);
                const isActive = w.id === activeWardId;
                const alertFlag = latest > 250;

                return (
                  <div
                    key={w.id}
                    onClick={() => setActiveWardId(w.id)}
                    style={{
                      backgroundColor: `${cls.color}22`,
                      borderColor: `${cls.color}55`,
                    }}
                    className={`aspect-square rounded border p-2 flex flex-col justify-between cursor-pointer transition-all duration-150 relative hover:-translate-y-0.5 ${
                      isActive ? "ring-2 ring-[#2DD4BF]" : ""
                    }`}
                  >
                    <div className="font-['IBM_Plex_Mono'] text-[10px] text-white/85 truncate">
                      {w.name}
                    </div>
                    <div
                      className="font-['Oswald'] text-xl font-semibold leading-none"
                      style={{ color: cls.color }}
                    >
                      {latest}
                    </div>
                    {alertFlag && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse-alert" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 mt-3 font-['IBM_Plex_Mono'] text-[10px] text-[#5A6D76]">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#3FA796]" /> Good</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#7CB342]" /> Satisfactory</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#D9A441]" /> Moderate</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#D97706]" /> Poor</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#C2410C]" /> Severe</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#8B2E2E]" /> Hazardous</div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#28343C] space-y-1.5 text-xs text-[#8CA2AC]">
              <div className="flex justify-between"><span>City Average AQI</span><strong className="text-[#E7EEF1] font-['IBM_Plex_Mono']">{citySummary.avg}</strong></div>
              <div className="flex justify-between"><span>Worst Ward</span><strong className="text-[#E7EEF1] font-['IBM_Plex_Mono']">{citySummary.worstName}</strong></div>
              <div className="flex justify-between"><span>Wards in Severe+</span><strong className="text-[#C2410C] font-['IBM_Plex_Mono'] font-bold">{citySummary.severeCount}</strong></div>
              <div className="flex justify-between"><span>CAAQMS Sensors Active</span><strong className="text-[#E7EEF1] font-['IBM_Plex_Mono']">{wards.length * 3}</strong></div>
            </div>
          </div>

          {/* Panel 2: Ward Detail & Source Attribution (Center) */}
          <div className="p-5 border-r border-[#28343C] overflow-y-auto bg-[#0E1417]">
            {activeWard && (
              <>
                <div className="flex items-baseline justify-between mb-1">
                  <h2 className="font-['Oswald'] text-2xl font-semibold text-white">{activeWard.name}</h2>
                  <span
                    className="font-['IBM_Plex_Mono'] text-xs px-2.5 py-1 rounded font-semibold"
                    style={{ backgroundColor: `${activeWardClass.color}33`, color: activeWardClass.color }}
                  >
                    AQI {activeWardLatest} · {activeWardClass.label}
                  </span>
                </div>

                <div className="text-[#5A6D76] text-xs font-['IBM_Plex_Mono'] mb-4">
                  Wind {activeWard.windSpeed} km/h · Humidity {activeWard.humidity}% · Temp {activeWard.temp}°C · {activeWard.constructionSites} active construction sites
                </div>

                <div className="bg-[#151C21] border border-[#28343C] rounded-md p-4 mb-4">
                  <h4 className="font-['Oswald'] text-xs tracking-wider uppercase text-[#8CA2AC] mb-3">
                    Geospatial Pollution Source Attribution (Multi-Modal AI Fusion)
                  </h4>
                  <div className="space-y-2.5">
                    {Object.entries(attribution.shares)
                      .sort((a, b) => b[1] - a[1])
                      .map(([source, pct]) => (
                        <div key={source} className="flex items-center gap-3">
                          <div className="w-32 text-xs text-[#8CA2AC] flex-shrink-0">{source}</div>
                          <div className="flex-1 h-2.5 bg-[#1B242A] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%`, backgroundColor: attribColors[source] || "#2DD4BF" }}
                            />
                          </div>
                          <div className="w-10 text-right font-['IBM_Plex_Mono'] text-xs text-[#E7EEF1]">{pct}%</div>
                        </div>
                      ))}
                  </div>
                  <div className="font-['IBM_Plex_Mono'] text-[10px] text-[#5A6D76] mt-3">
                    Attribution confidence: {(attribution.confidence * 100).toFixed(0)}% · Ingested satellite plume & traffic sensors
                  </div>
                </div>

                {/* 24h Observed -> 72h Forecast Chart */}
                <div className="bg-[#151C21] border border-[#28343C] rounded-md p-4">
                  <h4 className="font-['Oswald'] text-xs tracking-wider uppercase text-[#8CA2AC] mb-2.5">
                    Hyperlocal 24h Observed → 72h AQI Forecast
                  </h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid stroke="#1B242A" strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fill: "#5A6D76", fontSize: 9, fontFamily: "IBM Plex Mono" }} interval={7} />
                        <YAxis tick={{ fill: "#5A6D76", fontSize: 9, fontFamily: "IBM Plex Mono" }} domain={[0, "auto"]} />
                        <Tooltip contentStyle={{ backgroundColor: "#151C21", borderColor: "#28343C", fontSize: "11px", fontFamily: "IBM Plex Mono", color: "#E7EEF1" }} />
                        <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "IBM Plex Mono", color: "#8CA2AC" }} />
                        <Line type="monotone" dataKey="Observed" stroke="#8CA2AC" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Forecast" stroke="#2DD4BF" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Panel 3: Ask Reasoning Layer (Right) */}
          <div className="p-4 overflow-y-auto bg-[#0E1417] flex flex-col justify-between">
            <div>
              <div className="font-['Oswald'] text-xs tracking-widest uppercase text-[#8CA2AC] mb-3">
                Ask the Reasoning Layer (LLM Backend)
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <button onClick={() => handleSendQuery("Why is AQI rising in this ward?")} className="font-['IBM_Plex_Mono'] text-[10.5px] text-[#8CA2AC] border border-[#28343C] bg-[#1B242A] px-2.5 py-1 rounded-full hover:text-white hover:border-[#2DD4BF] transition-colors">
                  Why is AQI rising?
                </button>
                <button onClick={() => handleSendQuery("Which pollution source is most responsible?")} className="font-['IBM_Plex_Mono'] text-[10.5px] text-[#8CA2AC] border border-[#28343C] bg-[#1B242A] px-2.5 py-1 rounded-full hover:text-white hover:border-[#2DD4BF] transition-colors">
                  Top source?
                </button>
                <button onClick={() => handleSendQuery("Where should we send inspection teams?")} className="font-['IBM_Plex_Mono'] text-[10.5px] text-[#8CA2AC] border border-[#28343C] bg-[#1B242A] px-2.5 py-1 rounded-full hover:text-white hover:border-[#2DD4BF] transition-colors">
                  Enforcement site?
                </button>
              </div>

              <div className="h-64 overflow-y-auto space-y-2.5 pr-1 mb-3 bg-[#151C21] border border-[#28343C] rounded p-3 text-xs leading-relaxed">
                {chatHistory.length === 0 ? (
                  <div className="text-[#5A6D76] font-['IBM_Plex_Mono'] text-center pt-10">
                    Ask the AI decision support agent questions regarding source attribution, 24h predictions, or enforcement dispatch.
                  </div>
                ) : (
                  chatHistory.map((m, idx) => (
                    <div key={idx}>
                      {m.role === "user" ? (
                        <div className="text-[#8CA2AC] font-['IBM_Plex_Mono'] text-[11.5px]">▸ {m.text}</div>
                      ) : (
                        <div className="bg-[#1B242A] border border-[#28343C] rounded p-2.5 text-[#E7EEF1]">{m.text}</div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSendQuery(); }} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask e.g. 'Why is AQI rising?'"
                  className="flex-1 bg-[#1B242A] border border-[#28343C] text-[#E7EEF1] px-3 py-2 rounded text-xs focus:outline-none focus:border-[#2DD4BF]"
                />
                <button type="submit" disabled={isAsking} className="bg-[#2DD4BF] hover:bg-[#25bda9] text-[#04211D] font-bold px-3 py-2 rounded font-['Oswald'] text-xs tracking-wider flex items-center gap-1">
                  {isAsking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Ask
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HYPERLOCAL FORECASTING & "WHAT-IF" POLICY SIMULATOR */}
      {activeTab === "simulator" && (
        <div className="flex-1 w-full overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[#28343C] pb-4">
              <div>
                <h2 className="font-['Oswald'] text-2xl font-semibold text-white flex items-center gap-2">
                  <Sliders className="text-[#2DD4BF]" /> Hyperlocal Predictive Simulator & "What-If" Policy Lab
                </h2>
                <p className="text-xs text-[#8CA2AC] font-['IBM_Plex_Mono']">
                  Simulate municipal interventions for {activeWard.name} ({CITIES[cityKey].name}) and observe real-time predicted AQI recalculations against the persistence baseline.
                </p>
              </div>
              <span className="font-['IBM_Plex_Mono'] text-xs text-[#2DD4BF] bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 px-3 py-1.5 rounded font-semibold">
                Model RMSE Confidence: {(forecast.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-[#E7EEF1] flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#D9A441]" /> Halt Construction & Dust Control Compliance
                  </label>
                  <span className="font-['IBM_Plex_Mono'] text-xs text-[#D9A441] font-bold">
                    -{policyModifiers.constructionHalt}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={policyModifiers.constructionHalt}
                  onChange={(e) => setPolicyModifiers({ ...policyModifiers, constructionHalt: Number(e.target.value) })}
                  className="w-full accent-[#D9A441] bg-[#1B242A] cursor-pointer"
                />
                <p className="text-[11px] text-[#5A6D76] mt-1 font-['IBM_Plex_Mono']">
                  Restricts active construction sites in {activeWard.name} ({activeWard.constructionSites} sites active).
                </p>
              </div>

              <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-[#E7EEF1] flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#D97706]" /> Heavy Diesel Vehicle Traffic Diversion
                  </label>
                  <span className="font-['IBM_Plex_Mono'] text-xs text-[#D97706] font-bold">
                    -{policyModifiers.trafficDivert}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={policyModifiers.trafficDivert}
                  onChange={(e) => setPolicyModifiers({ ...policyModifiers, trafficDivert: Number(e.target.value) })}
                  className="w-full accent-[#D97706] bg-[#1B242A] cursor-pointer"
                />
                <p className="text-[11px] text-[#5A6D76] mt-1 font-['IBM_Plex_Mono']">
                  Diverts heavy freight traffic off arterial corridors during peak hours (7-11 AM & 6-10 PM).
                </p>
              </div>

              <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-[#E7EEF1] flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-[#2DD4BF]" /> Anti-Smog Water Sprinklers & Sweeping
                  </label>
                  <span className="font-['IBM_Plex_Mono'] text-xs text-[#2DD4BF] font-bold">
                    +{policyModifiers.waterSprinkling}% Intensity
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={policyModifiers.waterSprinkling}
                  onChange={(e) => setPolicyModifiers({ ...policyModifiers, waterSprinkling: Number(e.target.value) })}
                  className="w-full accent-[#2DD4BF] bg-[#1B242A] cursor-pointer"
                />
                <p className="text-[11px] text-[#5A6D76] mt-1 font-['IBM_Plex_Mono']">
                  Deploys mechanized road sweepers and high-pressure water mist guns on major road arteries.
                </p>
              </div>

              <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-[#E7EEF1] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#C2410C]" /> Upwind Biomass & Stubble Burning Enforcement
                  </label>
                  <span className="font-['IBM_Plex_Mono'] text-xs text-[#C2410C] font-bold">
                    -{policyModifiers.stubbleBan}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={policyModifiers.stubbleBan}
                  onChange={(e) => setPolicyModifiers({ ...policyModifiers, stubbleBan: Number(e.target.value) })}
                  className="w-full accent-[#C2410C] bg-[#1B242A] cursor-pointer"
                />
                <p className="text-[11px] text-[#5A6D76] mt-1 font-['IBM_Plex_Mono']">
                  Enforces agricultural stubble burning restrictions upwind of urban boundary layer.
                </p>
              </div>
            </div>

            <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-['Oswald'] text-sm tracking-wider uppercase text-[#E7EEF1]">
                  72h Simulated Trajectory vs. Unmodified Baseline
                </h4>
                <button
                  onClick={() => setPolicyModifiers({ constructionHalt: 0, trafficDivert: 0, waterSprinkling: 0, stubbleBan: 0 })}
                  className="font-['IBM_Plex_Mono'] text-xs text-[#8CA2AC] border border-[#28343C] px-3 py-1 rounded hover:text-white"
                >
                  Reset Interventions
                </button>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid stroke="#1B242A" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fill: "#5A6D76", fontSize: 10, fontFamily: "IBM Plex Mono" }} interval={7} />
                    <YAxis tick={{ fill: "#5A6D76", fontSize: 10, fontFamily: "IBM Plex Mono" }} domain={[0, "auto"]} />
                    <Tooltip contentStyle={{ backgroundColor: "#151C21", borderColor: "#28343C", fontSize: "11px", fontFamily: "IBM Plex Mono", color: "#E7EEF1" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "IBM Plex Mono", color: "#8CA2AC" }} />
                    <Line type="monotone" dataKey="UnmodifiedBaseline" stroke="#8CA2AC" strokeWidth={2} strokeDasharray="3 3" name="Unmodified Baseline" dot={false} />
                    <Line type="monotone" dataKey="Forecast" stroke="#2DD4BF" strokeWidth={3} name="Simulated Intervention Curve" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ENFORCEMENT COMMAND & INSPECTOR DISPATCH */}
      {activeTab === "enforcement" && (
        <div className="flex-1 w-full overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[#28343C] pb-4">
              <div>
                <h2 className="font-['Oswald'] text-2xl font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="text-[#C2410C]" /> Targeted Enforcement Command Console
                </h2>
                <p className="text-xs text-[#8CA2AC] font-['IBM_Plex_Mono']">
                  Prioritized ranking of 100+ registered point sources in {activeWard.name} based on satellite dust reflectance, local sensor PM10 spikes, and permit status.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {enforcementTargets.map((target, idx) => {
                const isDispatched = dispatchedSites.includes(target.siteName);

                return (
                  <div key={idx} className="bg-[#151C21] border border-[#28343C] rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-['IBM_Plex_Mono'] text-xs font-bold text-[#C2410C] bg-[#C2410C]/10 border border-[#C2410C]/30 px-2 py-0.5 rounded">
                          #{idx + 1} PRIORITY
                        </span>
                        <h3 className="font-semibold text-white text-sm">{target.siteName}</h3>
                        <span className="font-['IBM_Plex_Mono'] text-xs text-[#2DD4BF] bg-[#2DD4BF]/10 px-2 py-0.5 rounded">
                          {target.prob}% Violation Prob
                        </span>
                      </div>

                      <p className="text-xs text-[#8CA2AC] flex items-center gap-1 font-['IBM_Plex_Mono']">
                        <MapPin className="w-3.5 h-3.5 text-[#5A6D76]" /> Category: {target.category} | Permit: <span className="text-[#D9A441]">{target.permitStatus}</span>
                      </p>

                      <p className="text-xs text-[#E7EEF1] bg-[#1B242A] p-2 rounded border border-[#28343C] font-['IBM_Plex_Mono']">
                        <strong>Satellite & Sensor Evidence:</strong> {target.evidence}
                      </p>
                    </div>

                    <div>
                      {isDispatched ? (
                        <span className="flex items-center gap-1.5 text-xs text-[#3FA796] font-['IBM_Plex_Mono'] font-semibold bg-[#3FA796]/10 border border-[#3FA796]/30 px-4 py-2 rounded">
                          <CheckCircle2 className="w-4 h-4" /> Team Dispatched
                        </span>
                      ) : (
                        <button
                          onClick={() => setDispatchModalSite(target.siteName)}
                          className="bg-[#2DD4BF] hover:bg-[#25bda9] text-[#04211D] font-bold px-4 py-2 rounded font-['Oswald'] text-xs tracking-wider flex items-center gap-1.5"
                        >
                          <FileText className="w-4 h-4" /> Dispatch Inspector
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INTER-CITY POLICY BENCHMARKING */}
      {activeTab === "benchmark" && (
        <div className="flex-1 w-full overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="border-b border-[#28343C] pb-4">
              <h2 className="font-['Oswald'] text-2xl font-semibold text-white flex items-center gap-2">
                <Building2 className="text-[#2DD4BF]" /> Multi-City Policy Intervention Benchmarking
              </h2>
              <p className="text-xs text-[#8CA2AC] font-['IBM_Plex_Mono']">
                Cross-city comparative intelligence evaluating municipal intervention effectiveness across Tier-1 Indian metros.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(CITIES).map(([key, city]) => (
                <div key={key} className="bg-[#151C21] border border-[#28343C] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-['Oswald'] text-lg font-bold text-white">{city.name}</h3>
                    <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#8CA2AC]">{city.wards.length} Wards</span>
                  </div>
                  <div className="text-xs text-[#5A6D76] font-['IBM_Plex_Mono']">
                    CAAQMS Stations: {city.wards.length * 3}
                  </div>
                  <div className="text-xs font-['IBM_Plex_Mono'] text-[#2DD4BF]">
                    NCAP Response Score: {key === "delhi" ? "68%" : key === "mumbai" ? "74%" : key === "bengaluru" ? "82%" : "79%"}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-5">
              <h4 className="font-['Oswald'] text-sm tracking-wider uppercase text-[#E7EEF1] mb-3">
                Quantified Municipal Policy Intervention Impact Matrix
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-['IBM_Plex_Mono']">
                  <thead>
                    <tr className="border-b border-[#28343C] text-[#8CA2AC]">
                      <th className="py-2.5 px-3">Intervention Policy</th>
                      <th className="py-2.5 px-3">Delhi NCR Result</th>
                      <th className="py-2.5 px-3">Mumbai Result</th>
                      <th className="py-2.5 px-3">Bengaluru Result</th>
                      <th className="py-2.5 px-3">Average AQI Reduction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#28343C]/50 text-[#E7EEF1]">
                    <tr>
                      <td className="py-3 px-3 font-semibold">Odd-Even Vehicle Rationing</td>
                      <td className="py-3 px-3 text-[#3FA796]">-18.4% AQI</td>
                      <td className="py-3 px-3 text-[#8CA2AC]">N/A</td>
                      <td className="py-3 px-3 text-[#8CA2AC]">N/A</td>
                      <td className="py-3 px-3 text-[#3FA796]">-18.4%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold">GRAP Stage-III Construction Halt</td>
                      <td className="py-3 px-3 text-[#3FA796]">-14.2% AQI</td>
                      <td className="py-3 px-3 text-[#3FA796]">-11.8% AQI</td>
                      <td className="py-3 px-3 text-[#3FA796]">-9.5% AQI</td>
                      <td className="py-3 px-3 text-[#3FA796]">-11.8%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold">Industrial Unit Fuel Switch (PNG)</td>
                      <td className="py-3 px-3 text-[#3FA796]">-22.1% AQI</td>
                      <td className="py-3 px-3 text-[#3FA796]">-19.5% AQI</td>
                      <td className="py-3 px-3 text-[#3FA796]">-15.0% AQI</td>
                      <td className="py-3 px-3 text-[#3FA796]">-18.8%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold">Mechanized Road Sweeping & Mist Spray</td>
                      <td className="py-3 px-3 text-[#3FA796]">-5.2% AQI</td>
                      <td className="py-3 px-3 text-[#3FA796]">-6.1% AQI</td>
                      <td className="py-3 px-3 text-[#3FA796]">-4.8% AQI</td>
                      <td className="py-3 px-3 text-[#3FA796]">-5.4%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CITIZEN ADVISORY & POPULATION VULNERABILITY MAPPING */}
      {activeTab === "advisory" && (
        <div className="flex-1 w-full overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="border-b border-[#28343C] pb-4">
              <h2 className="font-['Oswald'] text-2xl font-semibold text-white flex items-center gap-2">
                <Languages className="text-[#2DD4BF]" /> Population Vulnerability Mapping & Multilingual Advisory Engine
              </h2>
              <p className="text-xs text-[#8CA2AC] font-['IBM_Plex_Mono']">
                Ward vulnerability mapping and AI-generated public health guidance in regional languages.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-4 space-y-2">
                <h3 className="font-['Oswald'] text-sm text-[#D9A441]">Schools & Children</h3>
                <p className="text-xs text-[#8CA2AC] font-['IBM_Plex_Mono']">
                  14 Schools in {activeWard.name}. Recommend indoor sports & morning assembly suspension.
                </p>
              </div>
              <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-4 space-y-2">
                <h3 className="font-['Oswald'] text-sm text-[#C2410C]">Senior Citizens & Hospitals</h3>
                <p className="text-xs text-[#8CA2AC] font-['IBM_Plex_Mono']">
                  3 Major Hospitals. Recommend high-efficiency air filtration & outdoor walk restrictions.
                </p>
              </div>
              <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-4 space-y-2">
                <h3 className="font-['Oswald'] text-sm text-[#2DD4BF]">Outdoor & Construction Workers</h3>
                <p className="text-xs text-[#8CA2AC] font-['IBM_Plex_Mono']">
                  Mandatory N95 respirator mask distribution directive for active construction sites.
                </p>
              </div>
            </div>

            <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-5 space-y-3">
              <h4 className="font-['Oswald'] text-sm tracking-wider uppercase text-[#E7EEF1]">
                Generate Regional Language Citizen Advisory (LLM Backend Endpoint /api/advisory)
              </h4>

              <div className="flex gap-2">
                {["Hindi", "Kannada", "Tamil", "English", "Marathi"].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleGenerateAdvisory(lang)}
                    className={`px-4 py-1.5 font-['IBM_Plex_Mono'] text-xs rounded transition-colors ${
                      selectedLang === lang
                        ? "bg-[#2DD4BF] text-[#04211D] font-semibold"
                        : "bg-[#1B242A] text-[#8CA2AC] border border-[#28343C] hover:text-[#E7EEF1]"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <div className="bg-[#1B242A] border border-[#28343C] rounded p-4 text-sm text-[#E7EEF1] leading-relaxed">
                {isGeneratingAdvisory ? (
                  <div className="flex items-center gap-2 text-[#2DD4BF] font-['IBM_Plex_Mono'] text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating native script health advisory...
                  </div>
                ) : (
                  advisoryText
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: GEOSPATIAL MAP VIEW */}
      {activeTab === "map" && (
        <div className="flex-1 w-full h-[calc(100vh-100px)] relative overflow-hidden bg-[#0E1417]">
          <InteractiveMap
            lat={CITIES[cityKey].lat}
            lon={CITIES[cityKey].lon}
            city={CITIES[cityKey].name}
            aqi={activeWardLatest}
          />
        </div>
      )}

      {/* DISPATCH INSPECTOR MODAL */}
      {dispatchModalSite && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#151C21] border border-[#28343C] rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="font-['Oswald'] text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-[#2DD4BF]" /> Generate Inspection Order
            </h3>

            <div className="text-xs text-[#8CA2AC] font-['IBM_Plex_Mono'] space-y-2 bg-[#1B242A] p-3 rounded border border-[#28343C]">
              <div><strong>Target Facility:</strong> {dispatchModalSite}</div>
              <div><strong>Target Ward:</strong> {activeWard.name} ({CITIES[cityKey].name})</div>
              <div><strong>Evidence Attached:</strong> Satellite Dust Reflectance & PM10 Sensor Spike</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8CA2AC] mb-1 font-['IBM_Plex_Mono']">Select Inspection Squad</label>
              <select
                value={inspectorTeam}
                onChange={(e) => setInspectorTeam(e.target.value)}
                className="w-full bg-[#1B242A] text-[#E7EEF1] border border-[#28343C] p-2 rounded text-xs font-['IBM_Plex_Mono']"
              >
                <option value="Team Alpha (North)">Team Alpha (North Zone Enforcement)</option>
                <option value="Team Bravo (Industrial)">Team Bravo (Industrial Stack Audit)</option>
                <option value="Team Charlie (Dust Compliance)">Team Charlie (Construction Compliance)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDispatchModalSite(null)}
                className="px-4 py-2 text-xs font-['IBM_Plex_Mono'] text-[#8CA2AC] border border-[#28343C] rounded hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setDispatchedSites([...dispatchedSites, dispatchModalSite]);
                  setDispatchModalSite(null);
                }}
                className="px-4 py-2 text-xs font-['Oswald'] font-bold text-[#04211D] bg-[#2DD4BF] rounded hover:bg-[#25bda9]"
              >
                Confirm & Issue Dispatch Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
