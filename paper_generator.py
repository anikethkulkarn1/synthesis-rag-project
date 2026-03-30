from google import genai
import base64
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

MODEL = "gemini-2.0-flash"
MAX_TOKENS = 8192


def _encode_image(image_path):
    with open(image_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


def _build_prompt(retrieved):
    topic = retrieved["topic"]
    text_chunks = retrieved["text_chunks"]
    images = retrieved["images"]

    system_prompt = """You are a senior AI researcher writing a formal academic survey paper.
Synthesize the provided text excerpts into a coherent, well-structured research paper.

Guidelines:
- Write in formal academic English
- Structure: Abstract, 1. Introduction, 2. Background, 3. Methodology, 4. Results & Analysis, 5. Discussion, 6. Conclusion, References
- Cite sources inline as [AuthorYear]
- Draw insights and comparisons across the content
- Aim for 1500-2500 words
- End with a References section"""

    prompt_parts = [system_prompt]

    prompt_parts.append(
        f"\n\nWrite a comprehensive research paper on: **{topic}**\n\n"
        "--- SOURCE TEXT EXCERPTS ---\n"
    )

    papers_seen = {}
    for chunk in text_chunks:
        pt = chunk["paper_title"]
        if pt not in papers_seen:
            papers_seen[pt] = chunk["paper_id"]
            prompt_parts.append(f"\n### From: {pt}\n")
        prompt_parts.append(
            f"[Section: {chunk.get('section', 'N/A')}, Page {chunk['page']}]\n{chunk['content']}\n"
        )

    if images:
        prompt_parts.append("\n--- FIGURES FROM PAPERS ---\n")
        for img in images:
            img_path = img.get("image_path", "")
            if not img_path or not Path(img_path).exists():
                continue
            caption = img.get("caption", "No caption available")
            figure_label = img.get("figure_label", "?")
            prompt_parts.append(f"\nFigure {figure_label}: {caption}\n")
            try:
                img_data = _encode_image(img_path)
                prompt_parts.append({
                    "mime_type": "image/png",
                    "data": img_data
                })
            except Exception as e:
                logger.warning(f"Could not load image {img_path}: {e}")

    prompt_parts.append(
        "\n---\n\nNow write the full academic research paper. Begin with the title and abstract."
    )

    return prompt_parts


def generate_paper_sync(retrieved, api_key=None):
    client = genai.Client(api_key=api_key or os.environ.get("AIzaSyD6QRKlmdosazSSqatvCQSyFz3Voe3KdGI"))
    prompt_parts = _build_prompt(retrieved)
    text_parts = [p if isinstance(p, str) else "" for p in prompt_parts]
    prompt = "\n".join(text_parts)
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )
    return response.text