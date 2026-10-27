# Multimodal Construction Intelligence Platform
React.js frontend + FastAPI backend + Gemini multimodal LLM, with strict JSON contracts (pydantic).

## Run
Backend:
    cd backend && python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    cp .env.example .env     # add GEMINI_API_KEY (free at aistudio.google.com)
    uvicorn app.main:app --reload --port 8000
Frontend:
    cd frontend && npm install && npm run dev      # http://localhost:5173

API docs: http://localhost:8000/docs

## Features -> endpoints
Safety monitoring  POST /api/safety      Crack detection  POST /api/cracks
Real estate value  POST /api/valuation   Project planning POST /api/plan
Weather advisory   POST /api/weather     Site assistant / knowledge  POST /api/chat
