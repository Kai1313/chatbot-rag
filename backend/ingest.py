import os
import sys
import datetime
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET

# Add current folder to sys.path
sys.path.append(str(Path(__file__).parent))

def excel_serial_to_datetime(serial_num):
    """Converts Excel serial float date number to Python datetime object."""
    if not serial_num:
        return None
    try:
        val = float(serial_num)
        base_date = datetime.datetime(1899, 12, 30)
        delta = datetime.timedelta(days=val)
        return base_date + delta
    except Exception:
        return None

def find_excel_file():
    """Finds PERIZINAN_PBG_2.xlsx or PERIZINAN PBG.xlsx in common target locations."""
    candidates = [
        Path(__file__).parent / "PERIZINAN_PBG_2.xlsx",
        Path(__file__).parent.parent / "PERIZINAN_PBG_2.xlsx",
        Path("/app/PERIZINAN_PBG_2.xlsx"),
        Path("PERIZINAN_PBG_2.xlsx"),
        Path(__file__).parent / "PERIZINAN PBG.xlsx",
        Path(__file__).parent.parent / "PERIZINAN PBG.xlsx",
        Path("/app/PERIZINAN PBG.xlsx"),
        Path("PERIZINAN PBG.xlsx"),
    ]
    for p in candidates:
        if p.exists():
            return p
    raise FileNotFoundError("Excel dataset file could not be located in project directories.")

def parse_xlsx_raw(file_path):
    """Raw XML parser for XLSX files (works without pandas or openpyxl)."""
    with zipfile.ZipFile(file_path, 'r') as z:
        sst = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                texts = [t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text]
                sst.append(''.join(texts))
        
        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        sheet_map = {}
        for s in wb_tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
            sheet_map[s.attrib['name'].strip()] = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        
        rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rels_tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')}
        
        results = {}
        for name, rId in sheet_map.items():
            target = rel_map[rId]
            if not target.startswith('xl/'):
                target = 'xl/' + target
            sheet_tree = ET.fromstring(z.read(target))
            rows = []
            for row in sheet_tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                r_dict = {}
                for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    ref = c.attrib.get('r')
                    col_name = ''.join([ch for ch in ref if ch.isalpha()])
                    t = c.attrib.get('t', '')
                    v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = ''
                    if v_elem is not None and v_elem.text:
                        val = v_elem.text
                        if t == 's':
                            val = sst[int(val)] if int(val) < len(sst) else val
                    r_dict[col_name] = val
                rows.append(r_dict)
            results[name] = rows
        return results

def ingest_to_postgresql(excel_path):
    """Ingests Transaksi2 sheet (or TRANSAKSI fallback) into PostgreSQL database."""
    print("--- 1. Ingesting Transaksi to PostgreSQL ---")
    try:
        from database import engine, Base
        from models import Transaksi
        from sqlalchemy.orm import sessionmaker
    except ImportError as e:
        print(f"Skipping DB ingestion locally (missing dependency: {e}). Will run inside Docker.")
        return

    raw_sheets = parse_xlsx_raw(excel_path)
    
    # Prioritize Transaksi2 sheet from PERIZINAN_PBG_2.xlsx
    rows = raw_sheets.get("Transaksi2", raw_sheets.get("TRANSAKSI ", raw_sheets.get("TRANSAKSI", [])))
    sheet_name = "Transaksi2" if "Transaksi2" in raw_sheets else "TRANSAKSI"
    
    if not rows:
        print(f"No rows found in {sheet_name} sheet.")
        return

    data = rows[1:] # Skip header
    print(f"Parsed {len(data)} transaction records from sheet '{sheet_name}'.")

    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    session.query(Transaksi).delete()
    session.commit()

    records = []
    for r in data:
        no_daftar_raw = str(r.get('B', '')).strip()
        if not no_daftar_raw:
            continue
        if no_daftar_raw.endswith('.0'):
            no_daftar_raw = no_daftar_raw[:-2]

        tgl_rec = excel_serial_to_datetime(r.get('E'))
        tgl_proc = excel_serial_to_datetime(r.get('F'))
        tgl_limit = excel_serial_to_datetime(r.get('G'))

        def parse_float(val):
            try: return float(val) if val else None
            except: return None

        def parse_int(val):
            try: return int(float(val)) if val else None
            except: return None

        trans_obj = Transaksi(
            no_urut=parse_float(r.get('A')),
            no_daftar=no_daftar_raw,
            tahun_daftar=parse_int(r.get('C')),
            peruntukan=str(r.get('D', '')).strip(),
            tgl_menerima=tgl_rec,
            tgl_pemrosesan=tgl_proc,
            tgl_batas_waktu=tgl_limit,
            target_lama_menit=parse_float(r.get('H')),
            lama_pemrosesan_menit=parse_float(r.get('I')),
            nama_pemroses=str(r.get('J', '')).strip(),
            dari_tahap=str(r.get('K', '')).strip(),
            menuju_tahap=str(r.get('L', '')).strip(),
            keterangan_proses=str(r.get('M', '')).strip(),
            status_waktu=str(r.get('N', '')).strip(),
        )
        records.append(trans_obj)

    session.bulk_save_objects(records)
    session.commit()
    print(f"Successfully inserted {len(records)} records from sheet '{sheet_name}' into PostgreSQL table 'transaksi'.")
    session.close()

