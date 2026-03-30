import { useState, useRef, useEffect, useCallback } from "react";

const API = "http://localhost:8000";

// ── Palette & tokens ──────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,300&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0c0d0f;
    --bg2: #131418;
    --bg3: #1a1c22;
    --border: #2a2d35;
    --border2: #363a45;
    --text: #e8eaf0;
    --text2: #9096a8;
    --text3: #5a6070;
    --accent: #c8a96e;
    --accent2: #8fb3ff;
    --accent3: #7ecba1;
    --danger: #e07070;
    --serif: 'Fraunces', Georgia, serif;
    --mono: 'IBM Plex Mono', monospace;
    --sans: 'Inter', sans-serif;
    --radius: 6px;
  }

  html, body, #root { height: 100%; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  .app {
    display: grid;
    grid-template-columns: 320px 1fr;
    grid-template-rows: 56px 1fr;
    height: 100vh;
    overflow: hidden;
  }

  /* Header */
  .header {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 24px;
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
  }
  .header-logo {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 18px;
    color: var(--accent);
    letter-spacing: -0.3px;
  }
  .header-sub {
    font-size: 12px;
    color: var(--text3);
    font-family: var(--mono);
  }
  .header-stats {
    margin-left: auto;
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .stat-badge {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text3);
    background: var(--bg3);
    padding: 3px 8px;
    border-radius: 20px;
    border: 1px solid var(--border);
  }
  .stat-badge span { color: var(--accent2); }

  /* Sidebar */
  .sidebar {
    background: var(--bg2);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .sidebar-section {
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }
  .sidebar-title {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 12px;
  }

  /* Drop zone */
  .drop-zone {
    border: 1.5px dashed var(--border2);
    border-radius: var(--radius);
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .drop-zone:hover, .drop-zone.drag-over {
    border-color: var(--accent);
    background: rgba(200, 169, 110, 0.04);
  }
  .drop-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .drop-zone-icon { font-size: 24px; margin-bottom: 6px; }
  .drop-zone-text { font-size: 12px; color: var(--text2); }
  .drop-zone-sub { font-size: 11px; color: var(--text3); margin-top: 3px; }

  /* Upload progress */
  .upload-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg3);
    border-radius: var(--radius);
    margin-top: 8px;
    font-size: 12px;
    color: var(--text2);
  }
  .spinner {
    width: 14px; height: 14px;
    border: 2px solid var(--border2);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Paper list */
  .papers-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  .paper-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 10px;
    border-radius: var(--radius);
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 4px;
  }
  .paper-item:hover { background: var(--bg3); border-color: var(--border); }
  .paper-item.selected { background: rgba(143, 179, 255, 0.08); border-color: rgba(143,179,255,0.25); }
  .paper-checkbox {
    width: 14px; height: 14px;
    border: 1.5px solid var(--border2);
    border-radius: 3px;
    margin-top: 2px;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .paper-item.selected .paper-checkbox {
    background: var(--accent2);
    border-color: var(--accent2);
  }
  .paper-check-inner { width: 6px; height: 6px; background: white; border-radius: 1px; }
  .paper-meta { flex: 1; min-width: 0; }
  .paper-title { font-size: 12px; color: var(--text); line-height: 1.4; margin-bottom: 3px; }
  .paper-chips { display: flex; gap: 5px; flex-wrap: wrap; }
  .chip {
    font-family: var(--mono);
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
    border: 1px solid var(--border);
    color: var(--text3);
  }
  .chip.text { color: var(--accent3); border-color: rgba(126,203,161,0.3); }
  .chip.img { color: var(--accent); border-color: rgba(200,169,110,0.3); }
  .paper-delete {
    background: none; border: none; cursor: pointer;
    color: var(--text3); font-size: 14px; padding: 0 4px;
    transition: color 0.15s; flex-shrink: 0;
  }
  .paper-delete:hover { color: var(--danger); }
  .no-papers { text-align: center; padding: 24px 16px; color: var(--text3); font-size: 12px; }

  /* Main area */
  .main {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
  }

  /* Topic bar */
  .topic-bar {
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }
  .topic-field { flex: 1; }
  .topic-label {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 6px;
  }
  .topic-input {
    width: 100%;
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--serif);
    font-size: 15px;
    font-weight: 300;
    padding: 10px 14px;
    outline: none;
    transition: border-color 0.15s;
  }
  .topic-input:focus { border-color: var(--accent); }
  .topic-input::placeholder { color: var(--text3); font-style: italic; }

  .api-field { width: 220px; }
  .api-input {
    width: 100%;
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    color: var(--text2);
    font-family: var(--mono);
    font-size: 12px;
    padding: 10px 14px;
    outline: none;
    transition: border-color 0.15s;
  }
  .api-input:focus { border-color: var(--border2); }
  .api-input::placeholder { color: var(--text3); }

  .generate-btn {
    background: var(--accent);
    color: #1a1000;
    border: none;
    border-radius: var(--radius);
    padding: 10px 20px;
    font-family: var(--sans);
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    display: flex; align-items: center; gap: 8px;
  }
  .generate-btn:hover { background: #dbbf82; }
  .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .generate-btn.generating { background: var(--bg3); color: var(--text2); border: 1px solid var(--border2); }

  /* Output area */
  .output-area {
    flex: 1;
    overflow: hidden;
    display: flex;
  }

  .paper-output {
    flex: 1;
    overflow-y: auto;
    padding: 40px 56px;
    max-width: 860px;
    margin: 0 auto;
    width: 100%;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text3);
    text-align: center;
  }
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.4;
  }
  .empty-title {
    font-family: var(--serif);
    font-size: 20px;
    color: var(--text2);
    margin-bottom: 8px;
    font-weight: 300;
  }
  .empty-sub { font-size: 13px; max-width: 320px; }

  /* Markdown paper styles */
  .paper-content { font-family: var(--serif); font-weight: 300; line-height: 1.85; }
  .paper-content h1 {
    font-family: var(--serif); font-weight: 600; font-size: 26px;
    color: var(--text); margin-bottom: 12px; line-height: 1.3;
  }
  .paper-content h2 {
    font-family: var(--serif); font-weight: 600; font-size: 18px;
    color: var(--text); margin: 36px 0 12px; padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
  }
  .paper-content h3 { font-size: 15px; margin: 24px 0 8px; color: var(--accent2); font-weight: 500; font-family: var(--sans); }
  .paper-content p { color: var(--text2); margin-bottom: 16px; font-size: 15px; }
  .paper-content strong { color: var(--text); font-weight: 600; }
  .paper-content em { color: var(--accent); font-style: italic; }
  .paper-content code { font-family: var(--mono); font-size: 12px; background: var(--bg3); padding: 1px 5px; border-radius: 3px; color: var(--accent3); }
  .paper-content blockquote { border-left: 3px solid var(--accent); padding-left: 16px; margin: 16px 0; color: var(--text3); font-style: italic; }
  .paper-content ul, .paper-content ol { color: var(--text2); padding-left: 20px; margin-bottom: 16px; font-size: 15px; }
  .paper-content li { margin-bottom: 4px; }

  /* Cursor blink during streaming */
  .streaming-cursor {
    display: inline-block;
    width: 2px; height: 1em;
    background: var(--accent);
    animation: blink 1s step-end infinite;
    vertical-align: text-bottom;
    margin-left: 2px;
  }
  @keyframes blink { 50% { opacity: 0; } }

  /* Figure preview panel */
  .figure-panel {
    width: 260px;
    border-left: 1px solid var(--border);
    background: var(--bg2);
    overflow-y: auto;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }
  .figure-panel-title {
    padding: 12px 16px;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text3);
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; background: var(--bg2);
  }
  .figure-grid { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
  .figure-card { background: var(--bg3); border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); }
  .figure-card img { width: 100%; display: block; object-fit: cover; max-height: 160px; }
  .figure-card-meta { padding: 8px 10px; }
  .figure-card-label { font-family: var(--mono); font-size: 10px; color: var(--accent); margin-bottom: 3px; }
  .figure-card-caption { font-size: 11px; color: var(--text3); line-height: 1.4; }
  .no-figures { padding: 24px 16px; text-align: center; color: var(--text3); font-size: 12px; }

  /* Copy button */
  .copy-btn {
    background: var(--bg3); border: 1px solid var(--border2);
    color: var(--text2); padding: 6px 14px; border-radius: var(--radius);
    font-family: var(--mono); font-size: 11px; cursor: pointer;
    transition: all 0.15s; display: flex; align-items: center; gap: 6px;
  }
  .copy-btn:hover { border-color: var(--accent2); color: var(--accent2); }

  .toolbar {
    padding: 8px 56px;
    border-bottom: 1px solid var(--border);
    display: flex; gap: 8px; align-items: center;
    background: var(--bg2);
  }
  .toolbar-info { font-size: 11px; color: var(--text3); margin-left: auto; font-family: var(--mono); }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
