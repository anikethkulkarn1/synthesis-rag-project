import fitz
import pdfplumber
import base64
import hashlib
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

CHUNK_SIZE = 800
CHUNK_OVERLAP = 150
MIN_IMAGE_WIDTH = 100
MIN_IMAGE_HEIGHT = 100
IMAGE_OUTPUT_DIR = Path("storage/images")
IMAGE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def make_text_chunk(text, paper_id, paper_title, page, chunk_index, section=None):
    return {
        "id": f"{paper_id}_text_{chunk_index}",
        "type": "text",
        "content": text,
        "paper_id": paper_id,
        "paper_title": paper_title,
        "page": page,
        "chunk_index": chunk_index,
        "section": section or "Unknown",
    }

def make_image_chunk(image_path, caption, paper_id, paper_title, page, figure_label, surrounding_text):
    return {
        "id": f"{paper_id}_img_{page}_{figure_label}",
        "type": "image",
        "image_path": image_path,
        "caption": caption,
        "paper_id": paper_id,
        "paper_title": paper_title,
        "page": page,
        "figure_label": figure_label,
        "surrounding_text": surrounding_text,
        "content": f"Figure {figure_label}: {caption}. Context: {surrounding_text[:300]}",
    }

def detect_section(text):
    patterns = [
        r"^\d+\.\s+([A-Z][A-Za-z\s]+)",
        r"^([A-Z][A-Z\s]{3,})\s*$",
        r"^(Abstract|Introduction|Related Work|Methodology|Experiments|Results|Discussion|Conclusion|References)\b",
    ]
    for line in text.split("\n")[:5]:
        line = line.strip()
        for pattern in patterns:
            m = re.match(pattern, line)
            if m:
                return m.group(1).strip()
    return None

def split_into_chunks(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk_words = words[i : i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap
    return [c for c in chunks if len(c.strip()) > 50]

def extract_caption_near_image(page_text, image_y, page_height):
    caption_patterns = [
        r"(Fig(?:ure)?\.?\s*\d+[a-z]?[\.:]\s*.{10,200})",
        r"(Table\s*\d+[\.:]\s*.{10,200})",
    ]
    for pattern in caption_patterns:
        matches = re.findall(pattern, page_text, re.IGNORECASE)
        if matches:
            return matches[0].strip()
    return ""

def ingest_pdf(pdf_path, paper_title=None):
    pdf_path = Path(pdf_path)
    paper_id = hashlib.md5(pdf_path.name.encode()).hexdigest()[:12]
    paper_title = paper_title or pdf_path.stem.replace("_", " ").replace("-", " ").title()

    text_chunks = []
    image_chunks = []

    full_text_by_page = {}
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            raw = page.extract_text(x_tolerance=2, y_tolerance=2) or ""
            full_text_by_page[page_num] = raw

    accumulated = ""
    current_page = 1
    current_section = None
    chunk_index = 0

    for page_num, page_text in full_text_by_page.items():
        detected = detect_section(page_text)
        if detected:
            current_section = detected
        accumulated += "\n" + page_text
        current_page = page_num
        if len(accumulated.split()) >= CHUNK_SIZE:
            for chunk_text in split_into_chunks(accumulated):
                text_chunks.append(make_text_chunk(chunk_text, paper_id, paper_title, current_page, chunk_index, current_section))
                chunk_index += 1
            accumulated = ""

    if accumulated.strip():
        for chunk_text in split_into_chunks(accumulated):
            text_chunks.append(make_text_chunk(chunk_text, paper_id, paper_title, current_page, chunk_index, current_section))
            chunk_index += 1

    doc = fitz.open(str(pdf_path))
    for page_num in range(len(doc)):
        page = doc[page_num]
        page_text = full_text_by_page.get(page_num + 1, "")
        page_height = page.rect.height
        for img_index, img_info in enumerate(page.get_images(full=True)):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
            except:
                continue
            width = base_image.get("width", 0)
            height = base_image.get("height", 0)
            if width < MIN_IMAGE_WIDTH or height < MIN_IMAGE_HEIGHT:
                continue
            try:
                pil_img = Image.open(io.BytesIO(base_image["image"])).convert("RGB")
            except:
                continue
            img_filename = f"{paper_id}_p{page_num + 1}_i{img_index}.png"
            img_save_path = IMAGE_OUTPUT_DIR / img_filename
            pil_img.save(str(img_save_path), "PNG")
            img_rects = page.get_image_rects(xref)
            img_y = img_rects[0].y0 if img_rects else page_height / 2
            caption = extract_caption_near_image(page_text, img_y, page_height)
            figure_label = f"{page_num + 1}.{img_index + 1}"
            surrounding_text = page_text[:500] if page_text else ""
            image_chunks.append(make_image_chunk(str(img_save_path), caption, paper_id, paper_title, page_num + 1, figure_label, surrounding_text))
    doc.close()

    return {
        "paper_id": paper_id,
        "paper_title": paper_title,
        "text_chunks": text_chunks,
        "image_chunks": image_chunks,
    }

def image_to_base64(image_path):
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")