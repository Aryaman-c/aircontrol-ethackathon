"""Trip planner endpoint powered by Open-Meteo Air Quality API."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CANDIDATES = [
    {"name": "Anand Vihar", "lat": 28.6469, "lon": 77.3160, "uid": 101},
    {"name": "RK Puram", "lat": 28.5633, "lon": 77.1863, "uid": 102},
    {"name": "Punjabi Bagh", "lat": 28.6683, "lon": 77.1267, "uid": 103},
    {"name": "Okhla Phase 2", "lat": 28.5308, "lon": 77.2712, "uid": 104},
]

class TripRequest(BaseModel):
    origin: str = "Anand Vihar"

@app.post("/api/trip")
async def plan_trip(req: TripRequest):
    async with httpx.AsyncClient(timeout=15) as client:
        evaluated = []
        for cand in CANDIDATES:
            try:
                url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={cand['lat']}&longitude={cand['lon']}&hourly=us_aqi&forecast_days=1"
                r = await client.get(url)
                if r.status_code == 200:
                    aqis = r.json().get("hourly", {}).get("us_aqi", [])
                    valid_aqis = [v for v in aqis if v is not None]
                    aqi = valid_aqis[-1] if valid_aqis else 150
                else:
                    aqi = 150
            except Exception:
                aqi = 150

            evaluated.append({
                "uid": cand["uid"],
                "locality": cand["name"],
                "aqi": round(aqi),
            })

        best = min(evaluated, key=lambda x: x["aqi"])
        return {
            "recommendation": best,
            "candidates": evaluated,
            "source": "Open-Meteo Air Quality API"
        }
