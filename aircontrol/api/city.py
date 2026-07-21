from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
from datetime import datetime, timezone

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def geocode(city: str):
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": city, "format": "json", "limit": 1},
            headers={"User-Agent": "OrbitAir/1.0 (portfolio project)"},
        )
        data = r.json()
        if not data:
            return None
        return {
            "lat": float(data[0]["lat"]),
            "lon": float(data[0]["lon"]),
            "display_name": data[0]["display_name"].split(",")[0],
        }


async def fetch_air_quality(lat: float, lon: float):
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            "https://air-quality-api.open-meteo.com/v1/air-quality",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "pm10,pm2_5,nitrogen_dioxide,ozone,us_aqi",
                "hourly": "pm2_5,nitrogen_dioxide,ozone,us_aqi",
                "past_days": 7,
                "forecast_days": 2,
                "timezone": "auto",
            },
        )
        return r.json()


async def fetch_weather(lat: float, lon: float):
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index",
                "timezone": "auto",
            },
        )
        return r.json()


def aqi_label(aqi):
    if aqi is None:
        return "Unknown"
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


@app.get("/api/city")
async def get_city_data(name: str = Query(...)):
    geo = await geocode(name)
    if not geo:
        raise HTTPException(status_code=404, detail=f"City '{name}' not found")

    aq_raw, wx_raw = await asyncio.gather(
        fetch_air_quality(geo["lat"], geo["lon"]),
        fetch_weather(geo["lat"], geo["lon"]),
    )

    cur_aq = aq_raw.get("current", {})
    cur_wx = wx_raw.get("current", {})

    hourly = aq_raw.get("hourly", {})
    times = hourly.get("time", [])
    aqi_h = hourly.get("us_aqi", [])
    pm25_h = hourly.get("pm2_5", [])
    no2_h = hourly.get("nitrogen_dioxide", [])
    o3_h = hourly.get("ozone", [])

    now = datetime.now(timezone.utc)
    forecast = []
    historical = []

    for i, t in enumerate(times):
        try:
            dt = datetime.fromisoformat(t.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            entry = {
                "time": t,
                "hour": dt.strftime("%H:%M"),
                "aqi": aqi_h[i] if i < len(aqi_h) else None,
                "pm2_5": pm25_h[i] if i < len(pm25_h) else None,
                "no2": no2_h[i] if i < len(no2_h) else None,
                "o3": o3_h[i] if i < len(o3_h) else None,
            }
            if dt >= now and len(forecast) < 48:
                forecast.append(entry)
            elif dt < now and len(historical) < 168:
                historical.append(entry)
        except Exception:
            pass

    return {
        "city": geo["display_name"],
        "lat": geo["lat"],
        "lon": geo["lon"],
        "current": {
            "aqi": cur_aq.get("us_aqi"),
            "label": aqi_label(cur_aq.get("us_aqi")),
            "pm2_5": cur_aq.get("pm2_5"),
            "pm10": cur_aq.get("pm10"),
            "no2": cur_aq.get("nitrogen_dioxide"),
            "o3": cur_aq.get("ozone"),
            "temperature": cur_wx.get("temperature_2m"),
            "humidity": cur_wx.get("relative_humidity_2m"),
            "wind_speed": cur_wx.get("wind_speed_10m"),
            "uv_index": cur_wx.get("uv_index"),
        },
        "forecast": forecast,
        "historical": historical[-48:],
    }
