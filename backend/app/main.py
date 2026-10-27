import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .llm import generate_json
from .schemas import *

app = FastAPI(title="Multimodal Construction Intelligence Platform", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])

MAX_IMG = 8 * 1024 * 1024


async def read_image(f: UploadFile):
    if not (f.content_type or "").startswith("image/"):
        raise HTTPException(415, "Upload an image file (jpg, png, webp).")
    data = await f.read()
    if len(data) > MAX_IMG:
        raise HTTPException(413, "Image must be under 8 MB.")
    return data, f.content_type


def run(prompt, schema, image=None, mime="image/jpeg"):
    try:
        return generate_json(prompt, schema, image, mime)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(502, str(e))
    except Exception as e:  # upstream LLM failure
        raise HTTPException(502, f"AI service error: {e}")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---- Epic 2: image-based analysis ----
@app.post("/api/safety", response_model=SafetyReport)
async def safety(image: UploadFile = File(...), context: str = Form("")):
    data, mime = await read_image(image)
    prompt = ("Inspect this construction site image for safety violations: PPE (helmets, vests, harnesses), "
              "scaffolding, edge protection, excavation, electrical hazards, housekeeping, machinery. "
              f"List each issue with severity and a fix. Extra context: {context or 'none'}")
    return run(prompt, SafetyReport, data, mime)


@app.post("/api/cracks", response_model=CrackReport)
async def cracks(image: UploadFile = File(...), location: str = Form("")):
    data, mime = await read_image(image)
    prompt = ("Analyse this image of a concrete/masonry surface for cracks. Classify type, severity, "
              "estimate width if a scale reference is visible, give probable causes and actions. "
              f"Element/location: {location or 'unknown'}. If no crack is visible, set crack_detected=false.")
    return run(prompt, CrackReport, data, mime)


# ---- Epic 3: planning & valuation ----
@app.post("/api/valuation", response_model=ValuationReport)
def valuation(req: ValuationRequest):
    prompt = ("Estimate the current market value of this Indian real-estate property. Give a range, "
              f"per-sqft rate and key factors. Be explicit that this is an indicative estimate.\n{req.model_dump_json()}")
    return run(prompt, ValuationReport)


@app.post("/api/plan", response_model=ProjectPlan)
def plan(req: PlanRequest):
    prompt = ("Create a phase-wise construction plan (site prep, foundation, structure, MEP, finishing, handover) "
              f"with durations, tasks, costs, dependencies and risks. Respect budget/deadline when given.\n{req.model_dump_json()}")
    return run(prompt, ProjectPlan)


# ---- Epic 5: assistant & advisory ----
@app.post("/api/chat", response_model=ChatReply)
def chat(req: ChatRequest):
    role = ("daily site assistant helping a site engineer with today's tasks, checklists and decisions"
            if req.mode == "site_assistant" else
            "construction knowledge assistant citing Indian standards (IS codes, NBC) where relevant")
    hist = "\n".join(f"{m.get('role','user')}: {m.get('content','')}" for m in req.history[-8:])
    return run(f"Act as a {role}.\nConversation so far:\n{hist}\nUser: {req.message}", ChatReply)


@app.post("/api/weather", response_model=WeatherAdvisory)
async def weather(req: WeatherRequest):
    async with httpx.AsyncClient(timeout=15) as c:
        geo = (await c.get("https://geocoding-api.open-meteo.com/v1/search",
                           params={"name": req.city, "count": 1})).json()
        if not geo.get("results"):
            raise HTTPException(404, f"City '{req.city}' not found.")
        g = geo["results"][0]
        w = (await c.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude": g["latitude"], "longitude": g["longitude"],
            "current": "temperature_2m,wind_speed_10m", "hourly": "precipitation",
            "forecast_days": 1})).json()
    temp = w["current"]["temperature_2m"]
    wind = w["current"]["wind_speed_10m"]
    rain = round(sum(w["hourly"]["precipitation"][:24]), 1)
    prompt = (f"Weather for {g['name']}: {temp}°C, wind {wind} km/h, rain {rain} mm next 24h. "
              f"Planned activity: {req.activity}. Give a go/caution/no_go call, advisories (concrete pours, "
              "crane/lifting, scaffolding, worker heat/cold safety) and schedule changes. "
              f"Set city='{g['name']}', current_temp_c={temp}, wind_kmh={wind}, rain_mm_next_24h={rain}.")
    return run(prompt, WeatherAdvisory)
