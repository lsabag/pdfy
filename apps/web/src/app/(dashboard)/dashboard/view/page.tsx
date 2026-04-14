"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Download, Share2, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Maximize, RotateCw,
  Trash2, Lock, Minimize2, FileOutput, FileImage,
  FileSpreadsheet, Pen, MessageSquare, Edit3,
  Scissors, Merge, MoreHorizontal, FormInput, Undo,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { SignatureModal } from "@/components/signatures/SignatureModal";
import { FormFillerModal } from "@/components/forms/FormFillerModal";

export default function DocumentViewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>}>
      <ViewContent />
    </Suspense>
  );
}

function ViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get("id");
  const [document, setDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [showTools, setShowTools] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showFormFiller, setShowFormFiller] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  // Version history for undo
  const [versionHistory, setVersionHistory] = useState<string[]>([]); // blob URLs of previous versions

  // Signature placement state
  const [placingSignature, setPlacingSignature] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [sigPos, setSigPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [sigPlaced, setSigPlaced] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [sigSize, setSigSize] = useState({ w: 180, h: 50 });
  const [isResizing, setIsResizing] = useState(false);

  // Download PDF as blob URL (works with <embed>, no partitioning issue)
  const downloadPdfUrl = async (id: string): Promise<string | null> => {
    try {
      const pdfRes = await api.get(`/documents/${id}/download`, { responseType: "blob" });
      const blob = pdfRes.data as Blob;
      if (blob.size < 100 || blob.type === "application/json") {
        const text = await blob.text();
        if (text.includes("Unauthorized") || text.includes("error")) {
          localStorage.removeItem("pdfy-token");
          window.location.href = "/login";
          return null;
        }
      }
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!docId) { router.push("/dashboard"); return; }
    (async () => {
      try {
        const { data } = await api.get(`/documents/${docId}`);
        setDocument(data);
        const blobUrl = await downloadPdfUrl(docId);
        if (blobUrl) setPdfDataUrl(blobUrl);
      } catch { router.push("/dashboard"); }
      finally { setLoading(false); }
    })();
    return () => { if (pdfDataUrl) URL.revokeObjectURL(pdfDataUrl); };
  }, [docId, router]);

  // Drag + resize handlers for signature placement
  useEffect(() => {
    if (!isDragging && !isResizing) return;
    const onMove = (e: MouseEvent) => {
      if (isDragging) {
        setSigPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
      }
      if (isResizing) {
        const newW = Math.max(60, e.clientX - sigPos.x);
        const newH = Math.max(20, e.clientY - sigPos.y);
        setSigSize({ w: newW, h: newH });
      }
    };
    const onUp = () => { setIsDragging(false); setIsResizing(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging, isResizing, dragOffset, sigPos]);

  const loadComments = async () => {
    if (!docId) return;
    const { data } = await api.get(`/documents/${docId}/comments`);
    setComments(data);
  };

  // Reload PDF after an edit, saving current version for undo
  const [pdfKey, setPdfKey] = useState(0); // Force iframe remount

  const reloadPdf = async () => {
    // Force a hard reload of the page to show updated PDF
    // This is the most reliable way since <embed> caches aggressively
    window.location.reload();
  };

  const handleUndo = async () => {
    if (!confirm("Revert to the original uploaded version? All edits (signatures, page changes) will be removed.")) return;
    try {
      await api.post(`/documents/${docId}/undo`);
      await reloadPdf();
      alert("Reverted to original version.");
    } catch (err: any) {
      alert("Undo failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !docId) return;
    await api.post(`/documents/${docId}/comments`, {
      content: newComment, pageNumber: currentPage,
      position: { x: 50, y: 50, width: 200, height: 30 },
    });
    setNewComment("");
    loadComments();
  };

  const handleDownload = async () => {
    const res = await api.get(`/documents/${docId}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = `${document.name}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const { data } = await api.post(`/documents/${docId}/share`, { permission: "VIEW" });
    const url = `${window.location.origin}/share?token=${data.token}`;
    await navigator.clipboard.writeText(url);
    alert("Share link copied!");
  };

  const handleRotate = async (rotation: number) => {
    await api.post(`/documents/${docId}/pages/rotate`, {
      pages: [{ pageIndex: currentPage - 1, rotation }],
    });
    setDocument({ ...document, version: document.version + 1 });
    alert(`Page ${currentPage} rotated ${rotation}deg`);
  };

  const handleDeletePage = async () => {
    if (!confirm(`Delete page ${currentPage}?`)) return;
    const { data } = await api.delete(`/documents/${docId}/pages`, {
      data: { pageIndices: [currentPage - 1] },
    });
    setDocument({ ...document, pageCount: data.pageCount, version: document.version + 1 });
    if (currentPage > data.pageCount) setCurrentPage(data.pageCount);
    alert(`Page deleted. ${data.pageCount} pages remaining.`);
  };

  const handleOptimize = async () => {
    const { data } = await api.post(`/documents/${docId}/optimize`);
    alert(`Saved ${(data.savedBytes / 1024).toFixed(1)} KB (${data.savedPercent}%)`);
  };

  const handleEncrypt = async () => {
    const pw = prompt("Enter password to protect this PDF:");
    if (!pw) return;
    await api.post(`/documents/${docId}/encrypt`, { userPassword: pw });
    alert("PDF is now password-protected!");
  };

  const handleConvert = async (format: string) => {
    await api.post(`/documents/${docId}/convert`, { format });
    alert(`Converting to ${format.replace("PDF_TO_", "")}...`);
  };

  const handleSplit = async () => {
    const input = prompt(`Split pages (e.g. "1-3,4-6"). Total pages: ${document.pageCount}`);
    if (!input) return;
    const ranges = input.split(",").map((r: string, i: number) => {
      const [start, end] = r.trim().split("-").map(Number);
      return { start: start - 1, end: (end || start) - 1, name: `${document.name} - Part ${i + 1}` };
    });
    await api.post(`/documents/${docId}/split`, { ranges });
    alert(`Split into ${ranges.length} documents!`);
  };

  const handleRename = async () => {
    const newName = prompt("Rename document:", document.name);
    if (!newName || newName === document.name) return;
    await api.patch(`/documents/${docId}`, { name: newName });
    setDocument({ ...document, name: newName });
  };

  if (loading || !document) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const viewUrl = pdfDataUrl || "";

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-48px)] -m-6">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 h-12 flex-shrink-0"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>

        {/* Left: back + title */}
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/dashboard")} className="btn-icon">
            <ArrowLeft size={18} />
          </button>
          <button onClick={handleRename} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
            <h2 className="text-sm font-medium truncate max-w-[200px]" style={{ color: "var(--color-text-primary)" }}>
              {document.name}
            </h2>
            <Edit3 size={12} style={{ color: "var(--color-text-tertiary)" }} />
          </button>
          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{document.pageCount}p</span>
        </div>

        {/* Center: zoom + page nav */}
        <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg" style={{ background: "var(--color-surface-secondary)" }}>
          <button className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
            style={{ color: "var(--color-text-primary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            onClick={() => setZoom((z) => Math.max(25, z - 25))}><ZoomOut size={15} /></button>
          <span className="text-xs w-10 text-center font-medium" style={{ color: "var(--color-text-primary)" }}>{zoom}%</span>
          <button className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
            style={{ color: "var(--color-text-primary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            onClick={() => setZoom((z) => Math.min(400, z + 25))}><ZoomIn size={15} /></button>

          <div className="w-px h-4 mx-1" style={{ background: "var(--color-border)" }} />

          <button className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
            style={{ color: "var(--color-text-primary)" }}
            disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}><ChevronLeft size={15} /></button>
          <input id="page-number" name="pageNumber" type="number" min={1} max={document.pageCount || 1} value={currentPage}
            onChange={(e) => setCurrentPage(Math.min(document.pageCount, Math.max(1, Number(e.target.value))))}
            className="w-10 text-center text-xs h-7 rounded-md font-medium"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
            aria-label="Page number" />
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>/ {document.pageCount}</span>
          <button className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
            style={{ color: "var(--color-text-primary)" }}
            disabled={currentPage >= (document.pageCount || 1)} onClick={() => setCurrentPage((p) => p + 1)}><ChevronRight size={15} /></button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <TbBtn icon={Undo} label="Undo" onClick={handleUndo} />
          <TbBtn icon={RotateCw} label="Rotate" onClick={() => handleRotate(90)} />
          <TbBtn icon={MessageSquare} label="Comments" onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}
            active={showComments} />
          <TbBtn icon={Pen} label="Sign" onClick={() => setShowSignature(true)} />
          <TbBtn icon={FormInput} label="Fill form" onClick={() => setShowFormFiller(true)} />

          <div className="w-px h-5 mx-0.5" style={{ background: "var(--color-border)" }} />

          <TbBtn icon={Share2} label="Share" onClick={handleShare} />
          <TbBtn icon={Download} label="Download" onClick={handleDownload} />

          {/* More tools dropdown */}
          <div className="relative">
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{ color: "var(--color-text-primary)", background: showTools ? "var(--color-surface-secondary)" : "transparent", border: "1px solid var(--color-border)" }}
              onClick={() => setShowTools(!showTools)}>
              <MoreHorizontal size={14} /> More
            </button>
            {showTools && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTools(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 py-1 rounded-lg z-50"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-lg)" }}>
                  <ToolItem icon={RotateCw} label="Rotate page 90deg" onClick={() => { handleRotate(90); setShowTools(false); }} />
                  <ToolItem icon={Trash2} label="Delete current page" onClick={() => { handleDeletePage(); setShowTools(false); }} />
                  <ToolItem icon={Scissors} label="Split document" onClick={() => { handleSplit(); setShowTools(false); }} />
                  <div className="my-1" style={{ borderTop: "1px solid var(--color-border-light)" }} />
                  <ToolItem icon={Minimize2} label="Optimize / Compress" onClick={() => { handleOptimize(); setShowTools(false); }} />
                  <ToolItem icon={Lock} label="Password protect" onClick={() => { handleEncrypt(); setShowTools(false); }} />
                  <ToolItem icon={Pen} label="Sign document" onClick={() => { setShowSignature(true); setShowTools(false); }} />
                  <ToolItem icon={FormInput} label="Fill form fields" onClick={() => { setShowFormFiller(true); setShowTools(false); }} />
                  <div className="my-1" style={{ borderTop: "1px solid var(--color-border-light)" }} />
                  <ToolItem icon={FileOutput} label="Export to Word" onClick={() => { handleConvert("PDF_TO_DOCX"); setShowTools(false); }} />
                  <ToolItem icon={FileSpreadsheet} label="Export to Excel" onClick={() => { handleConvert("PDF_TO_XLSX"); setShowTools(false); }} />
                  <ToolItem icon={FileImage} label="Export to PNG" onClick={() => { handleConvert("PDF_TO_PNG"); setShowTools(false); }} />
                  <div className="my-1" style={{ borderTop: "1px solid var(--color-border-light)" }} />
                  <ToolItem icon={Trash2} label="Move to trash" danger onClick={() => {
                    api.delete(`/documents/${docId}`).then(() => router.push("/dashboard"));
                    setShowTools(false);
                  }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Signature placement banner */}
      {placingSignature && !sigPlaced && (
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ background: "#E5F0FF", borderBottom: "1px solid #B3D4FF" }}>
          <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
            Click on the PDF to place your signature on page {currentPage}
          </span>
          <button className="btn btn-secondary text-sm h-8" onClick={() => {
            setPlacingSignature(false); setSignatureImage(null); setSigPlaced(false);
          }}>Cancel</button>
        </div>
      )}
      {placingSignature && sigPlaced && (
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ background: "#E3F8EE", borderBottom: "1px solid #A3E4C1" }}>
          <span className="text-sm font-medium" style={{ color: "var(--color-success)" }}>
            Drag to reposition. Click "Confirm" to stamp on page {currentPage}.
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary text-sm h-8" onClick={() => {
              setPlacingSignature(false); setSignatureImage(null); setSigPlaced(false);
            }}>Cancel</button>
            <button type="button" className="btn btn-primary text-sm h-8" onClick={async () => {
              if (!signatureImage || !pdfContainerRef.current) return;

              // PDF standard page size in points
              const PDF_W = 612;
              const PDF_H = 792;

              // Get iframe on screen
              const iframe = pdfContainerRef.current.querySelector("embed, iframe");
              if (!iframe) return;
              const iframeRect = iframe.getBoundingClientRect();

              // Chrome PDF embed internal offsets
              // With <embed>, toolbar may or may not show. Use 0 and let
              // the percentage-based calculation handle it directly.
              const CHROME_TOOLBAR_H = 0;
              const CHROME_MARGIN_X = 0;

              // Position relative to the actual PDF content area inside the embed
              const relX = sigPos.x - iframeRect.left - CHROME_MARGIN_X;
              const relY = sigPos.y - iframeRect.top - CHROME_TOOLBAR_H;

              // PDF content area size (embed size minus chrome UI)
              const contentW = iframeRect.width - CHROME_MARGIN_X * 2;
              const contentH = iframeRect.height - CHROME_TOOLBAR_H;

              // Convert to percentage within the PDF page
              const percentX = Math.max(0, Math.min(1, relX / contentW));
              const percentY = Math.max(0, Math.min(1, relY / contentH));

              // Convert to PDF points
              const sigWidthPt = (sigSize.w / contentW) * PDF_W;
              const sigHeightPt = (sigSize.h / contentH) * PDF_H;
              const pdfX = percentX * PDF_W;
              // Flip Y: screen top->PDF top means PDF Y = high value
              const pdfY = Math.max(0, (1 - percentY) * PDF_H - sigHeightPt);

              // DEBUG: show coordinates for calibration
              const debugInfo = `Click: screen(${Math.round(sigPos.x)},${Math.round(sigPos.y)}) | iframe(top=${Math.round(iframeRect.top)},left=${Math.round(iframeRect.left)},w=${Math.round(iframeRect.width)},h=${Math.round(iframeRect.height)}) | rel(${Math.round(sigPos.x-iframeRect.left)},${Math.round(sigPos.y-iframeRect.top)}) | pdf(x=${Math.round(pdfX)},y=${Math.round(pdfY)}) | page ${currentPage}`;
              console.log("SIG DEBUG:", debugInfo);

              try {
                await api.post(`/documents/${docId}/apply-signature`, {
                  signatureData: signatureImage,
                  pageNumber: currentPage,
                  x: pdfX, y: pdfY,
                  width: sigWidthPt, height: sigHeightPt,
                });
                await reloadPdf();
                setPlacingSignature(false); setSignatureImage(null); setSigPlaced(false);
              } catch (err: any) {
                alert("Failed: " + (err.response?.data?.error || err.message));
              }
            }}>Confirm Signature</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF viewer */}
        <div ref={pdfContainerRef}
          className="flex-1 overflow-auto flex items-start justify-center p-4 relative"
          style={{ background: "#525659" /* TODO: extract to --color-viewer-bg */, cursor: placingSignature && !sigPlaced ? "crosshair" : "default" }}
          onClick={(e) => {
            if (placingSignature && !sigPlaced) {
              setSigPos({ x: e.clientX - sigSize.w / 2, y: e.clientY - sigSize.h / 2 });
              setSigPlaced(true);
            }
          }}>
          <embed key={pdfKey} src={viewUrl} type="application/pdf"
            className="rounded-sm shadow-xl"
            style={{
              width: `${(816 * zoom) / 100}px`, height: `${(1056 * zoom) / 100}px`,
              maxWidth: "100%", border: "none", background: "white",
              pointerEvents: placingSignature ? "none" : "auto",
            }} />

          {/* Signature preview following cursor */}
          {placingSignature && signatureImage && !sigPlaced && (
            <img src={signatureImage} alt="signature"
              className="fixed pointer-events-none opacity-70 border-2 border-dashed rounded"
              style={{
                width: sigSize.w, height: sigSize.h, borderColor: "var(--color-primary)",
                left: "var(--sig-cursor-x, 50%)", top: "var(--sig-cursor-y, 50%)",
                transform: "translate(-50%, -50%)",
              }}
              ref={(el) => {
                if (!el) return;
                const handler = (e: MouseEvent) => {
                  el.style.left = e.clientX + "px";
                  el.style.top = e.clientY + "px";
                };
                window.addEventListener("mousemove", handler);
                (el as any).__cleanup = () => window.removeEventListener("mousemove", handler);
                return () => { if ((el as any).__cleanup) (el as any).__cleanup(); };
              }}
            />
          )}

          {/* Placed signature - draggable + resizable */}
          {placingSignature && sigPlaced && signatureImage && (
            <div className="fixed select-none" style={{ left: sigPos.x, top: sigPos.y, zIndex: 50 }}>
              {/* Signature image - transparent, no box */}
              <img src={signatureImage} alt="placed signature"
                className="cursor-grab active:cursor-grabbing"
                draggable={false}
                style={{
                  width: sigSize.w, height: sigSize.h,
                  objectFit: "contain",
                  border: "1px dashed var(--color-primary)",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                  setDragOffset({ x: e.clientX - sigPos.x, y: e.clientY - sigPos.y });
                }}
              />
              {/* Resize handle - bottom right corner */}
              <div
                className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full cursor-se-resize"
                style={{ background: "var(--color-primary)", border: "2px solid white" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsResizing(true);
                }}
              />
              {/* Size label */}
              <span className="absolute -top-5 left-0 text-[10px] px-1 rounded"
                style={{ background: "var(--color-primary)", color: "white" }}>
                {Math.round(sigSize.w)}x{Math.round(sigSize.h)}
              </span>
            </div>
          )}
        </div>

        {/* Comments panel */}
        {showComments && (
          <div className="w-80 flex flex-col flex-shrink-0 overflow-hidden"
            style={{ background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--color-border-light)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Comments ({comments.length})
              </h3>
              <button onClick={() => setShowComments(false)} className="btn-icon" style={{width:28,height:28}} aria-label="Close comments">X</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {comments.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: "var(--color-text-tertiary)" }}>
                  No comments yet
                </p>
              )}
              {comments.map((c: any) => (
                <div key={c.id} className="p-3 rounded-lg text-sm"
                  style={{ background: "var(--color-surface-secondary)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
                      Page {c.pageNumber}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ color: "var(--color-text-secondary)" }}>{c.content}</p>
                </div>
              ))}
            </div>
            <div className="p-3" style={{ borderTop: "1px solid var(--color-border-light)" }}>
              <div className="flex gap-2">
                <input id="new-comment" name="newComment" className="input text-sm h-9 flex-1" placeholder={`Comment on page ${currentPage}...`}
                  value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  aria-label="Add a comment" />
                <button className="btn btn-primary h-9 text-sm px-3" onClick={handleAddComment}>Send</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={showSignature}
        onClose={() => setShowSignature(false)}
        onApply={(signatureData) => {
          // Enter placement mode - user clicks on PDF to place
          setSignatureImage(signatureData);
          setPlacingSignature(true);
          setSigPlaced(false);
          setShowSignature(false);
        }}
      />

      {/* Form Filler Modal */}
      <FormFillerModal
        isOpen={showFormFiller}
        onClose={() => setShowFormFiller(false)}
        documentId={docId || ""}
        onFilled={() => {
          setDocument({ ...document, version: document.version + 1 });
        }}
      />
    </div>
  );
}

// Toolbar button with visible icon + label
function TbBtn({ icon: Icon, label, onClick, active }: {
  icon: any; label: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
      style={{
        color: active ? "var(--color-primary)" : "var(--color-text-primary)",
        background: active ? "var(--color-primary-light)" : "transparent",
      }}
      onClick={onClick}
      title={label}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--color-surface-secondary)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon size={14} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

// Dropdown menu item
function ToolItem({ icon: Icon, label, onClick, danger }: {
  icon: any; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
      style={{ color: danger ? "var(--color-error)" : "var(--color-text-secondary)" }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-secondary)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <Icon size={14} /> {label}
    </button>
  );
}
