import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

class StorageProvider:
    """Abstract base storage provider interface."""
    def list_documents(self, registration_id: str, base_url: str = "") -> Dict[str, Any]:
        raise NotImplementedError

class LocalStorageProvider(StorageProvider):
    """Local / Self-hosted storage provider using local directory / Docker volume."""
    
    def __init__(self, base_path: Optional[str] = None):
        if base_path:
            self.base_dir = Path(base_path)
        else:
            # Common paths for local dev and Docker container
            candidates = [
                Path("/app/data/documents"),
                Path(__file__).parent.parent / "data" / "documents",
                Path(__file__).parent / "data" / "documents",
                Path("./data/documents"),
            ]
            self.base_dir = Path("./data/documents")
            for c in candidates:
                if c.exists():
                    self.base_dir = c
                    break

    def list_documents(self, registration_id: str, base_url: str = "") -> Dict[str, Any]:
        reg_id = str(registration_id).strip()
        if reg_id.endswith('.0'):
            reg_id = reg_id[:-2]

        folder_path = self.base_dir / reg_id
        if not folder_path.exists() or not folder_path.is_dir():
            return {
                "status": "Tidak ditemukan",
                "registration_id": reg_id,
                "provider": "local",
                "message": f"Berkas / dokumen untuk nomor pendaftaran '{reg_id}' tidak ditemukan di brangkas penyimpanan.",
                "files": []
            }

        files_info: List[Dict[str, Any]] = []
        for file in sorted(folder_path.iterdir()):
            if file.is_file():
                ext = file.suffix.lower()
                mime_type = "application/octet-stream"
                category = "Dokumen"

                if ext == ".pdf":
                    mime_type = "application/pdf"
                    category = "Sertifikat / Surat Keputusan (SK)" if "sk" in file.name.lower() else "Dokumen Teknis / Administrasi"
                elif ext in [".jpg", ".jpeg", ".png", ".webp"]:
                    mime_type = f"image/{ext[1:]}"
                    category = "Foto / Dokumentasi Lokasi"
                elif ext == ".dwg":
                    mime_type = "application/acad"
                    category = "Gambar Rencana AutoCAD (DWG)"

                file_size_kb = round(file.stat().st_size / 1024, 1)
                
                # Format download & preview URL
                api_prefix = base_url.rstrip("/") if base_url else ""
                file_url = f"{api_prefix}/storage/documents/{reg_id}/{file.name}"

                files_info.append({
                    "name": file.name,
                    "extension": ext,
                    "mimeType": mime_type,
                    "category": category,
                    "size_kb": file_size_kb,
                    "view_url": file_url,
                    "download_url": file_url,
                    "is_image": ext in [".jpg", ".jpeg", ".png", ".webp"],
                    "is_pdf": ext == ".pdf",
                    "is_cad": ext == ".dwg"
                })

        if not files_info:
            return {
                "status": "Kosong",
                "registration_id": reg_id,
                "provider": "local",
                "message": f"Folder brangkas nomor '{reg_id}' ditemukan, tetapi belum ada file lampiran.",
                "files": []
            }

        return {
            "status": "Ditemukan",
            "registration_id": reg_id,
            "provider": "local",
            "total_files": len(files_info),
            "message": f"Ditemukan {len(files_info)} file dokumen/gambar untuk berkas nomor '{reg_id}'.",
            "files": files_info
        }

class GoogleDriveStorageProvider(StorageProvider):
    """Optional Google Drive cloud storage provider."""
    
    def __init__(self, credentials_path: Optional[str] = None, folder_id: Optional[str] = None):
        self.credentials_path = credentials_path or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "./credentials.json")
        self.parent_folder_id = folder_id or os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")

    def list_documents(self, registration_id: str, base_url: str = "") -> Dict[str, Any]:
        reg_id = str(registration_id).strip()
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            if not os.path.exists(self.credentials_path):
                return {
                    "status": "error",
                    "message": "File Google Drive credentials.json tidak ditemukan."
                }

            creds = service_account.Credentials.from_service_account_file(
                self.credentials_path, scopes=['https://www.googleapis.com/auth/drive.readonly']
            )
            service = build('drive', 'v3', credentials=creds, cache_discovery=False)

            # Search subfolder matching registration_id
            query = f"name = '{reg_id}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            if self.parent_folder_id:
                query += f" and '{self.parent_folder_id}' in parents"
                
            results = service.files().list(q=query, fields="files(id, name)").execute()
            folders = results.get('files', [])

            if not folders:
                return {
                    "status": "Tidak ditemukan",
                    "registration_id": reg_id,
                    "provider": "gdrive",
                    "message": f"Folder Google Drive untuk nomor {reg_id} tidak ditemukan.",
                    "files": []
                }

            folder_id = folders[0]['id']
            file_results = service.files().list(
                q=f"'{folder_id}' in parents and trashed = false",
                fields="files(id, name, mimeType, webViewLink, thumbnailLink)"
            ).execute()
            
            drive_files = file_results.get('files', [])
            files_info = []
            for f in drive_files:
                files_info.append({
                    "name": f.get("name"),
                    "mimeType": f.get("mimeType"),
                    "view_url": f.get("webViewLink"),
                    "thumbnail_url": f.get("thumbnailLink", ""),
                    "is_image": "image" in str(f.get("mimeType", "")),
                    "is_pdf": "pdf" in str(f.get("mimeType", ""))
                })

            return {
                "status": "Ditemukan",
                "registration_id": reg_id,
                "provider": "gdrive",
                "total_files": len(files_info),
                "message": f"Ditemukan {len(files_info)} file di Google Drive untuk nomor '{reg_id}'.",
                "files": files_info
            }
        except Exception as e:
            return {
                "status": "error",
                "provider": "gdrive",
                "message": f"Gagal mengakses Google Drive: {str(e)}",
                "files": []
            }

def get_storage_provider() -> StorageProvider:
    """Factory to instantiate the configured storage provider."""
    provider_type = os.environ.get("STORAGE_PROVIDER", "local").lower().strip()
    if provider_type == "gdrive":
        return GoogleDriveStorageProvider()
    return LocalStorageProvider()
