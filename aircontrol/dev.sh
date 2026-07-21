#!/bin/bash
set -e
cd "$(dirname "$0")"
source ~/.config/keys.env 2>/dev/null || true
export GEMINI_API_KEY

pkill -f "uvicorn api\." 2>/dev/null || true
sleep 1

.venv/bin/uvicorn api.city:app       --port 8001 > /tmp/vayu-city.log 2>&1 &
.venv/bin/uvicorn api.ml:app         --port 8002 > /tmp/vayu-ml.log 2>&1 &
.venv/bin/uvicorn api.localities:app --port 8003 > /tmp/vayu-localities.log 2>&1 &
.venv/bin/uvicorn api.history:app    --port 8004 > /tmp/vayu-history.log 2>&1 &
.venv/bin/uvicorn api.advisory:app   --port 8005 > /tmp/vayu-advisory.log 2>&1 &
.venv/bin/uvicorn api.trip:app       --port 8006 > /tmp/vayu-trip.log 2>&1 &

sleep 2
npm run dev
