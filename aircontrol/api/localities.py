"""Localities endpoint powered by Open-Meteo Air Quality API."""
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

STATIONS = [
    {"name": "Anand Vihar, Delhi", "lat": 28.6469, "lon": 77.3160},
    {"name": "RK Puram, Delhi", "lat": 28.5633, "lon": 77.1863},
    {"name": "Punjabi Bagh, Delhi", "lat": 28.6683, "lon": 77.1267},
    {"name": "Okhla Phase 2, Delhi", "lat": 28.5308, "lon": 77.2712},
    {"name": "Chembur, Mumbai", "lat": 19.0622, "lon": 72.8974},
    {"name": "Kurla, Mumbai", "lat": 19.0657, "lon": 72.8797},
    {"name": "Peenya, Bengaluru", "lat": 13.0285, "lon": 77.5197},
    {"name": "Silk Board, Bengaluru", "lat": 12.9172, "lon": 77.6228},
    {"name": "Manali, Chennai", "lat": 13.1667, "lon": 80.2667},
    {"name": "Velachery, Chennai", "lat": 12.9815, "lon": 80.2180},
]


@app.get("/api/localities")
async def get_localities():
    localities = []
    async with httpx.AsyncClient(timeout=15) as client:
        for idx, st in enumerate(STATIONS):
            try:
                url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={st['lat']}&longitude={st['lon']}&hourly=us_aqi,pm2_5,nitrogen_dioxide&forecast_days=1"
                r = await client.get(url)
                if r.status_code == 200:
                    data = r.json()
                    aqi_vals = data.get("hourly", {}).get("us_aqi", [])
                    valid_aqis = [v for v in aqi_vals if v is not None]
                    current_aqi = valid_aqis[-1] if valid_aqis else 180
                else:
                    current_aqi = 180
            except Exception:
                current_aqi = 180

            localities.append({
                "uid": idx + 101,
                "name": st["name"],
                "aqi": round(current_aqi),
                "lat": st["lat"],
                "lon": st["lon"],
            })

    localities.sort(key=lambda x: x["aqi"], reverse=True)
    return {"localities": localities, "source": "Open-Meteo Air Quality API"}
