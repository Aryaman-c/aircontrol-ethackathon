from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import math
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
                "hourly": "pm2_5,nitrogen_dioxide,ozone,us_aqi",
                "past_days": 7,
                "forecast_days": 1,
                "timezone": "auto",
            },
        )
        return r.json()


def aqi_label(aqi: float) -> str:
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Moderate"
    if aqi <= 150:  return "Unhealthy for Sensitive"
    if aqi <= 200:  return "Unhealthy"
    if aqi <= 300:  return "Very Unhealthy"
    return "Hazardous"


def aqi_color(aqi: float) -> str:
    if aqi <= 50:   return "#22c55e"
    if aqi <= 100:  return "#f59e0b"
    if aqi <= 150:  return "#f97316"
    if aqi <= 200:  return "#ef4444"
    return "#a855f7"


def mean(vals):
    return sum(vals) / len(vals) if vals else 0.0


def std(vals):
    if len(vals) < 2:
        return 0.0
    m = mean(vals)
    return math.sqrt(sum((v - m) ** 2 for v in vals) / len(vals))


def solve_linear_system(a, b):
    """Gaussian elimination with partial pivoting. a: n x n, b: n. Returns x: n."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[pivot] = m[pivot], m[col]
        if abs(m[col][col]) < 1e-12:
            continue
        for row in range(col + 1, n):
            factor = m[row][col] / m[col][col]
            for k in range(col, n + 1):
                m[row][k] -= factor * m[col][k]
    x = [0.0] * n
    for row in range(n - 1, -1, -1):
        if abs(m[row][row]) < 1e-12:
            continue
        s = m[row][n] - sum(m[row][k] * x[k] for k in range(row + 1, n))
        x[row] = s / m[row][row]
    return x


def fit_linear_regression(X, y):
    """X: list of feature rows (no intercept column), y: list of targets.
    Returns beta (including intercept as beta[0])."""
    n_features = len(X[0])
    n = len(X)
    Xd = [[1.0] + row for row in X]  # design matrix with intercept
    p = n_features + 1

    # normal equations: (X^T X) beta = X^T y
    xtx = [[sum(Xd[i][r] * Xd[i][c] for i in range(n)) for c in range(p)] for r in range(p)]
    xty = [sum(Xd[i][r] * y[i] for i in range(n)) for r in range(p)]
    beta = solve_linear_system(xtx, xty)
    return beta


def predict(beta, features):
    return beta[0] + sum(b * f for b, f in zip(beta[1:], features))


@app.get("/api/ml")
async def predict_aqi(name: str = Query(...)):
    geo = await geocode(name)
    if not geo:
        raise HTTPException(status_code=404, detail=f"City '{name}' not found")

    raw = await fetch_air_quality(geo["lat"], geo["lon"])
    hourly = raw.get("hourly", {})
    times  = hourly.get("time", [])
    aqi_h  = hourly.get("us_aqi", [])
    pm25_h = hourly.get("pm2_5", [])
    no2_h  = hourly.get("nitrogen_dioxide", [])
    o3_h   = hourly.get("ozone", [])

    now = datetime.now(timezone.utc)
    X_train, y_train = [], []
    X_future, future_meta = [], []

    for i, t in enumerate(times):
        try:
            dt = datetime.fromisoformat(t.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue

        pm25 = pm25_h[i] if i < len(pm25_h) and pm25_h[i] is not None else 0.0
        no2  = no2_h[i]  if i < len(no2_h)  and no2_h[i]  is not None else 0.0
        o3   = o3_h[i]   if i < len(o3_h)   and o3_h[i]   is not None else 0.0
        aqi  = aqi_h[i]  if i < len(aqi_h)  else None

        hour_sin = math.sin(2 * math.pi * dt.hour / 24)
        hour_cos = math.cos(2 * math.pi * dt.hour / 24)
        features = [hour_sin, hour_cos, float(dt.weekday()), pm25, no2, o3]

        if dt < now:
            if aqi is not None:
                X_train.append(features)
                y_train.append(float(aqi))
        elif len(X_future) < 6:
            X_future.append(features)
            future_meta.append({
                "hour": dt.strftime("%H:%M"),
                "pm2_5": round(pm25, 1),
                "no2": round(no2, 1),
                "o3": round(o3, 1),
            })

    if len(X_train) < 24:
        raise HTTPException(status_code=422, detail="Not enough historical data (need 24h+)")

    beta = fit_linear_regression(X_train, y_train)

    fitted = [predict(beta, x) for x in X_train]
    residuals = [y_train[i] - fitted[i] for i in range(len(y_train))]
    resid_std = std(residuals)

    y_mean = mean(y_train)
    ss_res = sum(r ** 2 for r in residuals)
    ss_tot = sum((y - y_mean) ** 2 for y in y_train)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0

    predictions = []
    for i, feats in enumerate(X_future):
        mean_pred = predict(beta, feats)
        predicted = max(0.0, mean_pred)
        predictions.append({
            **future_meta[i],
            "predicted_aqi": round(predicted),
            "lower": round(max(0.0, mean_pred - 1.28 * resid_std)),
            "upper": round(mean_pred + 1.28 * resid_std),
            "label": aqi_label(predicted),
            "color": aqi_color(predicted),
        })

    feature_names = ["hour_sin", "hour_cos", "day_of_week", "pm2_5", "no2", "o3"]
    # standardized coefficient magnitude as an importance proxy
    raw_importances = {}
    for idx, fname in enumerate(feature_names):
        col = [row[idx] for row in X_train]
        raw_importances[fname] = abs(beta[idx + 1]) * std(col)
    total = sum(raw_importances.values()) or 1.0
    importances = [
        {"feature": k, "importance": round(v / total, 3)}
        for k, v in sorted(raw_importances.items(), key=lambda x: -x[1])
    ]

    return {
        "city": geo["display_name"],
        "model": "Multiple Linear Regression",
        "training_samples": len(X_train),
        "r2_score": round(r2, 3),
        "feature_importances": importances,
        "predictions": predictions,
    }
