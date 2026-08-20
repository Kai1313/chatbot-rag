# Hybrid RAG Chatbot & Tracking Engine Implementation Specification

This document represents the validated technical specification, architecture blueprint, and live progress tracker for the **Hybrid RAG Chatbot & Multi-Stage Workflow Tracking Engine** (featuring the **PBG Assist** reference domain), built with a fully containerized **PostgreSQL** database, **ChromaDB** vector store, **Self-Hosted & Cloud Hybrid Document Vault**, and a **Mobile-First Next.js PWA**.

---

## 1. System Architecture Overview

```
 +-----------------------------------------------------------------------------------+
 |                             DOCKER COMPOSE SYSTEM                                 |
 |                                                                                   |
 |  +-----------------------------------------------------------------------------+  |
 |  |                         Next.js 14 Frontend (PWA)                           |  |
 |  |  - Mobile-First UI (Tailwind CSS, Touch Controls)                           |  |
 |  |  - PWA Manifest & Service Worker ("Add to Home Screen")                      |  |
 |  +-------------------------------------+---------------------------------------+  |
 |                                        | HTTP API (port 3000 -> 8080)             |
 |                                        v                                          |
 |  +-------------------------------------+---------------------------------------+  |
 |  |                        FastAPI Backend (Python 3.11)                        |  |
 |  |  - Model-Agnostic Engine (DeepSeek / Gemini / Groq / OpenAI / Ollama)       |  |
 |  |  - Intent Router & SQL Tool Calling (`check_pbg_status`)                    |  |
 |  |  - Document Vault Storage Tool (`check_document_vault`)                     |  |
 |  +----------+--------------------------+-----------------------+---------------+  |
 |             |                          |                       |                  |
 |             v                          v                       v                  v
 |  +----------+---------+     +----------+---------+   +---------+-------+  +-------+-------+
 |  | ChromaDB Vector DB |     | PostgreSQL DB 5431 |   | Local Doc Vault |  | Cloud Storage |
 |  | (Knowledge / Rules)|     | Table: `transaksi` |   | ./data/documents|  | Google Drive  |
 |  | `SYARAT` Dataset   |     | `Transaksi2` (95)  |   | Static File Srv |  | AWS S3 / R2   |
 |  +--------------------+     +--------------------+   +-----------------+  +---------------+
 |                                                                                   |
 |  +-----------------------------------------------------------------------------+  |
 |  |                  Data Ingestion Pipeline (backend/ingest.py)                |  |
 |  |  Parses Custom Excel / CSV -> Populates PostgreSQL & ChromaDB Vector Store    |  |
 |  +-----------------------------------------------------------------------------+  |
 +-----------------------------------------------------------------------------------+
```

---

## 2. Database Design & Direct GUI Access

### A. PostgreSQL Configuration (`postgres:16-alpine`)
* **Host Port Mapping**: `5431:5432` (Mapped to host port 5431 to prevent host port 5432 collisions).
* **Direct GUI Connection**: Connect via **Navicat**, **HeidiSQL**, **DBeaver**, or **pgAdmin**:
  * **Host**: `localhost` (or `127.0.0.1`)
  * **Port**: `5431`
  * **Database Name**: `local_db`
  * **User**: `local_user`
  * **Password**: `local_password`

### B. Table Schema: `transaksi`
* **Columns**:
  * `id` (SERIAL PRIMARY KEY)
  * `no_urut` (FLOAT/INT) — Workflow step index (1, 2, 3...)
  * `no_daftar` (VARCHAR(50), INDEXED) — Application / ticket tracking number
  * `tahun_daftar` (INT) — Registration year
  * `peruntukan` (TEXT) — Permit / service category
  * `tgl_menerima` (TIMESTAMP) — Timestamp task received by officer
  * `tgl_pemrosesan` (TIMESTAMP) — Timestamp task processed
  * `tgl_batas_waktu` (TIMESTAMP) — SLA deadline
  * `target_lama_menit` (FLOAT) — Target duration in minutes
  * `lama_pemrosesan_menit` (FLOAT) — Actual duration in minutes
  * `nama_pemroses` (VARCHAR(255)) — Officer / department in charge
  * `dari_tahap` (TEXT) — Origin workflow stage
  * `menuju_tahap` (TEXT) — Next / destination workflow stage
  * `keterangan_proses` (TEXT) — Process remarks / outcome notes
  * `status_waktu` (VARCHAR(50)) — SLA status (`Tepat Waktu` / `Terlambat`)

---

## 3. Storage Provider & Document Vault Abstraction

