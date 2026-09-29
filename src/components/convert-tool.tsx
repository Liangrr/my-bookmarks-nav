"use client";

import { useRef, useState } from "react";

/* ================= 工具定义 ================= */

type ToolId =
  | "img-convert"
  | "img-compress"
  | "img-ocr"
  | "img-pdf"
  | "pdf-img"
  | "pdf-merge"
  | "xlsx-csv"
  | "csv-xlsx"
  | "docx-text"
  | "txt-pdf"
  | "txt-docx";

type Tool = {
  id: ToolId;
  icon: string;
  name: string;
  desc: string;
  group: string;
  multiple: boolean;
  accept: string;
  hint: string;
};

const TOOLS: Tool[] = [
  { id: "img-convert", icon: "🖼️", name: "图片格式转换", desc: "PNG / JPG / WebP 互转", group: "图片", multiple: true, accept: "image/*", hint: "支持多张图片批量转换" },
  { id: "img-compress", icon: "🗜️", name: "图片压缩", desc: "调整质量与尺寸，压缩图片体积", group: "图片", multiple: true, accept: "image/*", hint: "输出 JPG/WebP，显示压缩前后大小" },
  { id: "img-ocr", icon: "🔍", name: "图片文字识别", desc: "OCR 提取图片中的中文 / 英文文字", group: "图片", multiple: false, accept: "image/*", hint: "首次使用需下载语言包（约 15MB），稍候" },
  { id: "img-pdf", icon: "📷", name: "图片转 PDF", desc: "多张图片合成一个 PDF", group: "图片", multiple: true, accept: "image/*", hint: "按选择顺序逐页合成 PDF" },
  { id: "pdf-img", icon: "📄", name: "PDF 转图片", desc: "PDF 每页渲染为 PNG", group: "PDF", multiple: false, accept: "application/pdf", hint: "最多处理前 20 页" },
  { id: "pdf-merge", icon: "🔗", name: "PDF 合并", desc: "多个 PDF 合并为一个", group: "PDF", multiple: true, accept: "application/pdf", hint: "按选择顺序合并" },
  { id: "xlsx-csv", icon: "📊", name: "Excel 转 CSV/JSON", desc: "XLSX / XLS 提取为 CSV 或 JSON", group: "表格", multiple: false, accept: ".xlsx,.xls", hint: "取第一个工作表" },
  { id: "csv-xlsx", icon: "📈", name: "CSV/JSON 转 Excel", desc: "CSV 或 JSON 数据生成 XLSX", group: "表格", multiple: false, accept: ".csv,.json", hint: "支持逗号分隔 CSV 与 JSON 数组" },
  { id: "docx-text", icon: "📝", name: "Word 转 TXT/HTML", desc: "DOCX 提取纯文本或 HTML", group: "文档", multiple: false, accept: ".docx", hint: "保留段落结构，样式简化" },
  { id: "txt-pdf", icon: "📃", name: "TXT 转 PDF", desc: "纯文本生成可打印 PDF", group: "文档", multiple: false, accept: ".txt,.md", hint: "自动分页，支持中文" },
  { id: "txt-docx", icon: "✍️", name: "TXT 转 Word", desc: "纯文本生成 .docx 文档", group: "文档", multiple: false, accept: ".txt,.md", hint: "每行一个段落" },
];

/* PPT 在线转换（本地无法可靠解析 PPTX） */
const PPT_ONLINE = [
  { name: "iLovePDF", url: "https://www.ilovepdf.com/zh-cn" },
  { name: "CloudConvert", url: "https://cloudconvert.com/" },
  { name: "Convertio", url: "https://convertio.co/zh/" },
];

/* ================= 工具函数 ================= */

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

async function loadImage(file: File): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality = 0.92): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("转换失败"))), mime, quality));
}

/* ---------- 各转换实现 ---------- */

async function runImgConvert(files: File[], fmt: "png" | "jpg" | "webp"): Promise<{ blob: Blob; name: string }[]> {
  const mime = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" }[fmt];
  const out: { blob: Blob; name: string }[] = [];
  for (const f of files) {
    const canvas = await loadImage(f);
    const blob = await canvasToBlob(canvas, mime, 0.92);
    if (blob.type !== mime) throw new Error(`当前浏览器不支持转换为 ${fmt.toUpperCase()}，请换用其他格式`);
    out.push({ blob, name: `${baseName(f.name)}.${fmt}` });
  }
  return out;
}

