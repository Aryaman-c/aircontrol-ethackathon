from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
import os
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

WAQI_TOKEN = os.environ.get("WAQI_TOKEN", "")
DELHI_BBOX = "28.40,76.85,28.90,77.40"  # lat1,lon1,lat2,lon2

ELASTIC_URL = os.environ.get("ELASTIC_URL", "").rstrip("/")
ELASTIC_API_KEY = os.environ.get("ELASTIC_API_KEY", "")


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


def short_name(full_name: str) -> str:
    # WAQI names look like "ITI Shahdra, Jhilmil Industrial Area, Delhi, Delhi, India"
    parts = [p.strip() for p in full_name.split(",")]
    return parts[0] if parts else full_name


async def index_to_elastic(client: httpx.AsyncClient, doc: dict):
    if not ELASTIC_URL or not ELASTIC_API_KEY:
        return
    try:
        payload = dict(doc)
        payload["timestamp"] = int(time.time() * 1000)
        await client.post(
            f"{ELASTIC_URL}/delhi-aqi/_doc",
            json=payload,
            headers={"Authorization": f"ApiKey {ELASTIC_API_KEY}"},
            timeout=5,
        )
    except Exception:
        pass  # best-effort, never block the response


@app.get("/api/localities")
async def get_localities():
    if not WAQI_TOKEN:
        return {"localities": [], "elastic_enabled": False, "error": "WAQI_TOKEN not configured"}

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            "https://api.waqi.info/map/bounds/",
            params={"latlng": DELHI_BBOX, "token": WAQI_TOKEN},
        )
        data = r.json()
        if data.get("status") != "ok":
            return {"localities": [], "elastic_enabled": False, "error": "WAQI request failed"}

        results = []
        for station in data["data"]:
            aqi_raw = station.get("aqi")
            try:
                aqi = float(aqi_raw)
            except (TypeError, ValueError):
                aqi = None
            results.append({
                "uid": station["uid"],
                "locality": short_name(station["station"]["name"]),
                "full_name": station["station"]["name"],
                "lat": station["lat"],
                "lon": station["lon"],
                "aqi": aqi,
                "label": aqi_label(aqi),
            })

        await asyncio.gather(*[index_to_elastic(client, r) for r in results], return_exceptions=True)

    results.sort(key=lambda r: (r["aqi"] is None, -(r["aqi"] or 0)))
    return {"localities": results, "elastic_enabled": bool(ELASTIC_URL and ELASTIC_API_KEY)}
