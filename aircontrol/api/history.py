"""Locality History endpoint powered by Open-Meteo Air Quality API."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIONS_MAP = {
    101: {"name": "Anand Vihar, Delhi", "lat": 28.6469, "lon": 77.3160},
    102: {"name": "RK Puram, Delhi", "lat": 28.5633, "lon": 77.1863},
    103: {"name": "Punjabi Bagh, Delhi", "lat": 28.6683, "lon": 77.1267},
    104: {"name": "Okhla Phase 2, Delhi", "lat": 28.5308, "lon": 77.2712},
}

@app.get("/api/history")
async def get_history(uid: int = 101):
    st = STATIONS_MAP.get(uid, STATIONS_MAP[101])
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={st['lat']}&longitude={st['lon']}&hourly=us_aqi,pm2_5&past_days=7"
            r = await client.get(url)
            if r.status_code == 200:
                data = r.json()
                times = data.get("hourly", {}).get("time", [])
                aqis = data.get("hourly", {}).get("us_aqi", [])
                pm25s = data.get("hourly", {}).get("pm2_5", [])

                points = []
                for t, aqi, pm in zip(times[-24:], aqis[-24:], pm25s[-24:]):
                    if aqi is not None:
                        points.append({"time": t, "aqi": round(aqi), "pm25": pm})
                return {"uid": uid, "name": st["name"], "source": "open-meteo-history", "points": points}
        except Exception:
            pass

    return {"uid": uid, "name": st["name"], "source": "open-meteo-history", "points": []}
