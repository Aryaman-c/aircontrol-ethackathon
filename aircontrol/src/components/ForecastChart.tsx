import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, TrendingUp, Wind, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useState } from "react";

import type { AQIHourly } from "@/hooks/useAirQuality";

interface Props {
  forecast: AQIHourly[];
  loading: boolean;
}

const ForecastChart = ({ forecast, loading }: Props) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const forecastData = forecast.length > 0
    ? forecast.map(f => ({
        time: f.hour,
        aqi: f.aqi ?? 0,
        pm25: f.pm2_5 ?? 0,
        o3: f.o3 ?? 0,
        no2: f.no2 ?? 0,
      }))
    : [];

  const aqiCategories = forecastData.reduce((acc, data) => {
    if (data.aqi <= 50) acc.good++;
    else if (data.aqi <= 80) acc.moderate++;
    else if (data.aqi <= 100) acc.moderateHigh++;
    else if (data.aqi <= 150) acc.unhealthySensitive++;
    else if (data.aqi <= 200) acc.unhealthy++;
    else acc.veryUnhealthy++;
    return acc;
  }, { good: 0, moderate: 0, moderateHigh: 0, unhealthySensitive: 0, unhealthy: 0, veryUnhealthy: 0 });

  const pieData = [
    { 
      name: "Good", 
      value: aqiCategories.good, 
      color: "#10b981",
      range: "0-50",
      description: "Air quality is satisfactory, and air pollution poses little or no risk.",
      icon: CheckCircle,
      healthImpact: "Suitable for all outdoor activities"
    },
    { 
      name: "Moderate", 
      value: aqiCategories.moderate, 
      color: "#84cc16",
      range: "51-80",
      description: "Air quality is acceptable. However, there may be a risk for some people.",
      icon: Info,
      healthImpact: "Sensitive individuals should consider limiting prolonged outdoor exertion"
    },
    { 
      name: "Moderate High", 
      value: aqiCategories.moderateHigh, 
      color: "#f59e0b",
      range: "81-100",
      description: "Members of sensitive groups may experience health effects.",
      icon: Wind,
      healthImpact: "Active children and adults with respiratory disease should limit prolonged outdoor exertion"
    },
    { 
      name: "Unhealthy for Sensitive", 
      value: aqiCategories.unhealthySensitive, 
      color: "#f97316",
      range: "101-150",
      description: "Everyone may begin to experience health effects; sensitive groups more seriously affected.",
      icon: AlertTriangle,
      healthImpact: "Sensitive groups should avoid outdoor activities"
    },
    { 
      name: "Unhealthy", 
      value: aqiCategories.unhealthy, 
      color: "#ef4444",
      range: "151-200",
      description: "Health alert: everyone may experience more serious health effects.",
      icon: AlertTriangle,
      healthImpact: "Everyone should avoid prolonged outdoor exertion"
    },
    { 
      name: "Very Unhealthy", 
      value: aqiCategories.veryUnhealthy, 
      color: "#991b1b",
      range: "200+",
      description: "Health warnings of emergency conditions. The entire population is affected.",
      icon: AlertTriangle,
      healthImpact: "Everyone should avoid all outdoor activities"
    }
  ].filter(item => item.value > 0);

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = forecastData.length > 0 ? ((data.value / forecastData.length) * 100).toFixed(1) : "0";
      const Icon = data.icon;
      return (
        <div className="bg-white/98 backdrop-blur-sm border-2 rounded-xl p-4 shadow-2xl max-w-xs" style={{ borderColor: data.color }}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className="h-5 w-5" style={{ color: data.color }} />
            <p className="font-bold text-gray-800">{data.name}</p>
            <Badge style={{ backgroundColor: data.color, color: 'white' }}>{data.range}</Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-gray-50 rounded">
              <p className="font-semibold text-gray-700">Duration:</p>
              <p className="text-gray-600">{data.value} hours ({percentage}%)</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="font-semibold text-gray-700">Description:</p>
              <p className="text-gray-600 text-xs">{data.description}</p>
            </div>
            <div className="p-2 rounded" style={{ backgroundColor: `${data.color}15` }}>
              <p className="font-semibold text-gray-700">Health Impact:</p>
              <p className="text-gray-600 text-xs">{data.healthImpact}</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const currentTime = new Date();
  const hasData = forecastData.length > 0;
  const peakAQI = hasData ? Math.max(...forecastData.map(d => d.aqi)) : null;
  const peakTime = hasData ? forecastData.find(d => d.aqi === peakAQI)?.time : null;
  const minAQI = hasData ? Math.min(...forecastData.map(d => d.aqi)) : null;
  const avgAQI = hasData ? Math.round(forecastData.reduce((sum, d) => sum + d.aqi, 0) / forecastData.length) : null;

  return (
    <section id="forecast" className="py-12 bg-gradient-to-b from-blue-50 via-purple-50 to-white">
      <style>{`
        .stat-card {
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.15);
        }
      `}</style>
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            48-Hour Air Quality Forecast
          </h2>
          <p className="text-gray-600 text-lg">Comprehensive AQI distribution and health impact analysis</p>
        </div>

        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="stat-card border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">Peak AQI</p>
                    <p className="text-2xl font-bold text-orange-600">{peakAQI ?? "--"}</p>
                    <p className="text-xs text-gray-500 mt-1">{peakTime ? `at ${peakTime}` : "search a city"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">Best AQI</p>
                    <p className="text-2xl font-bold text-green-600">{minAQI ?? "--"}</p>
                    <p className="text-xs text-gray-500 mt-1">Morning hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Wind className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">Average AQI</p>
                    <p className="text-2xl font-bold text-blue-600">{avgAQI ?? "--"}</p>
                    <p className="text-xs text-gray-500 mt-1">48-hr period</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">Forecast Range</p>
                    <p className="text-2xl font-bold text-purple-600">48h</p>
                    <p className="text-xs text-gray-500 mt-1">Hourly data</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
              <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <span className="text-2xl font-bold text-gray-800">AQI Distribution & Health Impact Analysis</span>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Updated: {currentTime.toLocaleTimeString()}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[550px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => `${name}: ${value}h`}
                      outerRadius={180}
                      innerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      animationDuration={1200}
                      animationBegin={0}
                      activeIndex={activeIndex !== null ? activeIndex : undefined}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={3} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 pt-6 border-t-2">
                <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Detailed Air Quality Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pieData.map((item, index) => {
                    const Icon = item.icon;
                    const percentage = forecastData.length > 0 ? ((item.value / forecastData.length) * 100).toFixed(0) : "0";
                    return (
                      <div 
                        key={index} 
                        className="p-4 rounded-xl border-2 transition-all hover:shadow-lg cursor-pointer" 
                        style={{ 
                          borderColor: item.color, 
                          backgroundColor: `${item.color}08` 
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5" style={{ color: item.color }} />
                            <span className="font-bold text-gray-800">{item.name}</span>
                          </div>
                          <Badge style={{ backgroundColor: item.color, color: 'white' }} className="text-xs">
                            {item.range}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-end gap-2">
                            <p className="text-3xl font-bold" style={{ color: item.color }}>{item.value}</p>
                            <p className="text-sm text-gray-600 mb-1">hours ({percentage}%)</p>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                          <div className="pt-2 mt-2 border-t" style={{ borderColor: item.color }}>
                            <p className="text-xs font-semibold text-gray-700">Health Recommendation:</p>
                            <p className="text-xs text-gray-600 mt-1">{item.healthImpact}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ForecastChart;