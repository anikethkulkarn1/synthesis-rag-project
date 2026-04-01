# Synthesis — RAG Research Paper Generator

A full-stack application that ingests academic survey papers (PDFs), extracts text and figures using RAG, and synthesizes a structured research paper using an LLM.

Upload 5-10 survey papers → enter a research topic → get a fully cited, multi-section academic paper generated from your sources.

---

## Demo

- Drag and drop PDFs into the upload zone
- Papers are chunked, embedded, and stored in a local vector database
- Enter a research topic and your API key
- The system retrieves the most relevant text chunks and figures across all papers
- An LLM synthesizes them into a structured research paper with citations

---

## Architecture
```
React Frontend (localhost:3000)
        │
        │ HTTP / SSE
        ▼
FastAPI Backend (localhost:8000)
        │
        ├── pdf_ingestion.py   → pdfplumber (text) + PyMuPDF (images)
        ├── rag_pipeline.py    → ChromaDB vector store + retrieval
        └── paper_generator.py → LLM prompt construction + generation
```

### How it works

**Ingestion (on upload)**
1. `pdfplumber` extracts text page by page
2. Text is split into 800-word chunks with 150-word overlap
3. `PyMuPDF` extracts embedded raster images, filtered by minimum dimensions
4. Captions are detected using regex patterns near each image
5. Text chunks and image chunks are embedded and stored in ChromaDB

**Retrieval (on generate)**
1. 4 sub-queries run against the topic: raw topic, methodology, results, challenges
2. Results are deduplicated by chunk ID and ranked by cosine similarity
3. Top 12 text chunks and top 5 figures are selected

**Generation**
1. Retrieved chunks are assembled into a structured prompt
2. The LLM synthesizes a formal academic paper with Abstract, sections, and References
3. Response streams back to the frontend via Server-Sent Events (SSE)

---

## Project Structure
```
rag-sandbox/
├── pdf_ingestion.py       # PDF → text chunks + image chunks
├── rag_pipeline.py        # ChromaDB indexing + semantic retrieval
├── paper_generator.py     # LLM prompt construction + generation
├── main.py                # FastAPI app — all endpoints
├── layer4_endtoend.py     # CLI test script — runs full pipeline
├── .env                   # API keys (never commit this)
├── .env.example           # Template for environment variables
├── .gitignore
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Full React UI (single file)
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   └── package.json
└── storage/
    ├── chroma/            # ChromaDB persistent vector store
    ├── images/            # Extracted figure images
    └── uploads/           # Uploaded PDFs
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone the repository
```bash
git clone https://github.com/anikethkulkarn1/synthesis-rag-project.git
cd synthesis-rag-project
```

### 2. Set up environment variables
```bash
Open `.env` and add your API key:
```
GROQ_API_KEY=your-groq-key-here
```

### 3. Install Python dependencies
```bash
pip install fastapi uvicorn python-multipart pymupdf pdfplumber chromadb groq pillow python-dotenv sentence-transformers
```

### 4. Start the backend
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### 5. Install and start the frontend in a new terminal
```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

---

## Usage

1. Open `http://localhost:3000`
2. Drag and drop your PDF survey papers into the upload zone
3. Wait for each paper to be indexed (chunk count appears in sidebar)
4. Select the papers you want to use with the checkboxes
5. Enter a research topic in the topic field
6. Enter your Groq API key (or set it in `.env` to skip this)
7. Click **Generate Paper**
8. The paper streams in word by word — retrieved figures appear on the right

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + index stats |
| GET | `/stats` | Text and image chunk counts |
| POST | `/upload` | Upload PDFs (multipart/form-data) |
| GET | `/papers` | List all indexed papers |
| DELETE | `/papers/{paper_id}` | Remove a paper from the index |
| POST | `/generate` | Generate paper (SSE streaming) |
| GET | `/retrieved-context` | Preview retrieval without generating |
| GET | `/images/{filename}` | Serve extracted figure images |

---

## Key Design Decisions

**800-word chunks with 150-word overlap**
Balances retrieval precision with context. Overlap ensures sentences at chunk boundaries appear in both adjacent chunks so retrieval never misses them.

**Image-aware RAG**
Most RAG demos are text-only. Here, images are extracted from PDFs and their captions and surrounding text are embedded. At generation time, relevant figures are sent as base64 image blocks alongside text context so the LLM can reference them inline.

**Multi-query retrieval**
A single query biases toward one aspect of the topic. Four sub-queries run in parallel and results are deduplicated — giving the LLM balanced coverage across all paper sections.

**Local embeddings**
ChromaDB uses `all-MiniLM-L6-v2` via sentence-transformers. Runs fully locally — no embedding API calls, no cost, no latency.

**SSE streaming**
Generation responses stream token by token via Server-Sent Events so users see the paper appear in real time rather than waiting 30-60 seconds for a complete response.

---

## Potential Extensions

- **Re-ranking** — add a cross-encoder re-ranker after initial retrieval for higher precision
- **Citation verification** — parse real author/year citations from PDFs instead of relying on LLM generation
- **Export to DOCX** — use `python-docx` to produce a formatted downloadable Word document
- **Multimodal embeddings** — use CLIP or SigLIP to embed images directly rather than just their captions
- **Table extraction** — use `pdfplumber` to extract and include data tables in the LLM context
- **Score threshold** — filter out retrieved chunks below a minimum similarity score

---

## Troubleshooting

**Backend won't start**
Make sure you're running from the `rag-sandbox` directory, not the `frontend` folder.

**Papers not appearing after upload**
Check the backend terminal for ingestion errors. Some PDFs with unusual encodings may fail text extraction.

**Generate button does nothing**
Make sure your Groq API key is entered in the API key field or set in `.env`. Check the browser console (F12) for errors.

**Images not showing in the figures panel**
The figures panel populates after clicking Generate. Images below 100x100px are filtered out during ingestion.

## Questions to try out
1. machine learning and deep learning approaches for network intrusion detection systems
2. feature selection algorithms for anomaly based intrusion detection
3. machine learning techniques for network intrusion detection
4. swarm intelligence and bio-inspired approaches for intrusion detection systems
