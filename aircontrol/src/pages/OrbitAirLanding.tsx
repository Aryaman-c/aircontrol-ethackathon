import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, LogIn, UserPlus, X, ArrowRight, Loader2 } from "lucide-react";
import Header from "../components/Header";
import { supabase } from "@/lib/supabase";

const OrbitAirLanding: React.FC = () => {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [floatingElements, setFloatingElements] = useState<
    { id: number; x: number; y: number; delay: number; duration: number }[]
  >([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const elements = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 20 + Math.random() * 10,
    }));
    setFloatingElements(elements);

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/");
    });
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (authMode === "signup") {
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.name } },
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account, then log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  if (showAuth) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#0E1417] flex items-center justify-center p-4 relative overflow-hidden text-[#E7EEF1]">
          {floatingElements.map((el) => (
            <div
              key={el.id}
              className="absolute w-1 h-1 bg-[#2DD4BF] rounded-full opacity-20"
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                animation: `float ${el.duration}s ease-in-out ${el.delay}s infinite`,
              }}
            />
          ))}

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) translateX(0px); }
              50% { transform: translateY(-15px) translateX(10px); }
            }
          `}</style>

          <div className="bg-[#151C21] border border-[#28343C] rounded-lg shadow-2xl p-8 w-full max-w-md relative">
            <button
              onClick={() => { setShowAuth(false); setError(null); setMessage(null); }}
              className="absolute top-4 right-4 text-[#8CA2AC] hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex items-center justify-center mb-8">
              <ShieldAlert className="text-[#2DD4BF] mr-3" size={32} />
              <h2 className="text-3xl font-bold font-['Oswald'] tracking-wide">AIR CONTROL</h2>
            </div>

            <button
              onClick={() => { setShowAuth(false); setError(null); setMessage(null); }}
              className="w-full mb-6 bg-[#1B242A] hover:bg-[#28343C] text-[#8CA2AC] font-medium py-2 px-4 rounded-md transition-all flex items-center justify-center gap-2 border border-[#28343C]"
            >
              <ArrowRight size={18} className="rotate-180" />
              Back to Municipal Console
            </button>

            <div className="flex gap-4 mb-6">
              <button
                onClick={() => { setAuthMode("login"); setError(null); setMessage(null); }}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  authMode === "login"
                    ? "bg-[#2DD4BF] text-[#04211D]"
                    : "bg-[#1B242A] text-[#8CA2AC] hover:bg-[#28343C]"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setAuthMode("signup"); setError(null); setMessage(null); }}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  authMode === "signup"
                    ? "bg-[#2DD4BF] text-[#04211D]"
                    : "bg-[#1B242A] text-[#8CA2AC] hover:bg-[#28343C]"
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="space-y-4" onKeyDown={handleKeyDown}>
              {authMode === "signup" && (
                <div>
                  <label className="block text-[#8CA2AC] text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1B242A] border border-[#28343C] rounded-md text-[#E7EEF1] placeholder-[#5A6D76] focus:outline-none focus:border-[#2DD4BF]"
                    placeholder="Official Name"
                  />
                </div>
              )}

              <div>
                <label className="block text-[#8CA2AC] text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#1B242A] border border-[#28343C] rounded-md text-[#E7EEF1] placeholder-[#5A6D76] focus:outline-none focus:border-[#2DD4BF]"
                  placeholder="official@gov.in"
                />
              </div>

              <div>
                <label className="block text-[#8CA2AC] text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#1B242A] border border-[#28343C] rounded-md text-[#E7EEF1] placeholder-[#5A6D76] focus:outline-none focus:border-[#2DD4BF]"
                  placeholder="••••••••"
                />
              </div>

              {authMode === "signup" && (
                <div>
                  <label className="block text-[#8CA2AC] text-sm font-medium mb-2">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1B242A] border border-[#28343C] rounded-md text-[#E7EEF1] placeholder-[#5A6D76] focus:outline-none focus:border-[#2DD4BF]"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm bg-red-950/30 border border-red-900 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
              {message && (
                <p className="text-green-400 text-sm bg-green-950/30 border border-green-900 rounded-md px-3 py-2">
                  {message}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-[#2DD4BF] hover:bg-[#25bda9] disabled:opacity-50 text-[#04211D] font-bold py-3 px-6 rounded-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : authMode === "login" ? (
                  <><LogIn size={20} /> Access Console</>
                ) : (
                  <><UserPlus size={20} /> Register Official</>
                )}
              </button>
            </div>

            <p className="text-center text-[#5A6D76] text-sm mt-6 font-['IBM_Plex_Mono']">
              {authMode === "login" ? (
                <>
                  Need administrator access?{" "}
                  <button onClick={() => setAuthMode("signup")} className="text-[#2DD4BF] hover:underline font-semibold">
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button onClick={() => setAuthMode("login")} className="text-[#2DD4BF] hover:underline font-semibold">
                    Login
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#0E1417] text-[#E7EEF1] flex items-center justify-center relative overflow-hidden">
        {floatingElements.map((el) => (
          <div
            key={el.id}
            className="absolute w-1 h-1 bg-[#2DD4BF] rounded-full opacity-20"
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              animation: `float ${el.duration}s ease-in-out ${el.delay}s infinite`,
            }}
          />
        ))}

        <div className="text-center z-10 px-4">
          <div className="flex items-center justify-center mb-6">
            <ShieldAlert className="text-[#2DD4BF] mr-4" size={56} />
            <h1 className="text-7xl font-bold font-['Oswald'] tracking-wider text-white">
              AIR<span className="text-[#2DD4BF]">CONTROL</span>
            </h1>
          </div>

          <p className="text-xl text-[#8CA2AC] mb-3 font-['IBM_Plex_Mono'] tracking-wide">
            AI Decision Support System for Urban Air Quality Management
          </p>
          <p className="text-base text-[#5A6D76] mb-10 max-w-xl mx-auto font-['Inter']">
            Geospatial Multi-Source Attribution · 72h Hyperlocal Forecasting · Targeted Inspector Enforcement · Multilingual Citizen Advisories
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              className="bg-[#2DD4BF] hover:bg-[#25bda9] text-[#04211D] font-bold py-4 px-8 rounded-md transition-all transform hover:scale-[1.02] flex items-center gap-3 font-['Oswald'] tracking-wider text-lg"
              onClick={() => navigate("/")}
            >
              Launch Municipal Console
              <ArrowRight size={20} />
            </button>

            <button
              onClick={() => setShowAuth(true)}
              className="bg-[#1B242A] hover:bg-[#28343C] text-[#E7EEF1] font-medium py-4 px-8 rounded-md transition-all transform hover:scale-[1.02] border border-[#28343C] flex items-center gap-3 font-['IBM_Plex_Mono']"
            >
              <LogIn size={20} />
              Officer Login
            </button>
          </div>

          <div className="flex flex-wrap gap-3 justify-center mt-12 font-['IBM_Plex_Mono'] text-xs">
            <span className="px-4 py-2 bg-[#151C21] border border-[#28343C] rounded-full text-[#8CA2AC]">Source Attribution Engine</span>
            <span className="px-4 py-2 bg-[#151C21] border border-[#28343C] rounded-full text-[#8CA2AC]">72h Predictive Modeling</span>
            <span className="px-4 py-2 bg-[#151C21] border border-[#28343C] rounded-full text-[#8CA2AC]">Targeted Enforcement Dispatch</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0E1417] to-transparent"></div>
      </div>
    </>
  );
};

export default OrbitAirLanding;
