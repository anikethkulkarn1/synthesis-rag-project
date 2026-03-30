from groq import Groq
import base64
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

MODEL = "llama-3.3-70b-versatile"
MAX_TOKENS = 8192


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

    user_content = f"Write a comprehensive research paper on: **{topic}**\n\n"
    user_content += "--- SOURCE TEXT EXCERPTS ---\n"

    papers_seen = {}
    for chunk in text_chunks:
        pt = chunk["paper_title"]
        if pt not in papers_seen:
            papers_seen[pt] = chunk["paper_id"]
            user_content += f"\n### From: {pt}\n"
        user_content += f"[Section: {chunk.get('section', 'N/A')}, Page {chunk['page']}]\n{chunk['content']}\n"

    user_content += "\n---\n\nNow write the full academic research paper. Begin with the title and abstract."

    return system_prompt, user_content


def generate_paper_sync(retrieved, api_key=None):
    client = Groq(api_key=api_key or os.environ.get("GROQ_API_KEY"))
    system_prompt, user_content = _build_prompt(retrieved)

    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
    )
    return response.choices[0].message.content