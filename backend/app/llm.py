"""Thin multimodal LLM wrapper (Gemini). Enforces JSON output via pydantic schemas."""
import os
import json
import time
from typing import Optional, Type, TypeVar

from dotenv import load_dotenv
from pydantic import BaseModel, ValidationError

load_dotenv()

T = TypeVar("T", bound=BaseModel)

MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
# Optional backup models, comma separated, e.g. GEMINI_FALLBACKS=model-a,model-b
FALLBACKS = [m.strip() for m in os.getenv("GEMINI_FALLBACKS", "").split(",") if m.strip()]

SYSTEM = (
    "You are a senior civil engineer and construction site-safety expert. "
    "Be precise, practical and conservative on safety. Use INR for money. "
    "Return ONLY data that fits the requested JSON schema."
)

_client = None


def _get_client():
    global _client
    if _client is None:
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            raise RuntimeError("GEMINI_API_KEY is not set. Add it to backend/.env")
        from google import genai
        # timeout is in milliseconds: a request can never hang longer than 45 s
        _client = genai.Client(api_key=key, http_options={"timeout": 45000})
    return _client


def generate_json(prompt: str, schema: Type[T], image: Optional[bytes] = None,
                  mime: str = "image/jpeg") -> T:
    from google.genai import types

    parts = [prompt]
    if image:
        parts.append(types.Part.from_bytes(data=image, mime_type=mime))

    cfg = types.GenerateContentConfig(
        system_instruction=SYSTEM,
        response_mime_type="application/json",
        response_schema=schema,
        temperature=0.2,
    )

    last_err = None
    for model in [MODEL] + FALLBACKS:
        for attempt in range(1, 3):  # at most 2 tries per model
            try:
                print(f"[llm] model={model} attempt={attempt}", flush=True)
                resp = _get_client().models.generate_content(
                    model=model, contents=parts, config=cfg
                )
                return schema.model_validate(json.loads(resp.text))
            except (ValidationError, json.JSONDecodeError, TypeError) as e:
                last_err = e
                print(f"[llm] bad JSON from model: {e}", flush=True)
            except Exception as e:
                last_err = e
                print(f"[llm] error: {e}", flush=True)
                msg = str(e)
                if "503" in msg or "429" in msg or "timed out" in msg.lower():
                    time.sleep(2)   # busy server: short wait, then retry
                else:
                    break           # e.g. 404 model not found: try the next model

    raise ValueError(f"AI request failed: {last_err}")