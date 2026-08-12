# RAG Chatbot Implementation Specification: PBG Assist (PostgreSQL + PWA + Docker)

This document represents the validated technical specification, architecture blueprint, and live progress tracker for **PBG Assist**, a mobile-first Progressive Web App (PWA) chatbot built using **Hybrid RAG** over `PERIZINAN PBG.xlsx` with a fully containerized **PostgreSQL** database.

---

## 1. System Architecture Overview

```
 +-----------------------------------------------------------------------------------+
 |                             DOCKER COMPOSE SYSTEM                                 |
 |                                                                                   |
 |  +-----------------------------------------------------------------------------+  |
 |  |                         Next.js 14 Frontend (PWA)                           |  |
 |  |  - Mobile-First UI (Tailwind CSS, Touch Controls)                           |  |
 |  |  - PWA Manifest & Service Worker                                            |  |
 |  +-------------------------------------+---------------------------------------+  |
 |                                        | HTTP API (port 3000 -> 8000)             |
 |                                        v                                          |
 |  +-------------------------------------+---------------------------------------+  |
 |  |                        FastAPI Backend (Python 3.11)                        |  |
 |  |  - Model-Agnostic Engine (DeepSeek / Gemini / Groq / OpenAI)                 |  |
 |  |  - Intent Router & Function Calling (`check_pbg_status`)                      |  |
 |  +--------------------+-----------------------------------+--------------------+  |
 |                       |                                   |                       |
 |                       v                                   v                       |
 |  +--------------------+-------------------+   +-----------+--------------------+  |
 |  |  ChromaDB Vector DB                    |   |  PostgreSQL Database (port 5431)   |  |
 |  |  (Domain Chunks: `SYARAT`)             |   |  - Table: `transaksi`              |  |
 |  |                                        |   |  - Easy GUI Access via Navicat,    |  |
 |  |                                        |   |    HeidiSQL, DBeaver               |  |
 |  +----------------------------------------+   +------------------------------------+  |
 |                                                                                   |
 |  +-----------------------------------------------------------------------------+  |
 |  |                  Local XLSX Ingestion Pipeline (ingest.py)                  |  |
 |  |  Parses `PERIZINAN PBG.xlsx` -> Populates PostgreSQL & ChromaDB               |  |
 |  +-----------------------------------------------------------------------------+  |
 +-----------------------------------------------------------------------------------+
```

---

## 2. Database Design & Direct GUI Access

### A. PostgreSQL Configuration (`postgres:16-alpine`)
* **Host Port Mapping**: `5431:5432` (Exposed to host machine on port 5431 to avoid host collisions).
* **Direct GUI Connection**: You can directly open **Navicat**, **HeidiSQL**, **DBeaver**, or **pgAdmin** and connect using:
  * **Host**: `localhost` (or `127.0.0.1`)
  * **Port**: `5431`
  * **Database Name**: `local_db`
  * **User**: `local_user`
  * **Password**: `local_password`

### B. Table Schema: `transaksi`
* **Columns**:
  * `id` (SERIAL PRIMARY KEY)
  * `no_urut` (FLOAT/INT)
  * `no_daftar` (VARCHAR(50), INDEXED)
  * `tahun_daftar` (INT)
  * `peruntukan` (TEXT)
  * `tgl_menerima` (TIMESTAMP)
  * `tgl_pemrosesan` (TIMESTAMP)
  * `tgl_batas_waktu` (TIMESTAMP)
  * `target_lama_menit` (FLOAT)
  * `lama_pemrosesan_menit` (FLOAT)
  * `nama_pemroses` (VARCHAR(255))
  * `dari_tahap` (TEXT)
  * `menuju_tahap` (TEXT)
  * `keterangan_proses` (TEXT)
  * `status_waktu` (VARCHAR(50))

---

## 3. Data Pipeline & Hybrid Retrieval

1. **Local XLSX Ingestion (`ingest.py`)**:
   * Reads `PERIZINAN PBG.xlsx` directly from repository root inside container.
   * Cleans date formats and bulk-inserts `TRANSAKSI` rows into **PostgreSQL**.
   * Chunks `SYARAT` by `Peruntukan` and populates **ChromaDB**.
2. **Hybrid RAG Routing**:
   * **Requirements Queries** $\rightarrow$ Semantic search on **ChromaDB**.
   * **Status Check Queries** $\rightarrow$ Parameterized SQL query on **PostgreSQL** (`SELECT * FROM transaksi WHERE no_daftar = '6680' ORDER BY no_urut ASC`).

---

## 4. Model-Agnostic LLM Engine (DeepSeek / Gemini / Groq / OpenAI)

Backend is configured with a unified provider interface selectable via `.env`:
```env
# Switch provider anytime:
LLM_PROVIDER=deepseek         # Options: deepseek, gemini, groq, openai, ollama
LLM_MODEL=deepseek-chat
DEEPSEEK_API_KEY=your_key_here
```

---

## 5. Full Containerization (`docker-compose.yml`)

```yaml
services:
  # 1. PostgreSQL Database Service (Port 5431 exposed for Navicat / HeidiSQL / DBeaver)
  db:
    image: postgres:16-alpine
    container_name: local_postgres
    restart: always
    environment:
      POSTGRES_DB: local_db
      POSTGRES_USER: local_user
      POSTGRES_PASSWORD: local_password
    ports:
      - "5431:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U local_user -d local_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  # 2. FastAPI Backend Service (Port 8000)
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: local_backend
    restart: always
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://local_user:local_password@db:5432/local_db
      - LLM_PROVIDER=${LLM_PROVIDER:-deepseek}
      - LLM_MODEL=${LLM_MODEL:-deepseek-chat}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    volumes:
      - ./data/chroma:/app/chroma_db
    depends_on:
      db:
        condition: service_healthy

  # 3. Next.js Mobile-First PWA Frontend Service (Port 3000)
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: local_frontend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 6. Live Execution Progress & Session Resume Tracker

- [x] **Architecture Blueprint & Specs**: Fully validated (PostgreSQL `local_` credentials, FastAPI, Mobile PWA, Docker Compose).
- [x] **Step 1: Folder Structure & `.env.example`**: Created `backend/`, `frontend/`, `data/`, `backend/requirements.txt`, `.env`, `.env.example`.
- [x] **Step 2: Database Models & Local Ingestion (`ingest.py`)**: Created `backend/database.py`, `backend/models.py`, and `backend/ingest.py` (PostgreSQL insertion + ChromaDB loader).
- [x] **Step 3: FastAPI Backend & RAG Routing**: Created `backend/config.py`, `backend/tools.py`, `backend/rag_retriever.py`, `backend/llm_provider.py` (Model-Agnostic DeepSeek/Gemini/Groq/OpenAI engine), and `backend/main.py` (FastAPI REST server).
- [x] **Step 4: Next.js Mobile-First PWA**: Created `frontend/package.json`, `tsconfig.json`, `tailwind.config.ts`, `manifest.json`, `sw.js`, `layout.tsx`, and `page.tsx` (Mobile-first PWA UI with quick prompt pills).
- [x] **Step 5: Dockerization & End-to-End Test**: Created `Dockerfile.backend`, `Dockerfile.frontend`, `docker-compose.yml`, `README.md`, `API_DOCUMENTATION.md`, `PROMPT_GUIDE.md`, and verified live container health (`local_postgres`, `local_backend`, `local_frontend`).