def ingest_to_chromadb(excel_path):
    """Ingests SYARAT sheet into local ChromaDB vector store."""
    print("\n--- 2. Ingesting SYARAT to ChromaDB Vector Database ---")
    try:
        import chromadb
    except ImportError:
        print("ChromaDB package not installed locally. Will run inside Docker container.")
        return

    raw_sheets = parse_xlsx_raw(excel_path)
    rows = raw_sheets.get("SYARAT", [])
    if not rows:
        print("No rows found in SYARAT sheet.")
        return

    data = rows[1:]
    chroma_dir = os.getenv("CHROMA_DB_DIR", str(Path(__file__).parent.parent / "data" / "chroma"))
    os.makedirs(chroma_dir, exist_ok=True)

    client = chromadb.PersistentClient(path=chroma_dir)
    collection_name = "pbg_syarat"

    try:
        client.delete_collection(name=collection_name)
    except Exception:
        pass
    collection = client.create_collection(name=collection_name)

    grouped = {}
    for r in data:
        p = str(r.get('B', '')).strip()
        req_name = str(r.get('C', '')).strip()
        req_desc = str(r.get('D', '')).strip()
        file_type = str(r.get('E', '')).strip()
        
        if not p: continue
        if p not in grouped: grouped[p] = []
        grouped[p].append((req_name, req_desc, file_type))

    documents = []
    metadatas = []
    ids = []

    doc_counter = 1
    for category, reqs in grouped.items():
        summary_text = f"Kategori Permohonan: {category}\nTotal Persyaratan: {len(reqs)}\n\nDaftar Persyaratan:\n"
        for idx, (name, desc, ftype) in enumerate(reqs, 1):
            summary_text += f"{idx}. {name}\n   - Keterangan: {desc}\n   - Format File: {ftype}\n"
        
        documents.append(summary_text)
        metadatas.append({
            "peruntukan": category,
            "doc_type": "category_summary",
            "req_count": len(reqs)
        })
        ids.append(f"cat_summary_{doc_counter}")
        doc_counter += 1

        for name, desc, ftype in reqs:
            item_text = f"Kategori: {category}\nNama Persyaratan: {name}\nKeterangan: {desc}\nFormat File: {ftype}"
            documents.append(item_text)
            metadatas.append({
                "peruntukan": category,
                "nama_persyaratan": name,
                "tipe_file": ftype,
                "doc_type": "single_requirement"
            })
            ids.append(f"req_item_{doc_counter}")
            doc_counter += 1

    collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
    print(f"Successfully indexed {len(documents)} document chunks in ChromaDB collection '{collection_name}'.")

def main():
    excel_path = find_excel_file()
    print(f"Target Excel file found at: {excel_path}")
    ingest_to_postgresql(excel_path)
    ingest_to_chromadb(excel_path)

if __name__ == "__main__":
    main()
