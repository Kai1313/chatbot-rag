# PBG Assist — Mobile-First RAG Chatbot & Application Tracker

**PBG Assist** is a fullstack, mobile-first Progressive Web App (PWA) chatbot designed to assist public users with Persetujuan Bangunan Gedung (PBG) regulations, document requirements, and real-time application status tracking.

It uses a **Hybrid RAG System**:
* **Semantic Vector Search (ChromaDB)** for retrieving document requirements from the `SYARAT` dataset.
* **Structured SQL Lookups (PostgreSQL)** for exact, 100% accurate application tracking logs from the `TRANSAKSI` dataset.

---

## 🚀 Quickstart Guide (One-Command Launch)

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Clone & Setup Environment
Copy `.env.example` to `.env` and add your chosen LLM provider API key (DeepSeek / Gemini / Groq / OpenAI):
```bash
cp .env.example .env
```

Edit `.env` to select your preferred AI provider:
```env
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat
DEEPSEEK_API_KEY=your_actual_deepseek_api_key
```

### 2. Launch Docker Stack
Run single-command orchestration:
```bash
docker compose up --build
```

Access the services:
* **Mobile-First PWA Frontend**: [http://localhost:3000](http://localhost:3000)
* **FastAPI Backend API**: [http://localhost:8000](http://localhost:8000)
* **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🗄️ Connecting to PostgreSQL DB via Navicat / HeidiSQL / DBeaver

You can connect directly to the running PostgreSQL container from your desktop DB client:

* **Host**: `localhost` (or `127.0.0.1`)
* **Port**: `5432`
* **Database Name**: `local_db`
* **User**: `local_user`
* **Password**: `local_password`

---

## 📱 Mobile PWA Installation ("Add to Home Screen")

PBG Assist is built mobile-first:
1. Open `http://localhost:3000` (or your server's IP) on Chrome (Android) or Safari (iOS).
2. Tap the browser menu $\rightarrow$ Select **"Add to Home Screen"** or **"Install App"**.
3. PBG Assist will install as a standalone native app icon on your smartphone.

---

## 🛠️ Project Architecture

```
chatbot/
├── backend/                  # Python 3.11 FastAPI Backend
│   ├── config.py             # System prompt & guardrails
│   ├── database.py           # SQLAlchemy PostgreSQL engine
│   ├── models.py             # Transaksi ORM table schema
│   ├── tools.py              # Status check function calling tool
│   ├── rag_retriever.py      # ChromaDB vector store retriever
│   ├── llm_provider.py       # Model-agnostic LLM engine (DeepSeek/Gemini/Groq/OpenAI)
│   ├── main.py               # FastAPI server & REST endpoints
│   └── ingest.py             # Local XLSX dataset parser & ingestion script
├── frontend/                 # Next.js 15 PWA Frontend
│   ├── app/                  # Mobile-first App Router UI
│   ├── public/               # PWA manifest.json & sw.js service worker
│   └── package.json
├── data/                     # Persistent ChromaDB data store
├── docker-compose.yml        # Docker stack orchestrator
├── Dockerfile.backend        # FastAPI Docker builder
├── Dockerfile.frontend       # Next.js PWA Docker builder
├── PERIZINAN PBG.xlsx        # Knowledge source dataset
└── RAG_BUILD_PLAN.md         # Technical architecture specification
```
