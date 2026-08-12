import time
import os
import subprocess
from sqlalchemy import create_engine

def main():
    db_url = os.getenv("DATABASE_URL", "postgresql://local_user:local_password@db:5432/local_db")
    print(f"Connecting to database: {db_url}")
    engine = create_engine(db_url)

    connected = False
    for i in range(20):
        try:
            conn = engine.connect()
            conn.close()
            connected = True
            print("PostgreSQL connection established successfully!")
            break
        except Exception as e:
            print(f"Waiting for PostgreSQL db... ({i+1}/20): {e}")
            time.sleep(2)

    if connected:
        try:
            from ingest import main as run_ingestion
            run_ingestion()
        except Exception as e:
            print(f"Ingestion notice: {e}")

    print("Starting FastAPI Uvicorn server...")
    subprocess.run(["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"])

if __name__ == "__main__":
    main()
