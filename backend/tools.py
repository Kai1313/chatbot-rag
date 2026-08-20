import json
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL
from models import Transaksi
from storage import get_storage_provider

# Tool 1: Check PBG Status (Database SQL Lookup)
TOOL_CHECK_PBG_STATUS = {
    "type": "function",
    "function": {
        "name": "check_pbg_status",
        "description": "Memeriksa status real-time permohonan PBG dari database berdasarkan nomor registrasi / nomor daftar.",
        "parameters": {
            "type": "object",
            "properties": {
                "registration_id": {
                    "type": "string",
                    "description": "Nomor registrasi / nomor daftar permohonan PBG (Contoh: '6680', '2845', '108564', '138576')."
                }
            },
            "required": ["registration_id"]
        }
    }
}

# Tool 2: Check Document Vault (Brangkas / Berkas Lampiran)
TOOL_CHECK_DOCUMENT_VAULT = {
    "type": "function",
    "function": {
        "name": "check_document_vault",
        "description": "Melihat dan mengunduh berkas lampiran, dokumen teknis, denah/gambar arsitektur, foto, atau SK PBG dari brangkas penyimpanan (lokal/cloud) berdasarkan nomor pendaftaran.",
        "parameters": {
            "type": "object",
            "properties": {
                "registration_id": {
                    "type": "string",
                    "description": "Nomor registrasi / nomor daftar permohonan (Contoh: '6680', '2845', '14374', '102714')."
                }
            },
            "required": ["registration_id"]
        }
    }
}

def check_pbg_status(registration_id: str) -> str:
    """
    Queries PostgreSQL for exact application tracking logs by registration_id (no_daftar).
    """
    if not registration_id:
        return json.dumps({"status": "error", "message": "Nomor daftar tidak boleh kosong."})

    reg_clean = str(registration_id).strip()
    if reg_clean.endswith('.0'):
        reg_clean = reg_clean[:-2]

    try:
        engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()

        # Query all steps for this registration number ordered by step index
        results = session.query(Transaksi).filter(Transaksi.no_daftar == reg_clean).order_by(Transaksi.no_urut.asc()).all()
        session.close()

        if not results:
            return json.dumps({
                "registration_id": reg_clean,
                "status": "Tidak Ditemukan",
                "message": f"Nomor daftar '{reg_clean}' tidak ditemukan dalam database permohonan PBG."
            }, ensure_ascii=False)

        # Convert ORM objects to dicts
        records = [r.to_dict() for r in results]
        latest_step = records[0]
        
        return json.dumps({
            "registration_id": reg_clean,
            "status": "Ditemukan",
            "total_steps": len(records),
            "latest_step": latest_step,
            "all_steps": records
        }, ensure_ascii=False)

    except Exception as exc:
        return json.dumps({
            "status": "error",
            "message": f"Gagal mengakses database PostgreSQL: {exc}"
        }, ensure_ascii=False)

def check_document_vault(registration_id: str) -> str:
    """
    Queries self-hosted or cloud storage provider for document attachments / blueprints / scans.
    """
    if not registration_id:
        return json.dumps({"status": "error", "message": "Nomor daftar tidak boleh kosong."})

    reg_clean = str(registration_id).strip()
    if reg_clean.endswith('.0'):
        reg_clean = reg_clean[:-2]

    base_api_url = os.environ.get("BASE_API_URL", "http://localhost:8080")
    provider = get_storage_provider()
    res = provider.list_documents(reg_clean, base_url=base_api_url)
    
    # Add instructions for AI to format files into markdown list with clickable links
    if res.get("status") == "Ditemukan" and res.get("files"):
        res["instructions_for_ai"] = (
            "Sajikan daftar dokumen kepada pengguna dalam bentuk bullet list rapi dengan format: "
            "`* [Nama File](view_url) — Kategori (Ukuran)`. "
            "Jika ada file SK PBG, tonjolkan secara khusus."
        )
    return json.dumps(res, ensure_ascii=False)

# Dispatch registry
TOOL_REGISTRY = {
    "check_pbg_status": check_pbg_status,
    "check_document_vault": check_document_vault
}
