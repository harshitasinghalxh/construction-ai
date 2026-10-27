import os, base64
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"), http_options={"timeout": 30000})

# tiny 1x1 PNG, just to test whether a model accepts images
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")

names = [m.name.replace("models/", "") for m in client.models.list()
         if "gemini" in m.name and "generateContent" in (m.supported_actions or [])]
print(f"Testing {len(names)} models...\n")

for n in names:
    try:
        client.models.generate_content(
            model=n,
            contents=["Reply with OK", types.Part.from_bytes(data=PNG, mime_type="image/png")])
        print("WORKS WITH IMAGES:", n)
    except Exception as e:
        print("no:", n, "-", str(e)[:70].replace("\n", " "))
