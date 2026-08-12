# PBG Assist REST API Documentation

This document outlines the API endpoints provided by the **FastAPI Backend Service** running at `http://localhost:8000`.

---

## 1. System Healthcheck

### `GET /api/health`
Verifies backend service, PostgreSQL database connectivity, and current LLM provider configuration.

* **Request**: None
* **Response (200 OK)**:
```json
{
  "status": "healthy",
  "database": "connected",
  "llm_provider": "deepseek",
  "llm_model": "deepseek-chat"
}
```

---

## 2. Chat Completion & RAG

### `POST /api/chat`
Primary endpoint for the PWA client to send user queries, perform RAG retrieval on ChromaDB, trigger tool calling on PostgreSQL, and return generated answers.

* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "message": "Apa saja syarat PBG Rumah Tinggal Sederhana?",
  "history": [
    {
      "role": "user",
      "content": "Halo"
    },
    {
      "role": "assistant",
      "content": "Halo, ada yang bisa saya bantu?"
    }
  ]
}
```
* **Response (200 OK)**:
```json
{
  "reply": "Untuk mengurus PBG Rumah Tinggal Sederhana, dokumen yang dibutuhkan meliputi...",
  "provider": "deepseek",
  "model": "deepseek-chat"
}
```

---

## 3. Direct Application Status Lookup

### `GET /api/status/{no_daftar}`
Direct JSON lookup for application tracking history by registration number (`no_daftar`).

* **Example**: `GET /api/status/6680`
* **Response (200 OK)**:
```json
{
  "registration_id": "6680",
  "status": "Ditemukan",
  "total_steps": 22,
  "latest_step": {
    "id": 1,
    "no_urut": 1.0,
    "no_daftar": "6680",
    "tahun_daftar": 2026,
    "peruntukan": "PBG Non Rumah Tinggal Non Usaha Mikro Bukan Bangunan Gedung",
    "tgl_menerima": "2026-01-22T11:35:22",
    "tgl_pemrosesan": "2026-01-22T15:50:48",
    "nama_pemroses": "Indah Mayasari, A.Md., S.T.",
    "dari_tahap": "Penomoran Surat Izin / Rekom di DPMPTSP",
    "menuju_tahap": "Berkas Dinyatakan Selesai ( SK telah Terbit )",
    "keterangan_proses": "BERKAS SELESAI",
    "status_waktu": "Terlambat"
  }
}
```

---

## 4. Trigger Background Data Ingestion

### `POST /api/ingest`
Triggers a background task to re-parse `PERIZINAN PBG.xlsx` and reload PostgreSQL & ChromaDB.

* **Response (200 OK)**:
```json
{
  "message": "Data ingestion task started in background."
}
```