`;

// ── Components ────────────────────────────────────────────────────────────────

function PaperItem({ paper, selected, onToggle, onDelete }) {
  return (
    <div
      className={`paper-item ${selected ? "selected" : ""}`}
      onClick={() => onToggle(paper.paper_id)}
    >
      <div className="paper-checkbox">
        {selected && <div className="paper-check-inner" />}
      </div>
      <div className="paper-meta">
        <div className="paper-title">{paper.paper_title}</div>
        <div className="paper-chips">
          {paper.text_chunks != null && (
            <span className="chip text">{paper.text_chunks} chunks</span>
          )}
          {paper.images != null && (
            <span className="chip img">🖼 {paper.images} figs</span>
          )}
        </div>
      </div>
      <button
        className="paper-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(paper.paper_id);
        }}
        title="Remove paper"
      >
        ×
      </button>
    </div>
  );
}

function FigurePanel({ images }) {
  if (!images || images.length === 0) {
    return (
      <div className="figure-panel">
        <div className="figure-panel-title">Retrieved Figures</div>
        <div className="no-figures">
          Figures used in generation will appear here
        </div>
      </div>
    );
  }
  return (
    <div className="figure-panel">
      <div className="figure-panel-title">
        Retrieved Figures ({images.length})
      </div>
      <div className="figure-grid">
        {images.map((img, i) => (
          <div className="figure-card" key={i}>
            <img
              src={`${API}/images/${img.image_path?.split("/").pop()}`}
              alt={img.caption || "Figure"}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="figure-card-meta">
              <div className="figure-card-label">
                Fig {img.figure_label} · {img.paper_title?.slice(0, 25)}
              </div>
              <div className="figure-card-caption">
                {img.caption?.slice(0, 100) || "No caption"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [papers, setPapers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [topic, setTopic] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [generating, setGenerating] = useState(false);
  const [paperText, setPaperText] = useState("");
  const [retrievedImages, setRetrievedImages] = useState([]);
  const [stats, setStats] = useState({ text_chunks: 0, image_chunks: 0 });
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const outputRef = useRef(null);
  const abortRef = useRef(null);

  // Load papers + stats on mount
  useEffect(() => {
    fetchPapers();
    fetchStats();
  }, []);

  // Auto-scroll during generation
  useEffect(() => {
    if (generating && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [paperText, generating]);

  async function fetchPapers() {
    try {
      const r = await fetch(`${API}/papers`);
      const data = await r.json();
      setPapers(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchStats() {
    try {
      const r = await fetch(`${API}/stats`);
      const data = await r.json();
      setStats(data);
    } catch (e) {}
  }

  async function handleUpload(files) {
    if (!files.length) return;
    setUploading(true);
    setUploadMsg(`Uploading ${files.length} file(s)...`);

    const formData = new FormData();
    for (const f of files) formData.append("files", f);

    try {
      const r = await fetch(`${API}/upload`, {
        method: "POST",
        body: formData,
      });
      const results = await r.json();

      if (!r.ok) throw new Error(results.detail || "Upload failed");

      setUploadMsg(`✓ Indexed ${results.length} paper(s)`);
      await fetchPapers();
      await fetchStats();
      // Auto-select newly uploaded papers
      setSelectedIds((prev) => {
        const next = new Set(prev);
        results.forEach((p) => next.add(p.paper_id));
        return next;
      });
      setTimeout(() => setUploadMsg(""), 3000);
    } catch (e) {
      setUploadMsg(`✗ ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  function togglePaper(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function deletePaper(id) {
    await fetch(`${API}/papers/${id}`, { method: "DELETE" });
    setPapers((p) => p.filter((x) => x.paper_id !== id));
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    await fetchStats();
  }

  async function handleGenerate() {
    if (!topic.trim()) return;
    if (generating) {
      abortRef.current?.abort();
      return;
    }

    setPaperText("");
    setRetrievedImages([]);
    setGenerating(true);

    // First fetch the context preview to know which images were used
    try {
      const ids = selectedIds.size > 0 ? [...selectedIds].join(",") : undefined;
      const ctxUrl = `${API}/retrieved-context?topic=${encodeURIComponent(topic)}&image_n=5${ids ? `&paper_ids=${ids}` : ""}`;
      const ctxR = await fetch(ctxUrl);
      const ctx = await ctxR.json();
      setRetrievedImages(ctx.images || []);
    } catch (e) {}

    // Then stream the generation
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const body = {
        topic,
        paper_ids: selectedIds.size > 0 ? [...selectedIds] : null,
        api_key: apiKey || undefined,
      };
      const r = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") {
            setGenerating(false);
            return;
          }
          if (payload.startsWith("[ERROR]")) {
            setPaperText(
              (prev) => prev + `\n\n> **Error:** ${payload.slice(7)}`,
            );
            setGenerating(false);
            return;
          }
          // Unescape newlines
          const text = payload.replace(/\\n/g, "\n");
          setPaperText((prev) => prev + text);
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setPaperText(
          (prev) => prev + `\n\n> **Connection error:** ${e.message}`,
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(paperText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const wordCount = paperText.split(/\s+/).filter(Boolean).length;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-logo">Synthesis</div>
          <div className="header-sub">RAG Research Paper Generator</div>
          <div className="header-stats">
            <span className="stat-badge">
              <span>{stats.text_chunks}</span> text chunks
            </span>
            <span className="stat-badge">
              <span>{stats.image_chunks}</span> figures
            </span>
            <span className="stat-badge">
              <span>{papers.length}</span> papers
            </span>
          </div>
        </header>

        {/* Sidebar */}
        <aside className="sidebar">
          {/* Upload */}
          <div className="sidebar-section">
            <div className="sidebar-title">Upload Papers</div>
            <div
              className={`drop-zone ${dragOver ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleUpload(
                  [...e.dataTransfer.files].filter((f) =>
                    f.name.endsWith(".pdf"),
                  ),
                );
              }}
            >
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={(e) => handleUpload([...e.target.files])}
              />
              <div className="drop-zone-icon">📄</div>
              <div className="drop-zone-text">
                Drop PDFs here or click to browse
              </div>
              <div className="drop-zone-sub">
                Survey papers, arXiv, journals
              </div>
            </div>
            {(uploading || uploadMsg) && (
              <div className="upload-progress">
                {uploading && <div className="spinner" />}
                <span>{uploadMsg}</span>
              </div>
            )}
          </div>

          {/* Paper list */}
          <div className="sidebar-section" style={{ paddingBottom: 8 }}>
            <div className="sidebar-title">
              Indexed Papers
              {selectedIds.size > 0 && (
                <span style={{ color: "var(--accent2)", marginLeft: 6 }}>
                  ({selectedIds.size} selected)
                </span>
              )}
            </div>
          </div>
          <div className="papers-list">
            {papers.length === 0 ? (
              <div className="no-papers">
                No papers indexed yet.
                <br />
                Upload PDFs to begin.
              </div>
            ) : (
              papers.map((p) => (
                <PaperItem
                  key={p.paper_id}
                  paper={p}
                  selected={selectedIds.has(p.paper_id)}
                  onToggle={togglePaper}
                  onDelete={deletePaper}
                />
              ))
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          {/* Topic bar */}
          <div className="topic-bar">
            <div className="topic-field">
              <div className="topic-label">Research Topic</div>
              <input
                className="topic-input"
                placeholder="e.g. Advances in vision-language models for medical imaging"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>
            <div className="api-field">
              <div className="topic-label">API Key</div>
              <input
                className="api-input"
                type="password"
                placeholder="Enter you API"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <button
              className={`generate-btn ${generating ? "generating" : ""}`}
              onClick={handleGenerate}
              disabled={!topic.trim() && !generating}
              style={{ alignSelf: "flex-end" }}
            >
              {generating ? (
                <>
                  <div
                    className="spinner"
                    style={{
                      width: 12,
                      height: 12,
                      borderTopColor: "var(--accent)",
                    }}
                  />
                  Stop
                </>
              ) : (
                <>"Generate Paper ↵"</>
              )}
            </button>
          </div>

          {/* Toolbar */}
          {paperText && (
            <div className="toolbar">
              <button className="copy-btn" onClick={copyToClipboard}>
                {copied ? "✓ Copied" : "⎘ Copy Markdown"}
              </button>
              <span className="toolbar-info">
                {wordCount.toLocaleString()} words
              </span>
            </div>
          )}

          {/* Output + figure panel */}
          <div className="output-area">
            <div className="paper-output" ref={outputRef}>
              {!paperText && !generating ? (
                <div className="empty-state">
                  <div className="empty-icon">✦</div>
                  <div className="empty-title">Ready to synthesize</div>
                  <div className="empty-sub">
                    Upload survey papers, select them in the sidebar, enter a
                    topic, and generate a research paper.
                  </div>
                </div>
              ) : (
                <div className="paper-content">
                  <pre
                    style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                  >
                    {paperText}
                  </pre>
                  {generating && <span className="streaming-cursor" />}
                </div>
              )}
            </div>
            <FigurePanel images={retrievedImages} />
          </div>
        </main>
      </div>
    </>
  );
}
