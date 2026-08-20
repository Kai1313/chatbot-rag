# Hybrid RAG Chatbot REST API Documentation

This document outlines the REST API endpoints provided by the **FastAPI Backend Service** running on host port `8080` (`http://localhost:8080`).

---

## 1. System Healthcheck

### `GET /api/health`
Verifies backend service status, PostgreSQL database connectivity, LLM provider, and Document Vault storage provider.

* **Request**: None
* **Response (200 OK)**:
```json
{
  "status": "healthy",
  "database": "connected",
  "llm_provider": "deepseek",
  "llm_model": "deepseek-chat",
  "storage_provider": "local"
}
```

---

## 2. Chat Completion & RAG

### `POST /api/chat`
Primary endpoint for the PWA client to send user queries, perform RAG retrieval on ChromaDB, trigger tool calling (`check_pbg_status`, `check_document_vault`), and return generated answers.

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

* **Example**: `GET /api/status/108564` or `GET /api/status/6680`
* **Response (200 OK)**:
```json
{
  "registration_id": "108564",
  "status": "Ditemukan",
  "total_steps": 14,
  "latest_step": {
    "id": 124,
    "no_urut": 14.0,
    "no_daftar": "108564",
    "tahun_daftar": 2026,
    "peruntukan": "PBG Rumah Tinggal Sederhana",
    "tgl_menerima": "2026-01-15T08:30:00",
    "tgl_pemrosesan": "2026-01-15T11:45:00",
    "nama_pemroses": "Budi Santoso, S.T.",
    "dari_tahap": "Penerbitan Surat Ketetapan Retribusi (SKRD)",
    "menuju_tahap": "Berkas Dinyatakan Selesai ( SK telah Terbit )",
    "keterangan_proses": "BERKAS SELESAI",
    "status_waktu": "Tepat Waktu"
  }
}
```

---

## 4. Document Vault & File Attachments Lookup

### `GET /api/documents/{no_daftar}`
Direct JSON lookup for document attachments, blueprints, scans, and certificates in the self-hosted vault or cloud storage.

* **Example**: `GET /api/documents/6680`
* **Response (200 OK)**:
```json
{
  "status": "Ditemukan",
  "registration_id": "6680",
  "provider": "local",
  "total_files": 12,
  "message": "Ditemukan 12 file dokumen/gambar untuk berkas nomor '6680'.",
  "files": [
    {
      "name": "6680_SK.pdf",
      "extension": ".pdf",
      "mimeType": "application/pdf",
      "category": "Sertifikat / Surat Keputusan (SK)",
      "size_kb": 405.0,
      "view_url": "http://localhost:8080/storage/documents/6680/6680_SK.pdf",
      "download_url": "http://localhost:8080/storage/documents/6680/6680_SK.pdf",
      "is_pdf": true
    },
    {
      "name": "9.dwg",
      "extension": ".dwg",
      "mimeType": "application/acad",
      "category": "Gambar Rencana AutoCAD (DWG)",
      "size_kb": 831.8,
      "view_url": "http://localhost:8080/storage/documents/6680/9.dwg",
      "download_url": "http://localhost:8080/storage/documents/6680/9.dwg",
      "is_cad": true
    }
  ]
}
```

### Static Direct File Download / Preview Route
* URL format: `GET /storage/documents/{registration_id}/{filename}`
* Example: `http://localhost:8080/storage/documents/6680/6680_SK.pdf`

---

## 5. Trigger Background Data Ingestion

### `POST /api/ingest`
Triggers a background task to re-parse the target dataset (`PERIZINAN_PBG_2.xlsx` / custom data file) and reload PostgreSQL & ChromaDB.

* **Response (200 OK)**:
```json
{
  "message": "Data ingestion task started in background."
}
```
