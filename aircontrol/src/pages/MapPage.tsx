import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import InteractiveMap from "@/components/InteractiveMap";
import { useAirQuality } from "@/hooks/useAirQuality";

export default function MapPage() {
  const [input, setInput] = useState("");
  const { data, loading, error, search } = useAirQuality();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(input);
  };

  return (
    <div className="min-h-screen bg-[#0E1417] flex flex-col text-[#E7EEF1]">
      <Header />
      <div className="sticky top-[57px] z-40 bg-[#0E1417]/95 border-b border-[#28343C] backdrop-blur">
        <div className="container mx-auto px-4 py-2.5">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8CA2AC]" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search any Indian metro or ward — Delhi, Mumbai, Bengaluru..."
                className="w-full pl-9 pr-4 py-1.5 bg-[#1B242A] border border-[#28343C] rounded text-[#E7EEF1] placeholder-[#5A6D76] text-xs font-['IBM_Plex_Mono'] focus:outline-none focus:border-[#2DD4BF]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#2DD4BF] hover:bg-[#25bda9] disabled:opacity-50 text-[#04211D] text-xs font-bold rounded font-['Oswald'] tracking-wider flex items-center gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? "Locating..." : "Fly Map"}
            </button>
          </form>
          {error && <p className="text-red-400 text-xs mt-1 font-['IBM_Plex_Mono']">{error}</p>}
        </div>
      </div>
      <div className="flex-1">
        <InteractiveMap
          lat={data?.lat}
          lon={data?.lon}
          city={data?.city}
          aqi={data?.current.aqi}
        />
      </div>
    </div>
  );
}
