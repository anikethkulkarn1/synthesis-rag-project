import chromadb
from chromadb.utils import embedding_functions
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

CHROMA_PATH = "storage/chroma"
TEXT_COLLECTION = "text_chunks"
IMAGE_COLLECTION = "image_chunks"

_EMBEDDING_FN = embedding_functions.DefaultEmbeddingFunction()


class RAGPipeline:
    def __init__(self, persist_directory=CHROMA_PATH):
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.text_col = self.client.get_or_create_collection(
            name=TEXT_COLLECTION,
            embedding_function=_EMBEDDING_FN,
            metadata={"hnsw:space": "cosine"},
        )
        self.image_col = self.client.get_or_create_collection(
            name=IMAGE_COLLECTION,
            embedding_function=_EMBEDDING_FN,
            metadata={"hnsw:space": "cosine"},
        )

    def index_paper(self, ingested):
        text_chunks = ingested["text_chunks"]
        image_chunks = ingested["image_chunks"]

        if text_chunks:
            self.text_col.upsert(
                ids=[c["id"] for c in text_chunks],
                documents=[c["content"] for c in text_chunks],
                metadatas=[
                    {
                        "paper_id": c["paper_id"],
                        "paper_title": c["paper_title"],
                        "page": c["page"],
                        "chunk_index": c["chunk_index"],
                        "section": c["section"],
                        "type": "text",
                    }
                    for c in text_chunks
                ],
            )

        if image_chunks:
            self.image_col.upsert(
                ids=[c["id"] for c in image_chunks],
                documents=[c["content"] for c in image_chunks],
                metadatas=[
                    {
                        "paper_id": c["paper_id"],
                        "paper_title": c["paper_title"],
                        "page": c["page"],
                        "figure_label": c["figure_label"],
                        "caption": c["caption"],
                        "image_path": c["image_path"],
                        "type": "image",
                    }
                    for c in image_chunks
                ],
            )

        return {"text": len(text_chunks), "images": len(image_chunks)}

    def retrieve_text(self, query, n_results=10, paper_ids=None):
        where = {"paper_id": {"$in": paper_ids}} if paper_ids else None
        try:
            results = self.text_col.query(
                query_texts=[query],
                n_results=min(n_results, self.text_col.count() or 1),
                where=where,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.warning(f"Text retrieval failed: {e}")
            return []

        chunks = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append({"content": doc, "score": 1 - dist, **meta})
        return chunks

    def retrieve_images(self, query, n_results=6, paper_ids=None):
        where = {"paper_id": {"$in": paper_ids}} if paper_ids else None
        try:
            results = self.image_col.query(
                query_texts=[query],
                n_results=min(n_results, self.image_col.count() or 1),
                where=where,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.warning(f"Image retrieval failed: {e}")
            return []

        images = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            images.append({"content": doc, "score": 1 - dist, **meta})
        return images

    def retrieve_for_generation(self, topic, paper_ids=None, text_n=12, image_n=5):
        sub_queries = [
            topic,
            f"{topic} methodology approach",
            f"{topic} results findings evaluation",
            f"{topic} challenges limitations future work",
        ]

        seen_ids = set()
        all_text = []
        for q in sub_queries:
            for chunk in self.retrieve_text(q, n_results=text_n // 2, paper_ids=paper_ids):
                chunk_id = f"{chunk['paper_id']}_{chunk['chunk_index']}"
                if chunk_id not in seen_ids:
                    seen_ids.add(chunk_id)
                    all_text.append(chunk)

        all_text.sort(key=lambda x: x["score"], reverse=True)
        all_text = all_text[:text_n]
        images = self.retrieve_images(topic, n_results=image_n, paper_ids=paper_ids)

        return {"topic": topic, "text_chunks": all_text, "images": images}

    def list_papers(self):
        if self.text_col.count() == 0:
            return []
        results = self.text_col.get(include=["metadatas"])
        seen = {}
        for meta in results["metadatas"]:
            pid = meta["paper_id"]
            if pid not in seen:
                seen[pid] = {"paper_id": pid, "paper_title": meta["paper_title"]}
        return list(seen.values())

    def delete_paper(self, paper_id):
        self.text_col.delete(where={"paper_id": paper_id})
        self.image_col.delete(where={"paper_id": paper_id})

    def stats(self):
        return {
            "text_chunks": self.text_col.count(),
            "image_chunks": self.image_col.count(),
        }