from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

WAQI_TOKEN = os.environ.get("WAQI_TOKEN", "")
ELASTIC_URL = os.environ.get("ELASTIC_URL", "").rstrip("/")
ELASTIC_API_KEY = os.environ.get("ELASTIC_API_KEY", "")


async def query_elastic_history(client: httpx.AsyncClient, uid: int, limit: int = 200):
    query = {
        "size": limit,
        "sort": [{"timestamp": "desc"}],
        "query": {"term": {"uid": uid}},
    }
    r = await client.post(
        f"{ELASTIC_URL}/delhi-aqi/_search",
        json=query,
        headers={"Authorization": f"ApiKey {ELASTIC_API_KEY}"},
        timeout=8,
    )
    r.raise_for_status()
    hits = r.json().get("hits", {}).get("hits", [])
    points = [h["_source"] for h in hits]
    points.reverse()  # oldest first for charting
    return points


async def fallback_waqi_forecast(client: httpx.AsyncClient, uid: int):
    r = await client.get(f"https://api.waqi.info/feed/@{uid}/", params={"token": WAQI_TOKEN})
    data = r.json()
    if data.get("status") != "ok":
        return []
    daily = data["data"].get("forecast", {}).get("daily", {})
    pm25 = daily.get("pm25", [])
    pm10 = daily.get("pm10", [])
    points = []
    for i, day in enumerate(pm25):
        points.append({
            "timestamp": day["day"],
            "pm2_5": day["avg"],
            "pm10": pm10[i]["avg"] if i < len(pm10) else None,
        })
    return points


@app.get("/api/history")
async def get_history(uid: int = Query(...)):
    async with httpx.AsyncClient(timeout=10) as client:
        if ELASTIC_URL and ELASTIC_API_KEY:
            try:
                points = await query_elastic_history(client, uid)
                if points:
                    return {"uid": uid, "source": "elastic", "points": points}
            except Exception:
                pass  # fall through to WAQI forecast

        if not WAQI_TOKEN:
            raise HTTPException(status_code=503, detail="No history source available")
        points = await fallback_waqi_forecast(client, uid)
        return {"uid": uid, "source": "waqi-forecast", "points": points}
