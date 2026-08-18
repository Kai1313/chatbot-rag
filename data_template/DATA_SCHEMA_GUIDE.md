# Data Source Schema & Preparation Guide

This guide explains the data format, column requirements, data types, and mapping for plugging any custom dataset into the **PBG Assist** chatbot system.

---

## 🏗️ Architecture Overview

The system expects two datasets (either in a single multi-sheet Excel file or separate CSV/JSON tables):

```
                       +-------------------------------+
                       |      Your Custom Dataset      |
                       +---------------+---------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
         [ 1. SYARAT Dataset ]                  [ 2. TRANSAKSI Dataset ]
          (Knowledge & Rules)                     (Multi-Stage Logs)
                   |                                       |
                   v                                       v
          ChromaDB (Vector DB)                  PostgreSQL (SQL Table)
```

---

## 1. Sheet 1: `SYARAT` (Requirements & Knowledge Base)

This dataset contains the document requirements, legal rules, and guidance notes organized by category/peruntukan. It is indexed into **ChromaDB** for semantic RAG similarity matching.

### 📋 Column Specifications

| # | Column Name | Data Type | Required? | Description & Example |
| :-: | :--- | :--- | :-: | :--- |
| **A** | `No Urut` | Number / Integer | Optional | Sequence number of the requirement (e.g. `1`, `2`, `3`). |
| **B** | `Peruntukan` | String / Text | **YES** | The category or building/permit classification (e.g. `PBG Rumah Tinggal Sederhana`, `PBG Usaha Mikro`, `PBG Menara Telekomunikasi`). |
| **C** | `Nama Persyaratan` | String / Text | **YES** | The specific document title or requirement name (e.g. `Bukti Kepemilikan Tanah`, `Gambar Rencana Arsitektur`, `NIB`). |
| **D** | `Keterangan` | String / Text | **YES** | Detailed description, legal rules, criteria, or instructions for this requirement. |
| **E** | `Tipe File` | String / Text | Optional | Expected file extension format (e.g. `pdf`, `dwg`, `jpg`). |

### 💡 Example CSV / Table (`data_template/sample_syarat.csv`)

```csv
No Urut,Peruntukan,Nama Persyaratan,Keterangan,Tipe File
1,PBG Rumah Tinggal Sederhana,Bukti Kepemilikan Tanah,Sertipikat Hak Milik (SHM) / Hak Guna Bangunan (HGB) yang sah,pdf
2,PBG Rumah Tinggal Sederhana,Gambar Rencana Arsitektur,Denah tampak depan/samping dan potongan memanjang,pdf
```

---

## 2. Sheet 2: `Transaksi2` / `TRANSAKSI` (Status Tracking Logs)

This dataset contains the chronological audit logs of permit applications progressing through multiple stages. It is loaded into **PostgreSQL** (`transaksi` table) for exact, real-time SQL status lookups via AI function calling.

### 📋 Column Specifications

| # | Column Name | DB Field Name | Data Type | Required? | Description & Example |
| :-: | :--- | :--- | :--- | :-: | :--- |
| **A** | `No. Urut` | `no_urut` | Float / Int | **YES** | Step index in the application lifecycle (e.g. `1`, `2`, `3`...). Step 1 is earliest; highest is newest. |
| **B** | `No Daftar` | `no_daftar` | Varchar(50) | **YES** | Unique tracking / registration / ticket ID entered by the user (e.g. `108564`, `6680`, `10001`). Indexed for fast lookups. |
| **C** | `Tahun Daftar` | `tahun_daftar` | Integer | Optional | Year the application was filed (e.g. `2026`). |
| **D** | `Peruntukan` | `peruntukan` | Text | **YES** | Category or building service type matching the permit. |
| **E** | `Tanggal Menerima` | `tgl_menerima` | Timestamp | Optional | Timestamp when this specific step/task was received by the officer (e.g. `2026-01-10 09:00:00`). |
| **F** | `Tanggal Pemrosesan` | `tgl_pemrosesan` | Timestamp | **YES** | Timestamp when the officer processed / completed this step. |
| **G** | `Tanggal Batas Waktu` | `tgl_batas_waktu` | Timestamp | Optional | SLA deadline timestamp for this step. |
| **H** | `Target Lama Pemrosesan (menit)` | `target_lama_menit` | Float | Optional | Expected SLA duration in minutes (e.g. `480`). |
| **I** | `Lama Pemrosesan (menit)` | `lama_pemrosesan_menit` | Float | Optional | Actual time taken in minutes (e.g. `150`). |
| **J** | `Nama Pemroses` | `nama_pemroses` | Varchar(255) | Optional | Name / title of the officer or department handling this stage (e.g. `Budi Santoso, S.T.`). |
| **K** | `Dari` | `dari_tahap` | Text | **YES** | Origin stage of the task (e.g. `Pengajuan Berkas oleh Pemohon`). |
| **L** | `Menuju` | `menuju_tahap` | Text | **YES** | Destination / next stage of the task (e.g. `Verifikasi Kelengkapan Dokumen`). |
| **M** | `Keterangan Proses` | `keterangan_proses` | Text | Optional | Official notes, remarks, or summary of the stage outcome (e.g. `Dokumen administrasi dinyatakan lengkap`). |
| **N** | `Status Waktu` | `status_waktu` | Varchar(50) | Optional | SLA compliance status (e.g. `Tepat Waktu` or `Terlambat`). |

### 💡 Example CSV / Table (`data_template/sample_transaksi.csv`)

```csv
No. Urut,No Daftar,Tahun Daftar,Peruntukan,Tanggal Menerima,Tanggal Pemrosesan,Tanggal Batas Waktu,Target Lama Pemrosesan (menit),Lama Pemrosesan (menit),Nama Pemroses,Dari,Menuju,Keterangan Proses,Status Waktu
1,10001,2026,PBG Rumah Tinggal Sederhana,2026-01-10 09:00:00,2026-01-10 11:30:00,2026-01-10 17:00:00,480,150,Budi Santoso, S.T.,Pengajuan Berkas oleh Pemohon,Verifikasi Kelengkapan Dokumen,Dokumen administrasi dinyatakan lengkap,Tepat Waktu
2,10001,2026,PBG Rumah Tinggal Sederhana,2026-01-10 11:30:00,2026-01-12 14:00:00,2026-01-13 17:00:00,1440,1110,Siti Rahmawati, M.T.,Verifikasi Kelengkapan Dokumen,Pemeriksaan Gambar Teknis,Gambar denah dan struktur disetujui,Tepat Waktu
```

---

## 3. How to Use Your Own Data Source

1. **Prepare your Excel / CSV file** following the column formats described above.
2. Place the file in the project root folder (e.g., `MY_CUSTOM_DATA.xlsx`).
3. Ensure `.gitignore` protects it (all `*.xlsx` and `*.csv` are automatically ignored).
4. In [`backend/ingest.py`](file:///D:/projects/vibecode/chatbot/backend/ingest.py), update the filename in `find_excel_file()`.
5. Run `docker compose up --build -d` to ingest your data.
