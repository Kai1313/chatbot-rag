# Hybrid RAG Chatbot & Workflow Tracking Engine

A modern, fullstack, mobile-first **Progressive Web App (PWA) Chatbot & Real-Time Tracking Engine** built with a **Hybrid RAG Architecture**:
* **Semantic Vector Search (ChromaDB)** for answering complex rules, guidelines, and document requirements.
* **Structured Relational Database (PostgreSQL)** for exact, 100% accurate status lookups across multi-stage application workflows.
* **Self-Hosted & Cloud Hybrid Document Vault**: Direct file preview & download for PDFs, blueprints (AutoCAD DWG), and site photos with zero rate limits (switchable to Google Drive / S3).
* **🎙️ Voice Interaction (STT & TTS)**: Indonesian speech-to-text voice input via microphone and natural text-to-speech voice playback with on-demand *"Dengarkan"* triggers.
* **Model-Agnostic AI Engine**: Seamlessly switch between **DeepSeek-V3**, **Google Gemini**, **Groq**, **OpenAI**, or **Ollama** via simple `.env` toggles.

> 💡 **Reference Implementation Included**: Out of the box, this repository includes **PBG Assist** (Building Permit Assistant) as a fully functional domain template, but it can be adapted to **any custom tracking or support workflow** (permits, licensing, hospital queues, logistics, or customer service tickets).

---

## 🌟 Key Features

* **📱 Mobile-First PWA**: Touch-optimized Next.js 14 frontend with quick prompt pills, markdown rendering, clickable document links, and "Add to Home Screen" support (iOS / Android).
* **🎙️ Voice-Enabled AI Assistant**:
  * **Speech-to-Text (STT)**: Speak queries directly in Indonesian using the `<Mic />` microphone button.
  * **Text-to-Speech (TTS)**: Listen to AI responses in natural Indonesian using the `[🔊 Dengarkan]` on-demand audio button or optional hands-free auto-voice mode.
* **🧠 Hybrid RAG Architecture**:
  * Vector Store (`ChromaDB`) for unstructured domain knowledge.
  * Relational DB (`PostgreSQL` on port `5431`) for exact SQL queries & status logs.
* **📁 Self-Hosted & Cloud Document Vault**:
  * Browse and download application files, blueprints, and certificates directly via the chat UI.
  * Default self-hosted storage (`./data/documents`) with optional adapter for Google Drive / S3.
* **🔌 Plug-and-Play Custom Datasets**: Ingest your own Excel / CSV / JSON / API data in minutes using provided templates.
* **🐳 One-Command Deployment**: Fully containerized Docker Compose stack (PostgreSQL + FastAPI + Next.js).
* **🧪 Automated Test Suite**: Comprehensive Playwright E2E and REST API test suite included.

---

## 🚀 Quickstart Guide (One-Command Launch)

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Clone & Setup Environment
```bash
git clone https://github.com/Kai1313/chatbot-rag.git
cd chatbot-rag
git checkout development
cp .env.example .env
```

Edit `.env` to select your preferred AI provider:
```env
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat
DEEPSEEK_API_KEY=your_actual_deepseek_api_key

# Document storage (default: local)
STORAGE_PROVIDER=local
```

### 2. Launch Docker Stack
```bash
docker compose up --build -d
```

Access the services:
* **Mobile-First PWA Frontend**: [http://localhost:3000](http://localhost:3000) or `http://<your-computer-ip>:3000` (on mobile Wi-Fi)
* **FastAPI Backend API**: [http://localhost:8080](http://localhost:8080)
* **Interactive API Docs**: [http://localhost:8080/docs](http://localhost:8080/docs)

---

## 🎙️ Voice Features & How to Use

1. **Voice Input (Speech-to-Text via `<Mic />`)**:
   * On desktop (`localhost:3000`): Tap the **Microphone icon (`<Mic />`)**, allow microphone access, and speak in Indonesian.
   * On mobile (`IP:3000`): Tap the chat input box and use the **native microphone button on your smartphone keyboard** (Gboard / iOS Keyboard) for instant, security-compliant voice typing.
2. **Voice Output (Text-to-Speech via `[🔊 Dengarkan]`)**:
   * Every assistant response bubble features an on-demand **`[🔊 Dengarkan]`** button. Tap it to listen to the explanation.
   * Tap the **Speaker icon in the header** to toggle continuous hands-free auto-play mode.

---

## 📁 Document Vault Structure & Usage

You can attach files (PDFs, CAD blueprints `.dwg`, images `.jpg`/`.png`) organized by application registration ID:

```
data/
└── documents/
    ├── 6680/
    │   ├── 6680_SK.pdf
    │   ├── 1.pdf
    │   └── 9.dwg
    └── 2845/
        ├── 2845_SK.pdf
        └── 10.dwg
```

Users can ask:
* *"Tampilkan dokumen berkas nomor 6680"*
* *"Ada berkas apa saja untuk pendaftaran 2845?"*

The chatbot will return clickable preview/download links with category and file size tags.

---

## 📊 Using Your Own Custom Dataset

This framework works with **any multi-stage tracking workflow** and **knowledge base**:

1. Read the **[Data Schema Guide](data_template/DATA_SCHEMA_GUIDE.md)** for column specifications and data types.
2. Inspect the sample templates:
   * **`data_template/sample_syarat.csv`** (Knowledge Base / Requirements)
   * **`data_template/sample_transaksi.csv`** (Multi-Stage Tracking Logs)
3. Place your data file in the project folder and launch with `docker compose up --build -d`.

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

1. Connect your smartphone to the same Wi-Fi network as your computer.
2. Open `http://<your-computer-ip>:3000` on Chrome (Android) or Safari (iOS).
3. Tap the browser menu $\rightarrow$ Select **"Add to Home Screen"** or **"Install App"**.
4. The application will install as a native standalone app on your smartphone.

---

## 🧪 Automated Testing (Playwright E2E & API)

Run the automated test suite in `testing/`:

```bash
cd testing
npx playwright install
npm test
```

* **Interactive UI Mode**: `npm run test:ui`
* **HTML Test Report**: `npm run test:report`

---

## 📚 Documentation

* **[API Documentation](API_DOCUMENTATION.md)** — FastAPI REST endpoints reference.
* **[Data Schema Guide](data_template/DATA_SCHEMA_GUIDE.md)** — Custom dataset preparation and column definitions.
* **[Prompt & Guardrails Guide](PROMPT_GUIDE.md)** — System prompt personas and out-of-scope protection rules.
* **[Architecture & Build Plan](RAG_BUILD_PLAN.md)** — Full technical specification and architecture diagrams.
