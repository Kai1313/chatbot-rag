import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL
from models import Transaksi

# Tool declaration schema (OpenAI / DeepSeek / Gemini compatible)
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
                    "description": "Nomor registrasi / nomor daftar permohonan PBG (Contoh: '6680', '138576', '146092')."
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
        
        # Sort by process date / no_urut to identify latest state
        latest_step = records[0] # Step 1 is top summary in log
        
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

# Dispatch registry
TOOL_REGISTRY = {
    "check_pbg_status": check_pbg_status
}