1. **Self-Hosted Local Vault (`LocalStorageProvider`)**:
   * Storage Directory: `./data/documents/{registration_id}/` (mounted in Docker as `/app/data/documents`).
   * Supported formats: `.pdf` (certificates/scans), `.dwg` (AutoCAD blueprints), `.jpg`/`.png`/`.webp` (site photos).
   * Static Endpoint: `http://localhost:8080/storage/documents/{registration_id}/{filename}`.
2. **Cloud Storage Adapter (`GoogleDriveStorageProvider`)**:
   * Switchable via `STORAGE_PROVIDER=gdrive` in `.env`.
   * Queries Google Drive API using service account credentials.

---

## 4. Model-Agnostic LLM Engine (DeepSeek / Gemini / Groq / OpenAI)

Backend is configured with a unified provider interface selectable via `.env`:
```env
# Switch provider anytime:
LLM_PROVIDER=deepseek         # Options: deepseek, gemini, groq, openai, ollama
LLM_MODEL=deepseek-chat
DEEPSEEK_API_KEY=your_key_here

# Storage provider:
STORAGE_PROVIDER=local        # Options: local, gdrive, s3
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

  # 2. FastAPI Backend Service (Port 8080 on host)
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: local_backend
    restart: always
    ports:
      - "8080:8000"
    environment:
      - DATABASE_URL=postgresql://local_user:local_password@db:5432/local_db
      - LLM_PROVIDER=${LLM_PROVIDER:-deepseek}
      - LLM_MODEL=${LLM_MODEL:-deepseek-chat}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - STORAGE_PROVIDER=${STORAGE_PROVIDER:-local}
      - BASE_API_URL=${BASE_API_URL:-http://localhost:8080}
    volumes:
      - ./data/chroma:/app/chroma_db
      - ./data/documents:/app/data/documents
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
      - NEXT_PUBLIC_API_URL=http://localhost:8080
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 6. Live Execution Progress & Session Resume Tracker

- [x] **Architecture Blueprint & Specs**: Fully validated (PostgreSQL `local_` credentials on port `5431`, FastAPI on port `8080`, Mobile PWA on port `3000`, Docker Compose).
- [x] **Step 1: Folder Structure & `.env.example`**: Created `backend/`, `frontend/`, `data/`, `testing/`, `data_template/`, `backend/requirements.txt`, `.env`, `.env.example`.
- [x] **Step 2: Database Models & Ingestion (`ingest.py`)**: Created `backend/database.py`, `backend/models.py`, and `backend/ingest.py` (PostgreSQL insertion + ChromaDB loader supporting `Transaksi2` with 2,050 records & 95 registration numbers).
- [x] **Step 3: FastAPI Backend & RAG Routing**: Created `backend/config.py`, `backend/tools.py`, `backend/rag_retriever.py`, `backend/llm_provider.py` (Model-Agnostic DeepSeek/Gemini/Groq/OpenAI engine), and `backend/main.py` (FastAPI REST server).
- [x] **Step 4: Next.js Mobile-First PWA**: Created `frontend/package.json`, `tsconfig.json`, `tailwind.config.ts`, `manifest.json`, `sw.js`, `layout.tsx`, and `page.tsx` (Mobile-first PWA UI with dynamic host detection and quick prompt pills).
- [x] **Step 5: Dockerization & Host Collision Prevention**: Configured `Dockerfile.backend`, `Dockerfile.frontend`, `docker-compose.yml`, and mapped FastAPI to host port `8080` (preventing Windows port 8000 collisions).
- [x] **Step 6: Playwright Automated Test Suite**: Created multi-device E2E and REST API test suite in `testing/` (`testing/tests/pbg_assist.spec.ts` & `testing/tests/pbg_api.spec.ts`).
- [x] **Step 7: Custom Dataset Templates & Schema Guide**: Created `data_template/DATA_SCHEMA_GUIDE.md`, `data_template/sample_syarat.csv`, and `data_template/sample_transaksi.csv`.
- [x] **Step 8: Data Privacy & Git Security**: Configured `.gitignore` to exclude `*.xlsx`, `*.xls`, `*.csv`, and `data/documents/` from Git repository tracking.
- [x] **Step 9: Hybrid Document Vault Storage (`development` branch)**: Created `backend/storage.py` abstraction, `check_document_vault` tool, `/storage/documents` static file server, and UI clickable link rendering.
- [x] **Step 10: Indonesian Voice Interaction (STT & TTS)**: Implemented Web Speech API Speech-to-Text (`<Mic />`) with live status feedback and natural Indonesian Text-to-Speech with on-demand `[🔊 Dengarkan]` message triggers.