async function runImgCompress(files: File[], fmt: "jpg" | "webp", quality: number, maxW: number): Promise<{ blob: Blob; name: string }[]> {
  const mime = fmt === "jpg" ? "image/jpeg" : "image/webp";
  const out: { blob: Blob; name: string }[] = [];
  for (const f of files) {
    const bmp = await createImageBitmap(f);
    let w = bmp.width, h = bmp.height;
    if (maxW > 0 && w > maxW) {
      h = Math.round((h * maxW) / w);
      w = maxW;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await canvasToBlob(canvas, mime, quality);
    const ratio = f.size > 0 ? Math.round((1 - blob.size / f.size) * 100) : 0;
    out.push({ blob, name: `${baseName(f.name)}-压缩(${fmtSize(f.size)}→${fmtSize(blob.size)},${ratio >= 0 ? "-" : "+"}${Math.abs(ratio)}%).${fmt}` });
  }
  return out;
}

async function runImgOcr(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("chi_sim+eng", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core.wasm.js",
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}

async function runImgPdf(files: File[]): Promise<{ blob: Blob; name: string }[]> {
  const { jsPDF } = await import("jspdf");
  const pages: { canvas: HTMLCanvasElement; w: number; h: number }[] = [];
  for (const f of files) {
    const canvas = await loadImage(f);
    pages.push({ canvas, w: canvas.width, h: canvas.height });
  }
  // A4 竖版（595x842 pt），图片等比缩放居中
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4", compress: true });
  const maxW = 555, maxH = 802;
  pages.forEach((p, i) => {
    if (i > 0) pdf.addPage();
    const scale = Math.min(maxW / p.w, maxH / p.h);
    const w = p.w * scale, h = p.h * scale;
    pdf.addImage(p.canvas.toDataURL("image/jpeg", 0.92), "JPEG", (595 - w) / 2, (842 - h) / 2, w, h);
  });
  const blob = pdf.output("blob");
  return [{ blob, name: `${baseName(files[0].name)}-合成.pdf` }];
}

async function runPdfImg(file: File): Promise<{ blob: Blob; name: string }[]> {
  const pdfjs = await import("pdfjs-dist");
  // Worker 用 CDN 按版本加载，避免 Next.js 打包 worker
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const total = Math.min(doc.numPages, 20);
  const out: { blob: Blob; name: string }[] = [];
  for (let p = 1; p <= total; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvas, viewport: vp }).promise;
    out.push({ blob: await canvasToBlob(canvas, "image/png", 1), name: `${baseName(file.name)}-第${p}页.png` });
  }
  return out;
}

async function runPdfMerge(files: File[]): Promise<{ blob: Blob; name: string }[]> {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((pg) => out.addPage(pg));
  }
  const bytes = await out.save();
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return [{ blob: new Blob([buf], { type: "application/pdf" }), name: "合并后的PDF.pdf" }];
}

async function runXlsxCsv(file: File, fmt: "csv" | "json"): Promise<{ blob: Blob; name: string }[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (fmt === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return [{ blob: new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), name: `${baseName(file.name)}.csv` }];
  }
  const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return [{ blob: new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }), name: `${baseName(file.name)}.json` }];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

async function runCsvXlsx(file: File): Promise<{ blob: Blob; name: string }[]> {
  const XLSX = await import("xlsx");
  const text = await file.text();
  let ws: any;
  if (file.name.toLowerCase().endsWith(".json")) {
    const data = JSON.parse(text) as unknown;
    ws = Array.isArray(data)
      ? XLSX.utils.json_to_sheet(data as Record<string, unknown>[])
      : XLSX.utils.json_to_sheet([data as Record<string, unknown>]);
  } else {
    ws = XLSX.utils.aoa_to_sheet(parseCsv(text));
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const arr = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return [{ blob: new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name: `${baseName(file.name)}.xlsx` }];
}

async function runDocxText(file: File, fmt: "txt" | "html"): Promise<{ blob: Blob; name: string }[]> {
  const mammoth = await import("mammoth");
  if (fmt === "txt") {
    const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return [{ blob: new Blob(["\ufeff" + r.value], { type: "text/plain;charset=utf-8" }), name: `${baseName(file.name)}.txt` }];
  }
  const r = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const html = `<!doctype html><meta charset="utf-8"><title>${baseName(file.name)}</title><style>body{max-width:820px;margin:40px auto;padding:0 20px;font:15px/1.8 system-ui,sans-serif;color:#222}</style>${r.value}`;
  return [{ blob: new Blob([html], { type: "text/html;charset=utf-8" }), name: `${baseName(file.name)}.html` }];
}

async function runTxtPdf(file: File): Promise<{ blob: Blob; name: string }[]> {
  const { jsPDF } = await import("jspdf");
  const text = await file.text();
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageH = 842;
  let y = 56;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const lines = pdf.splitTextToSize(line || " ", 495);
    for (const l of lines) {
      if (y > pageH - 48) { pdf.addPage(); y = 56; }
      pdf.text(l, 56, y);
      y += 18;
    }
  }
  return [{ blob: pdf.output("blob"), name: `${baseName(file.name)}.pdf` }];
}

