"""Shared LLM caller for advisory.py and other endpoints.
Calls Google Gemini API (gemini-flash-latest) via GEMINI_API_KEY.
Falls back to OpenRouter or Fireworks if configured.
"""
import httpx
import os

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "your_api_key")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")

FIREWORKS_API_KEY = os.environ.get("FIREWORKS_API_KEY", "")
FIREWORKS_MODEL = "accounts/fireworks/models/gpt-oss-120b"


async def call_gemini(client: httpx.AsyncClient, prompt: str, json_mode: bool = False) -> str:
    body = {"contents": [{"parts": [{"text": prompt}]}]}
    if json_mode:
        body["generationConfig"] = {"responseMimeType": "application/json"}
    r = await client.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
        params={"key": GEMINI_API_KEY},
        json=body,
    )
    r.raise_for_status()
    data = r.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


async def call_openrouter(client: httpx.AsyncClient, prompt: str, json_mode: bool = False) -> str:
    body = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are an AI Environmental Decision Support Assistant for municipal commissioners. Provide concise, direct, evidence-based answers."
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1000
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    r = await client.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": "https://aircontrol.gov.in",
            "X-Title": "AIR CONTROL"
        },
        json=body,
    )
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"]


async def call_fireworks(client: httpx.AsyncClient, prompt: str, json_mode: bool = False) -> str:
    body = {
        "model": FIREWORKS_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a concise assistant. Output ONLY the final answer directly, with no preamble."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 1200,
        "temperature": 0.3,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    r = await client.post(
        "https://api.fireworks.ai/inference/v1/chat/completions",
        headers={"Authorization": f"Bearer {FIREWORKS_API_KEY}"},
        json=body,
    )
    r.raise_for_status()
    data = r.json()
    raw = data["choices"][0]["message"]["content"]
    return _strip_reasoning_leakage(raw)


def _strip_reasoning_leakage(text: str) -> str:
    transitions = [
        "Final answer:",
        "Final Answer:",
        "Answer:",
        "Response:",
        "Output:",
    ]
    best_idx = -1
    best_marker = ""
    for marker in transitions:
        idx = text.rfind(marker)
        if idx > best_idx:
            best_idx = idx
            best_marker = marker
    if best_idx != -1:
        return text[best_idx + len(best_marker) :].strip()
    return text.strip()


async def call_llm(client: httpx.AsyncClient, prompt: str, json_mode: bool = False) -> str:
    """Tries Gemini API first, then OpenRouter, then Fireworks."""
    if GEMINI_API_KEY:
        try:
            return await call_gemini(client, prompt, json_mode)
        except Exception as e:
            print(f"Gemini API error: {e}, trying fallback...")
            pass
    if OPENROUTER_API_KEY:
        try:
            return await call_openrouter(client, prompt, json_mode)
        except Exception as e:
            print(f"OpenRouter API error: {e}, trying fallback...")
            pass
    if FIREWORKS_API_KEY:
        return await call_fireworks(client, prompt, json_mode)

    raise RuntimeError("No working LLM backend configured.")
