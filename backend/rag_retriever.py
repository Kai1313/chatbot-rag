import os
from pathlib import Path
from config import CHROMA_DB_DIR

def query_rag_syarat(user_query: str, top_k: int = 3) -> str:
    """
    Retrieves document requirements context from ChromaDB collection 'pbg_syarat'.
    """
    if not user_query.strip():
        return ""

    try:
        import chromadb
        os.makedirs(CHROMA_DB_DIR, exist_ok=True)
        client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        
        try:
            collection = client.get_collection(name="pbg_syarat")
        except Exception:
            return ""

        results = collection.query(
            query_texts=[user_query],
            n_results=top_k
        )

        documents = results.get("documents", [[]])[0]
        if not documents:
            return ""

        formatted_context = "=== KONTEKS PERSYARATAN PBG ===\n" + "\n\n".join(documents)
        return formatted_context

    except Exception as exc:
        print(f"RAG retrieval warning: {exc}")
        return ""
