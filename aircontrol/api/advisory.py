from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
import httpx
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

class AdvisoryRequest(BaseModel):
    uid: Optional[int] = 101
    profile: Optional[str] = "healthy"
    prompt: Optional[str] = None
    context_query: Optional[str] = None
    context: Optional[Any] = None

class EnforcementRequest(BaseModel):
    ward_name: str
    city_name: str
    current_aqi: int


@app.post("/api/advisory")
async def get_advisory(req: AdvisoryRequest):
    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Custom question asking the AI reasoning layer
        if req.context_query:
            prompt = (
                f"You are the AI Environmental Decision Support Assistant for municipal commissioners in India.\n"
                f"DATA CONTEXT:\n{req.context}\n\n"
                f"COMMISSIONER QUESTION: {req.context_query}\n\n"
                f"Answer the commissioner's question directly, accurately, and concisely in under 4 sentences. "
                f"Reference specific numbers or facilities from the context where appropriate."
            )
            try:
                llm_response = await call_llm(client, prompt)
                return {"advisory": llm_response.strip(), "text": llm_response.strip()}
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"LLM Reasoning execution error: {e}")

        # 2. Multilingual Citizen Health Advisory Prompt
        if req.prompt:
            try:
                llm_response = await call_llm(client, req.prompt)
                return {"advisory": llm_response.strip(), "text": llm_response.strip()}
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"LLM Multilingual advisory execution error: {e}")

        # 3. Default station advisory prompt
        prompt = (
            f"You are an AI Environmental Decision Support Assistant for municipal commissioners in India.\n"
            f"Generate a concise 3-sentence executive summary recommending targeted enforcement and public health measures for AQI level 260."
        )
        try:
            llm_response = await call_llm(client, prompt)
            return {"advisory": llm_response.strip(), "text": llm_response.strip()}
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM Executive summary execution error: {e}")


@app.post("/api/enforcement")
async def get_enforcement_targets(req: EnforcementRequest):
    async with httpx.AsyncClient(timeout=30) as client:
        prompt = (
            f"You are an AI environmental enforcement engine for {req.city_name}. Current AQI in {req.ward_name} is {req.current_aqi}.\n"
            f"Generate a JSON object with a single key 'targets' containing an array of 4 prioritized enforcement targets with keys: siteName, category, prob (number 80-99), priority ('CRITICAL' or 'HIGH' or 'MEDIUM'), evidence, permitStatus.\n"
            f"Return ONLY valid JSON, no markdown formatting."
        )
        try:
            res_str = await call_llm(client, prompt, json_mode=True)
            data = json.loads(res_str)
            if isinstance(data, list):
                return {"targets": data}
            return data
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM Enforcement generation error: {e}")


@app.get("/api/benchmark")
async def get_benchmark_matrix():
    async with httpx.AsyncClient(timeout=30) as client:
        prompt = (
            f"You are an AI Environmental Policy Analyst.\n"
            f"Generate a JSON object with two keys:\n"
            f"1. 'cities': Object mapping 'delhi', 'mumbai', 'bengaluru', 'chennai' to {{'name': str, 'score': str, 'stations': int}}\n"
            f"2. 'interventions': Array of 4 objects with keys: 'policy', 'delhi', 'mumbai', 'bengaluru', 'avg' showing percentage AQI reduction.\n"
            f"Return ONLY valid JSON, no markdown formatting."
        )
        try:
            res_str = await call_llm(client, prompt, json_mode=True)
            data = json.loads(res_str)
            return data
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM Benchmark generation error: {e}")
