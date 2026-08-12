import os
import sys
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

sys.path.append(str(Path(__file__).parent))

from database import engine, Base, get_db
from models import Transaksi
from llm_provider import generate_chat_response
from tools import check_pbg_status

# Initialize FastAPI App
app = FastAPI(
    title="PBG Assist API",
    description="Backend API for PBG Assist Mobile-First PWA RAG Chatbot",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure tables are created on startup
@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        print("PostgreSQL tables verified/created successfully.")
    except Exception as exc:
        print(f"Startup database warning: {exc}")

# Pydantic Schemas
class ChatMessage(BaseModel):
    role: str # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str
    provider: str
    model: str

# Endpoints
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Healthcheck endpoint verifying backend & DB connectivity."""
    db_status = "connected"
    try:
        db.query(Transaksi).first()
    except Exception:
        db_status = "unavailable"

    return {
        "status": "healthy",
        "database": db_status,
        "llm_provider": os.getenv("LLM_PROVIDER", "deepseek"),
        "llm_model": os.getenv("LLM_MODEL", "deepseek-chat")
    }

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest):
    """Primary chat endpoint for PWA client."""
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Pesan tidak boleh kosong.")

    # Convert Pydantic history to dict
    history_dicts = [{"role": h.role, "content": h.content} for h in payload.history]
    
    reply_text = generate_chat_response(payload.message, history_dicts)

    return ChatResponse(
        reply=reply_text,
        provider=os.getenv("LLM_PROVIDER", "deepseek"),
        model=os.getenv("LLM_MODEL", "deepseek-chat")
    )

@app.get("/api/status/{no_daftar}")
def status_lookup(no_daftar: str):
    """Direct JSON status lookup by registration number."""
    result_json_str = check_pbg_status(no_daftar)
    import json
    return json.loads(result_json_str)

@app.post("/api/ingest")
def trigger_ingestion(background_tasks: BackgroundTasks):
    """Triggers background data ingestion from PERIZINAN PBG.xlsx."""
    from ingest import main as run_ingestion
    background_tasks.add_task(run_ingestion)
    return {"message": "Data ingestion task started in background."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
