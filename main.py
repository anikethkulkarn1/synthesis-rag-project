import os
import shutil
import asyncio
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from pdf_ingestion import ingest_pdf
from rag_pipeline import RAGPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("storage/uploads")
IMAGE_DIR = Path("storage/images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="RAG Research Paper Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/images", StaticFiles(directory=str(IMAGE_DIR)), name="images")

rag = RAGPipeline()


class GenerateRequest(BaseModel):
    topic: str
    paper_ids: Optional[List[str]] = None
    api_key: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok", **rag.stats()}


@app.get("/stats")
def stats():
    return rag.stats()


@app.post("/upload")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    results = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} is not a PDF")

        dest = UPLOAD_DIR / file.filename
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)

        try:
            ingested = await asyncio.get_event_loop().run_in_executor(
                None, ingest_pdf, str(dest)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ingestion error: {e}")

        counts = rag.index_paper(ingested)

        results.append({
            "paper_id": ingested["paper_id"],
            "paper_title": ingested["paper_title"],
            "text_chunks": counts["text"],
            "images": counts["images"],
            "message": f"Successfully indexed '{ingested['paper_title']}'"
        })

    return results


@app.get("/papers")
def list_papers():
    return rag.list_papers()


@app.delete("/papers/{paper_id}")
def delete_paper(paper_id: str):
    rag.delete_paper(paper_id)
    return {"deleted": paper_id}


@app.get("/retrieved-context")
def get_context(topic: str, text_n: int = 8, image_n: int = 4):
    retrieved = rag.retrieve_for_generation(topic=topic, text_n=text_n, image_n=image_n)
    return {
        "topic": topic,
        "text_chunks": [
            {"score": c["score"], "page": c["page"], "section": c["section"], "preview": c["content"][:200]}
            for c in retrieved["text_chunks"]
        ],
        "images": retrieved["images"]
    }