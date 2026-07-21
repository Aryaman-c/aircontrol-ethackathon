from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import asyncio
import os
import json

try:
    from _llm import call_llm
except ImportError:
    from api._llm import call_llm

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

WAQI_TOKEN = os.environ.get("WAQI_TOKEN", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
FIREWORKS_API_KEY = os.environ.get("FIREWORKS_API_KEY", "")
DELHI_BBOX = "28.40,76.85,28.90,77.40"

ACTIVITIES = {
    "school_trip": "a school trip with a group of children — an especially sensitive group, use cautious thresholds",
    "sports": "an outdoor sports practice or training session involving sustained heavy breathing",
    "picnic": "a family picnic or outdoor gathering with a general mix of ages, including possibly elderly or young children",
    "walk": "a casual outdoor walk or jog for a healthy adult",
    "errand": "a general outdoor errand or commute for a healthy adult",
}


def short_name(full_name: str) -> str:
    return full_name.split(",")[0].strip()


class TripRequest(BaseModel):
    activity: str = "walk"


async def fetch_board(client: httpx.AsyncClient):
    r = await client.get("https://api.waqi.info/map/bounds/", params={"latlng": DELHI_BBOX, "token": WAQI_TOKEN})
    data = r.json()
    if data.get("status") != "ok":
        raise HTTPException(status_code=502, detail="Failed to fetch station board")
    stations = []
    for s in data["data"]:
        try:
            aqi = float(s.get("aqi"))
        except (TypeError, ValueError):
            continue
        stations.append({"uid": s["uid"], "name": short_name(s["station"]["name"]), "aqi": aqi})
    stations.sort(key=lambda s: s["aqi"])
    return stations


async def fetch_forecast(client: httpx.AsyncClient, uid: int):
    r = await client.get(f"https://api.waqi.info/feed/@{uid}/", params={"token": WAQI_TOKEN})
    data = r.json()
    if data.get("status") != "ok":
        return []
    daily = data["data"].get("forecast", {}).get("daily", {})
    pm25 = {d["day"]: d["avg"] for d in daily.get("pm25", [])}
    pm10 = {d["day"]: d["avg"] for d in daily.get("pm10", [])}
    days = sorted(set(pm25) | set(pm10))
    return [{"date": d, "pm2_5_avg": pm25.get(d), "pm10_avg": pm10.get(d)} for d in days]


@app.post("/api/trip")
async def plan_trip(req: TripRequest):
    if not WAQI_TOKEN:
        raise HTTPException(status_code=503, detail="Station backend not configured")
    if not GEMINI_API_KEY and not FIREWORKS_API_KEY:
        raise HTTPException(status_code=503, detail="Advisory backend not configured")

    activity_desc = ACTIVITIES.get(req.activity, ACTIVITIES["walk"])

    async with httpx.AsyncClient(timeout=30) as client:
        board = await fetch_board(client)
        candidates = board[:6]  # best current AQI, real candidates only
        forecasts = await asyncio.gather(*[fetch_forecast(client, c["uid"]) for c in candidates])

        data_block = ""
        for c, fc in zip(candidates, forecasts):
            data_block += f"\n{c['name']} — current AQI {round(c['aqi'])}\n"
            for day in fc:
                data_block += f"  {day['date']}: forecast PM2.5 avg {day['pm2_5_avg']}, PM10 avg {day['pm10_avg']}\n"

        prompt = (
            f"You are an air-quality planning assistant for Delhi, India. "
            f"A user wants to plan {activity_desc}.\n\n"
            f"Here is live and forecast data for the {len(candidates)} Delhi localities with the "
            f"best current air quality right now:\n{data_block}\n"
            f"Pick exactly ONE locality from this list, and ONE specific day and time-of-day window "
            f"(morning, midday, afternoon, or evening) that gives the best air quality for this activity. "
            f"Base the day choice on the forecast trend shown above. Base the time-of-day choice on typical "
            f"Delhi diurnal pollution patterns (morning boundary-layer inversion traps pollutants near the "
            f"ground especially in cooler months; midday sun usually mixes and disperses it; evenings can "
            f"trap it again). Explain your reasoning in 2-3 sentences referencing the actual numbers above. "
            f"Add one short safety note specific to this activity and group.\n\n"
            f"Respond ONLY as JSON with exactly these keys: "
            f'{{"locality": string (must exactly match one name from the list above), '
            f'"day": string, "time_of_day": string, "reasoning": string, "safety_note": string}}'
        )

        try:
            text = await call_llm(client, prompt, json_mode=True)
            rec = json.loads(text)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Trip planning failed: {e}")

        # resolve the recommended locality back to a uid the frontend can jump to
        matched = next((c for c in candidates if c["name"].lower() == str(rec.get("locality", "")).lower()), None)
        if not matched:
            matched = candidates[0]
            rec["locality"] = matched["name"]

        return {
            "recommendation": rec,
            "uid": matched["uid"],
            "candidates_considered": [{"name": c["name"], "aqi": round(c["aqi"])} for c in candidates],
        }
