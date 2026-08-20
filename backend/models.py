from sqlalchemy import Column, Integer, Float, String, Text, DateTime
from database import Base

class Transaksi(Base):
    """
    SQLAlchemy model representing workflow tracking logs and ticket history.
    Populated from workflow tracking dataset (e.g. sample_dataset.xlsx or custom dataset).
    """
    __tablename__ = "transaksi"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    no_urut = Column(Float, nullable=True)
    no_daftar = Column(String(50), index=True, nullable=False)
    tahun_daftar = Column(Integer, nullable=True)
    peruntukan = Column(Text, nullable=True)
    tgl_menerima = Column(DateTime, nullable=True)
    tgl_pemrosesan = Column(DateTime, nullable=True)
    tgl_batas_waktu = Column(DateTime, nullable=True)
    target_lama_menit = Column(Float, nullable=True)
    lama_pemrosesan_menit = Column(Float, nullable=True)
    nama_pemroses = Column(String(255), nullable=True)
    dari_tahap = Column(Text, nullable=True)
    menuju_tahap = Column(Text, nullable=True)
    keterangan_proses = Column(Text, nullable=True)
    status_waktu = Column(String(50), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "no_urut": self.no_urut,
            "no_daftar": self.no_daftar,
            "tahun_daftar": self.tahun_daftar,
            "peruntukan": self.peruntukan,
            "tgl_menerima": self.tgl_menerima.isoformat() if self.tgl_menerima else None,
            "tgl_pemrosesan": self.tgl_pemrosesan.isoformat() if self.tgl_pemrosesan else None,
            "tgl_batas_waktu": self.tgl_batas_waktu.isoformat() if self.tgl_batas_waktu else None,
            "target_lama_menit": self.target_lama_menit,
            "lama_pemrosesan_menit": self.lama_pemrosesan_menit,
            "nama_pemroses": self.nama_pemroses,
            "dari_tahap": self.dari_tahap,
            "menuju_tahap": self.menuju_tahap,
            "keterangan_proses": self.keterangan_proses,
            "status_waktu": self.status_waktu,
        }
