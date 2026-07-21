import { ShieldAlert, BarChart3, Sliders, AlertTriangle, Building2, Languages, Map } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const location = useLocation();

  const navTabs = [
    { id: "attribution", label: "Source Attribution", icon: BarChart3, href: "/" },
    { id: "simulator", label: "Policy Simulator", icon: Sliders, href: "/#simulator" },
    { id: "enforcement", label: "Enforcement Dispatch", icon: AlertTriangle, href: "/#enforcement" },
    { id: "benchmark", label: "Inter-City Policy", icon: Building2, href: "/#benchmark" },
    { id: "advisory", label: "Citizen Advisory", icon: Languages, href: "/#advisory" },
    { id: "map", label: "Geospatial Map", icon: Map, href: "/map" }
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#28343C] bg-[#0E1417] text-[#E7EEF1] shadow-md">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center space-x-2.5">
            <ShieldAlert className="h-7 w-7 text-[#2DD4BF]" />
            <div>
              <h1 className="font-['Oswald'] text-xl font-bold tracking-wide uppercase leading-none">
                AIR<span className="text-[#2DD4BF]">CONTROL</span>
              </h1>
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#5A6D76] tracking-wider uppercase mt-0.5">
                AI Urban Air Quality Decision Support System
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-1.5">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab ? activeTab === tab.id : location.pathname === tab.href;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (setActiveTab) {
                      setActiveTab(tab.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-['IBM_Plex_Mono'] text-xs transition-colors ${
                    isSelected
                      ? "bg-[#2DD4BF] text-[#04211D] font-semibold"
                      : "text-[#8CA2AC] hover:text-[#E7EEF1] hover:bg-[#1B242A]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;