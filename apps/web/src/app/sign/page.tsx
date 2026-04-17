"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Pen, Check, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://pdfy-api.lsabag.workers.dev/api";

export default function SignPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SignContent />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--color-background)" }}>
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SignContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [signing, setSigning] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Signature state
  const [sigMode, setSigMode] = useState(false);
  const [sigImage, setSigImage] = useState<string | null>(null);
  const [sigPos, setSigPos] = useState({ x: 0, y: 0 });
  const [sigSize, setSigSize] = useState({ w: 180, h: 50 });
  const [sigPlaced, setSigPlaced] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Drawing canvas
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);

  // Page refs
  const pageRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pageDims = useRef<{ w: number; h: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load request info
  useEffect(() => {
    if (!token) { setError("No token"); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/sign/${token}`);
        if (!res.ok) { const d = await res.json(); setError(d.error || "Invalid link"); return; }
        setInfo(await res.json());
        // Load PDF
        const pdfRes = await fetch(`${API_BASE}/sign/${token}/download`);
        if (!pdfRes.ok) { setError("Failed to load PDF"); return; }
        const data = await pdfRes.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        setPdfDoc(pdf);
        pageRefs.current = new Array(pdf.numPages).fill(null);
      } catch { setError("Failed to load"); }
      finally { setLoading(false); }
    })();
  }, [token]);

  // Draw canvas helpers
  const initDrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => { if (showDrawModal) setTimeout(initDrawCanvas, 100); }, [showDrawModal, initDrawCanvas]);

  const getDrawCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getDrawCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getDrawCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const stopDraw = () => setIsDrawing(false);

  const handleApplySignature = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    setSigImage(data);
    setSigMode(true);
    setSigPlaced(false);
    setShowDrawModal(false);
  };

  // Submit signature
  const handleSubmit = async () => {
    if (!sigImage || !sigPlaced || !token) return;
    // Find which page canvas the signature is on
    const canvas = pageRefs.current[currentPage - 1];
    if (!canvas) return;
    const dims = pageDims.current[currentPage - 1];
    if (!dims) return;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / dims.w;

    const relX = sigPos.x - rect.left;
    const relY = sigPos.y - rect.top;
    const pdfX = Math.max(0, relX / scale);
    const pdfY = Math.max(0, dims.h - (relY + sigSize.h) / scale);

    setSigning(true);
    try {
      const res = await fetch(`${API_BASE}/sign/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureData: sigImage,
          pageNumber: currentPage,
          x: pdfX, y: pdfY,
          width: sigSize.w / scale, height: sigSize.h / scale,
        }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || "Failed"); return; }
      setSubmitted(true);
    } catch { alert("Network error"); }
    finally { setSigning(false); }
  };

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" style={{ background: "var(--color-background)" }}>
        <div className="text-center p-8 rounded-xl max-w-md" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}>
          <X size={48} className="mx-auto mb-4" style={{ color: "var(--color-error)" }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Cannot open</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" style={{ background: "var(--color-background)" }}>
        <div className="text-center p-8 rounded-xl max-w-md" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}>
          <Check size={48} className="mx-auto mb-4" style={{ color: "var(--color-success)" }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Signed!</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Your signature has been applied to "{info?.documentName}".
            <br />You can close this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#525659" }}>
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 sm:px-6 flex-shrink-0"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <img src="/favicon.png" alt="pdfy" className="w-8 h-8 rounded-lg object-contain" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
              {info?.documentName}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              From {info?.requestedBy} · Sign as {info?.signerName}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!sigMode && (
            <button className="btn btn-primary text-sm h-9" onClick={() => setShowDrawModal(true)}>
              <Pen size={14} /> Sign
            </button>
          )}
          {sigMode && sigPlaced && (
            <button className="btn btn-primary text-sm h-9" onClick={handleSubmit} disabled={signing}>
              {signing ? "Submitting..." : "✓ Confirm & Send"}
            </button>
          )}
        </div>
      </header>

      {/* Message */}
      {info?.message && (
        <div className="px-4 py-2 text-sm" style={{ background: "var(--color-surface-secondary)", color: "var(--color-text-secondary)" }}>
          💬 {info.message}
        </div>
      )}

      {/* Signature placement banner */}
      {sigMode && !sigPlaced && (
        <div className="px-4 py-2 text-sm font-medium flex justify-between items-center"
          style={{ background: "#E5F0FF", color: "var(--color-primary)" }}>
          <span>Tap on the page where you want your signature</span>
          <button className="text-xs px-2 py-1 rounded" style={{ background: "var(--color-surface)" }}
            onClick={() => { setSigMode(false); setSigImage(null); }}>Cancel</button>
        </div>
      )}

      {/* PDF pages */}
      <div ref={containerRef} className="flex-1 overflow-auto p-2 sm:p-4"
        onClick={(e) => {
          if (sigMode && !sigPlaced) {
            const target = e.target as HTMLElement;
            if (target.tagName === "CANVAS" || target.closest("[data-page]")) {
              setSigPos({ x: e.clientX - sigSize.w / 2, y: e.clientY - sigSize.h / 2 });
              setSigPlaced(true);
            }
          }
        }}>
        <div className="flex flex-col items-center gap-4">
          {pdfDoc && Array.from({ length: pdfDoc.numPages }, (_, i) => (
            <div key={i} data-page={i + 1} className="relative">
              <SignPageCanvas pdfDoc={pdfDoc} pageNum={i + 1}
                onRendered={(canvas, dims) => { pageRefs.current[i] = canvas; pageDims.current[i] = dims; }} />
              <span className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,0,0,0.5)", color: "white" }}>{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Placed signature overlay */}
        {sigMode && sigPlaced && sigImage && (
          <div className="fixed select-none" style={{ left: sigPos.x, top: sigPos.y, zIndex: 50, touchAction: "none" }}
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              const ox = e.clientX - sigPos.x, oy = e.clientY - sigPos.y;
              const onMove = (ev: PointerEvent) => {
                if (ev.pressure === 0) return;
                setSigPos({ x: ev.clientX - ox, y: ev.clientY - oy });
              };
              const onUp = () => {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              };
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}>
            <img src={sigImage} alt="signature" draggable={false}
              style={{ width: sigSize.w, height: sigSize.h, objectFit: "fill",
                border: "2px dashed var(--color-primary)", touchAction: "none" }} />
          </div>
        )}
      </div>

      {/* Draw signature modal */}
      {showDrawModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setShowDrawModal(false)}>
          <div className="w-full sm:max-w-lg rounded-t-xl sm:rounded-xl overflow-hidden"
            style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--color-border)" }}>
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Draw your signature
              </h3>
              <button onClick={() => setShowDrawModal(false)} className="btn-icon">✕</button>
            </div>
            <div className="px-5 py-4">
              <canvas ref={drawCanvasRef} width={440} height={160}
                className="w-full rounded-lg cursor-crosshair"
                style={{ border: "2px dashed var(--color-border)", background: "white", touchAction: "none" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={(e) => { e.preventDefault(); startDraw(e); }}
                onTouchMove={(e) => { e.preventDefault(); draw(e); }}
                onTouchEnd={stopDraw} />
              <div className="flex justify-between mt-3">
                <button className="btn btn-secondary text-sm" onClick={initDrawCanvas}>Clear</button>
                <button className="btn btn-primary text-sm" onClick={handleApplySignature}>Place on document</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Self-rendering PDF page for sign page
function SignPageCanvas({ pdfDoc, pageNum, onRendered }: {
  pdfDoc: any; pageNum: number; onRendered: (canvas: HTMLCanvasElement, dims: { w: number; h: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const baseVp = page.getViewport({ scale: 1 });
        const scale = (816 / baseVp.width);
        const vp = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        onRendered(canvas, { w: baseVp.width, h: baseVp.height });
      } catch {}
    })();
  }, [pdfDoc, pageNum]);

  return <canvas ref={canvasRef} className="rounded-sm shadow-xl" style={{ background: "white", maxWidth: "100%" }} />;
}
