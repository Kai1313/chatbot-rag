# PBG Assist — Mobile-First RAG Chatbot & Application Tracker

**PBG Assist** is a fullstack, mobile-first Progressive Web App (PWA) chatbot designed to assist public users with Persetujuan Bangunan Gedung (PBG) regulations, document requirements, and real-time application status tracking.

It uses a **Hybrid RAG System**:
* **Semantic Vector Search (ChromaDB)** for retrieving document requirements from the `SYARAT` dataset.
* **Structured SQL Lookups (PostgreSQL)** for exact, 100% accurate application tracking logs from the `PERIZINAN_PBG_2.xlsx` (`Transaksi2`) dataset across 95 registration numbers.

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
docker compose up --build -d
```

Access the services:
* **Mobile-First PWA Frontend**: [http://localhost:3000](http://localhost:3000) or `http://<your-ip>:3000` (on mobile Wi-Fi)
* **FastAPI Backend API**: [http://localhost:8080](http://localhost:8080)
* **API Documentation**: [http://localhost:8080/docs](http://localhost:8080/docs)

---

## 🗄️ Connecting to PostgreSQL DB via Navicat / HeidiSQL / DBeaver

You can connect directly to the running PostgreSQL container from your desktop DB client:

* **Host**: `localhost` (or `127.0.0.1`)
* **Port**: `5431`
* **Database Name**: `local_db`
* **User**: `local_user`
* **Password**: `local_password`

---

## 📱 Mobile PWA Installation ("Add to Home Screen")

PBG Assist is built mobile-first:
1. Connect your smartphone to the same Wi-Fi network as your computer.
2. Open `http://<your-computer-ip>:3000` on Chrome (Android) or Safari (iOS).
3. Tap the browser menu $\rightarrow$ Select **"Add to Home Screen"** or **"Install App"**.
4. PBG Assist will install as a standalone native app icon on your smartphone.

---

## 📊 Custom Data Sources & Schema Template

To adapt this chatbot to your own dataset (Excel / CSV / JSON / Database):
* Read the **[Data Schema Guide](data_template/DATA_SCHEMA_GUIDE.md)** for column definitions and data types.
* Inspect sample template files:
  * `data_template/sample_syarat.csv` (Requirements & Knowledge Base)
  * `data_template/sample_transaksi.csv` (Multi-stage tracking logs)

---

## 🧪 Automated Testing (Playwright E2E & API)

Automated end-to-end and integration tests are provided in the `testing/` directory:

```bash
cd testing
npx playwright install
npm test
```

* **Interactive UI Mode**: `npm run test:ui`
* **HTML Test Report**: `npm run test:report`

---

## 📚 Additional Documentation

* **[API Documentation](API_DOCUMENTATION.md)** — FastAPI REST endpoints reference.
* **[Prompt & Guardrails Guide](PROMPT_GUIDE.md)** — System prompt personas and out-of-scope protection rules.
* **[Architecture & Build Plan](RAG_BUILD_PLAN.md)** — Full technical specification and architecture diagrams.