async function runTxtDocx(file: File): Promise<{ blob: Blob; name: string }[]> {
  const docx = await import("docx");
  const text = await file.text();
  const doc = new docx.Document({
    styles: { default: { document: { run: { font: "Microsoft YaHei", size: 24 } } } },
    sections: [{
      children: text.split("\n").map((l) => new docx.Paragraph({ children: [new docx.TextRun(l || " ")] })),
    }],
  });
  const blob = await docx.Packer.toBlob(doc);
  return [{ blob, name: `${baseName(file.name)}.docx` }];
}

/* ================= 面板渲染 ================= */

type Result = { blob: Blob; name: string };

function Panel({ tool, onBack }: { tool: Tool; onBack: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [fmt, setFmt] = useState("png");
  const [compressFmt, setCompressFmt] = useState<"jpg" | "webp">("webp");
  const [quality, setQuality] = useState(0.7);
  const [maxW, setMaxW] = useState(1920);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [ocrText, setOcrText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list || !list.length) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 20));
    setErr("");
    setResults([]);
    setOcrText("");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const run = async () => {
    if (!files.length) return;
    setBusy(true);
    setErr("");
    setResults([]);
    setOcrText("");
    try {
      let out: Result[] = [];
      switch (tool.id) {
        case "img-convert": out = await runImgConvert(files, fmt as "png" | "jpg" | "webp"); break;
        case "img-compress": out = await runImgCompress(files, compressFmt, quality, maxW); break;
        case "img-ocr": {
          const t = await runImgOcr(files[0]);
          setOcrText(t || "（未识别到文字）");
          out = [{ blob: new Blob(["\ufeff" + t], { type: "text/plain;charset=utf-8" }), name: `${baseName(files[0].name)}-识别结果.txt` }];
          break;
        }
        case "img-pdf": out = await runImgPdf(files); break;
        case "pdf-img": out = await runPdfImg(files[0]); break;
        case "pdf-merge": out = await runPdfMerge(files); break;
        case "xlsx-csv": out = await runXlsxCsv(files[0], fmt as "csv" | "json"); break;
        case "csv-xlsx": out = await runCsvXlsx(files[0]); break;
        case "docx-text": out = await runDocxText(files[0], fmt as "txt" | "html"); break;
        case "txt-pdf": out = await runTxtPdf(files[0]); break;
        case "txt-docx": out = await runTxtDocx(files[0]); break;
      }
      setResults(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "转换失败，请检查文件");
    } finally {
      setBusy(false);
    }
  };

  const card: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 };
  const label: React.CSSProperties = { fontSize: 12, color: "var(--text-tertiary)", margin: "0 0 8px" };

  return (
    <section style={{ ...card, marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{tool.icon}</span>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{tool.name}</h2>
        </div>
        <button
          onClick={onBack}
          style={{ fontSize: 13, color: "var(--text-secondary)", padding: "6px 14px", borderRadius: 100, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontFamily: "inherit" }}
        >
          ← 返回工具列表
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "8px 0 16px" }}>{tool.desc} · {tool.hint}</p>

      {/* 参数 */}
      {(tool.id === "img-convert" || tool.id === "xlsx-csv" || tool.id === "docx-text") && (
        <div style={{ marginBottom: 14 }}>
          <div style={label}>输出格式</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(tool.id === "img-convert"
              ? ["png", "jpg", "webp"]
              : tool.id === "xlsx-csv"
                ? ["csv", "json"]
                : ["txt", "html"]
            ).map((f) => (
              <button
                key={f}
                onClick={() => setFmt(f)}
                style={{
                  fontSize: 13, padding: "6px 16px", borderRadius: 100, cursor: "pointer", fontFamily: "inherit",
                  border: fmt === f ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: fmt === f ? "var(--accent)" : "var(--bg-card)",
                  color: fmt === f ? "#fff" : "var(--text-secondary)",
                  transition: "var(--transition)",
                }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 压缩参数 */}
      {tool.id === "img-compress" && (
        <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={label}>输出格式</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["jpg", "webp"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setCompressFmt(f)}
                  style={{
                    fontSize: 13, padding: "6px 16px", borderRadius: 100, cursor: "pointer", fontFamily: "inherit",
                    border: compressFmt === f ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: compressFmt === f ? "var(--accent)" : "var(--bg-card)",
                    color: compressFmt === f ? "#fff" : "var(--text-secondary)",
                    transition: "var(--transition)",
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={label}>质量：{Math.round(quality * 100)}%</div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>
          <div>
            <div style={label}>最长边限制（px，0 = 不缩放）</div>
            <input
              type="number"
              min={0}
              max={8000}
              step={100}
              value={maxW}
              onChange={(e) => setMaxW(Math.max(0, Number(e.target.value)))}
              style={{
                width: 140, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--bg-card)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 14,
              }}
            />
          </div>
        </div>
      )}

      {/* 上传区 */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: "2px dashed var(--border)", borderRadius: 12, padding: "28px 16px", textAlign: "center",
          cursor: "pointer", background: "var(--bg-secondary)", transition: "var(--transition)",
        }}
      >
        <div style={{ fontSize: 28 }}>📁</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          点击选择或拖拽文件到此处（{tool.multiple ? "可多选" : "单选"}）
        </div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>{tool.accept}</div>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple={tool.multiple}
          accept={tool.accept}
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* 已选文件 */}
      {files.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", background: "var(--bg-secondary)", borderRadius: 8, padding: "6px 12px" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <span style={{ flexShrink: 0, marginLeft: 8 }}>{fmtSize(f.size)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 操作 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <button
          onClick={run}
          disabled={!files.length || busy}
          style={{
            fontSize: 14, padding: "10px 24px", borderRadius: 100, cursor: busy || !files.length ? "not-allowed" : "pointer",
            fontFamily: "inherit", border: "1px solid var(--accent)", background: "var(--accent)", color: "#fff",
            opacity: busy || !files.length ? 0.6 : 1, transition: "var(--transition)",
          }}
        >
          {busy ? "转换中…" : "开始转换"}
        </button>
        <button
          onClick={() => { setFiles([]); setResults([]); setErr(""); }}
          style={{ fontSize: 13, color: "var(--text-secondary)", padding: "8px 16px", borderRadius: 100, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontFamily: "inherit" }}
        >
          清空
        </button>
        {err && <span style={{ fontSize: 13, color: "#ef4444" }}>{err}</span>}
      </div>

      {/* 结果 */}
      {ocrText !== "" && (
        <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <div style={label}>识别结果（可编辑复制）</div>
          <textarea
            readOnly
            value={ocrText}
            rows={10}
            style={{
              width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, fontFamily: "inherit",
              fontSize: 13, lineHeight: 1.7, background: "var(--bg-secondary)", color: "var(--text-primary)",
              border: "1px solid var(--border)", resize: "vertical",
            }}
          />
        </div>
      )}
      {results.length > 0 && (
        <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <div style={label}>转换完成（{results.length} 个文件）</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-secondary)", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{r.name}（{fmtSize(r.blob.size)}）</span>
                <button
                  onClick={() => download(r.blob, r.name)}
                  style={{ flexShrink: 0, fontSize: 13, padding: "5px 14px", borderRadius: 100, border: "1px solid var(--accent)", background: "var(--accent)", color: "#fff", cursor: "pointer", fontFamily: "inherit", marginLeft: 10 }}
                >
                  下载
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ================= 页面 ================= */

export default function ConvertTool() {
  const [active, setActive] = useState<ToolId | null>(null);
  const groups = Array.from(new Set(TOOLS.map((t) => t.group)));
  const tool = TOOLS.find((t) => t.id === active) ?? null;

  const card: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 6, textAlign: "left",
    background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 16px",
    cursor: "pointer", fontFamily: "inherit", transition: "var(--transition)", color: "inherit",
  };

  return (
    <div className="container">
      <header style={{ marginTop: 16 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, background: "linear-gradient(135deg, var(--accent), #f472b6)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          格式转换
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "8px 0 0" }}>
          纯本地转换，文件不出浏览器 · Word / Excel / PPT / 图片 / PDF / TXT 常用格式互转
        </p>
      </header>

      {!tool ? (
        <>
          {groups.map((g) => (
            <section key={g} style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-tertiary)", margin: "0 0 12px", letterSpacing: 1 }}>{g}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {TOOLS.filter((t) => t.group === g).map((t) => (
                  <button key={t.id} onClick={() => setActive(t.id)} style={card}>
                    <span style={{ fontSize: 26 }}>{t.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {/* PPT：本地无法可靠解析，提供在线导航 */}
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-tertiary)", margin: "0 0 12px", letterSpacing: 1 }}>演示文稿（PPT）</h2>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 4px" }}>
                ⚠️ PPT（PPTX）文件结构复杂，浏览器端暂时无法可靠解析转换，推荐使用以下在线转换工具：
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                {PPT_ONLINE.map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: "var(--text-secondary)", padding: "8px 16px", borderRadius: 100, border: "1px solid var(--border)", background: "var(--bg-secondary)", textDecoration: "none", transition: "var(--transition)" }}
                  >
                    {p.name} ↗
                  </a>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <Panel tool={tool} onBack={() => setActive(null)} />
      )}
    </div>
  );
}
