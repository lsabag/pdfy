"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Download, Share2, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Maximize, RotateCw,
  Trash2, Lock, Minimize2, FileOutput, FileImage,
  FileSpreadsheet, Pen, MessageSquare, Edit3,
  Scissors, Merge, MoreHorizontal, FormInput, Undo, Type, Send,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { SignatureModal } from "@/components/signatures/SignatureModal";
import { FormFillerModal } from "@/components/forms/FormFillerModal";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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
  const [showTextStamp, setShowTextStamp] = useState(false);
  const [showSendSign, setShowSendSign] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [selectedAnn, setSelectedAnn] = useState<string | null>(null);

  // pdf.js state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const pageRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pageWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const renderTasksRef = useRef<any[]>([]);
  const pageDims = useRef<{ w: number; h: number }[]>([]); // PDF points per page

  // Canvas context menu (tap to show Sign/Text options)
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null);

  // Pinch-to-zoom (PDF level)
  const lastPinchDist = useRef(0);
  // Touch drag/pinch on placed signature
  const sigTouchDrag = useRef<{ x: number; y: number } | null>(null);
  const sigPinchStart = useRef<{ dist: number; w: number; h: number } | null>(null);

  // Signature/text placement state
  const [placingSignature, setPlacingSignature] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [placingType, setPlacingType] = useState<"sign" | "text">("sign");
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
      // Cache-bust to always get fresh PDF after edits
      const pdfRes = await api.get(`/documents/${id}/download?t=${Date.now()}`, { responseType: "blob" });
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
        // Load annotations
        const { data: anns } = await api.get(`/documents/${docId}/annotations`);
        setAnnotations(anns);
      } catch { router.push("/dashboard"); }
      finally { setLoading(false); }
    })();
    return () => { if (pdfDataUrl) URL.revokeObjectURL(pdfDataUrl); };
  }, [docId, router]);

  // Load PDF with pdf.js
  useEffect(() => {
    if (!pdfDataUrl) return;
    let cancelled = false;
    (async () => {
      const data = await fetch(pdfDataUrl).then((r) => r.arrayBuffer());
      if (cancelled) return;
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      if (cancelled) return;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      pageRefs.current = new Array(pdf.numPages).fill(null);
      pageWrapperRefs.current = new Array(pdf.numPages).fill(null);
    })();
    return () => { cancelled = true; };
  }, [pdfDataUrl]);

  // Page rendering is handled by individual PdfPageCanvas components below

  // IntersectionObserver to track current page on scroll
  useEffect(() => {
    if (!numPages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let bestPage = currentPage;
        let bestRatio = 0;
        entries.forEach((entry) => {
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestPage = parseInt(entry.target.getAttribute("data-page") || "1");
          }
        });
        if (bestRatio > 0.3) setCurrentPage(bestPage);
      },
      { threshold: [0.3, 0.5, 0.7], root: pdfContainerRef.current }
    );
    pageWrapperRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [numPages]);

  // Navigate to page (scroll into view)
  const navigateToPage = (page: number) => {
    setCurrentPage(page);
    const wrapper = pageWrapperRefs.current[page - 1];
    if (wrapper) wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Signature aspect ratio (locked when placed)
  const sigAspectRatio = useRef(sigSize.w / sigSize.h);
  useEffect(() => {
    if (sigSize.w > 0 && sigSize.h > 0) sigAspectRatio.current = sigSize.w / sigSize.h;
  }, [sigPlaced]);

  // Pointer event handlers for signature drag (on image) and resize (on handle)
  // Using setPointerCapture for reliable tracking with finger, stylus, and mouse
  const dragStart = useRef<{ ox: number; oy: number } | null>(null);
  const resizeStart = useRef<{ ox: number; oy: number; w: number } | null>(null);

  const onSigPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { ox: e.clientX - sigPos.x, oy: e.clientY - sigPos.y };
  };
  const onSigPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    if (e.pressure === 0) return; // stylus hover
    setSigPos({ x: e.clientX - dragStart.current.ox, y: e.clientY - dragStart.current.oy });
  };
  const onSigPointerUp = (e: React.PointerEvent) => {
    dragStart.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const onHandlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resizeStart.current = { ox: e.clientX, oy: e.clientY, w: sigSize.w };
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!resizeStart.current) return;
    if (e.pressure === 0) return;
    const dx = e.clientX - resizeStart.current.ox;
    const newW = Math.max(40, resizeStart.current.w + dx);
    setSigSize({ w: newW, h: newW / sigAspectRatio.current });
  };
  const onHandlePointerUp = (e: React.PointerEvent) => {
    resizeStart.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const loadComments = async () => {
    if (!docId) return;
    const { data } = await api.get(`/documents/${docId}/comments`);
    setComments(data);
  };

  // Reload PDF after an edit
  const reloadPdf = async () => {
    if (!docId) return;
    if (pdfDataUrl) URL.revokeObjectURL(pdfDataUrl);
    const blobUrl = await downloadPdfUrl(docId);
    if (blobUrl) setPdfDataUrl(blobUrl); // triggers pdf.js reload via useEffect
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
    // Flatten annotations into PDF then download
    const res = annotations.length > 0
      ? await api.post(`/documents/${docId}/flatten`, {}, { responseType: "blob" })
      : await api.get(`/documents/${docId}/download`, { responseType: "blob" });
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
    await reloadPdf();
  };

  const handleDeletePage = async () => {
    if (!confirm(`Delete page ${currentPage}?`)) return;
    const { data } = await api.delete(`/documents/${docId}/pages`, {
      data: { pageIndices: [currentPage - 1] },
    });
    setDocument({ ...document, pageCount: data.pageCount, version: document.version + 1 });
    if (currentPage > data.pageCount) setCurrentPage(data.pageCount);
    await reloadPdf();
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

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-48px)] -m-6">
      {/* Top toolbar - disabled during signature placement */}
      <div className="flex items-center justify-between px-2 sm:px-4 h-12 flex-shrink-0 gap-1"
        style={{
          background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)",
          pointerEvents: (placingSignature && !sigPlaced) ? "none" : "auto",
          opacity: (placingSignature && !sigPlaced) ? 0.5 : 1,
        }}>

        {/* Left: back + title */}
        <button onClick={() => router.push("/dashboard")} className="btn-icon flex-shrink-0">
          <ArrowLeft size={18} />
        </button>

        {/* Center: zoom + page nav */}
        <div className="flex items-center gap-0.5 px-1 sm:px-2 py-1 rounded-lg flex-shrink-0" style={{ background: "var(--color-surface-secondary)" }}>
          <button className="w-7 h-7 flex items-center justify-center rounded-md"
            style={{ color: "var(--color-text-primary)" }}
            onClick={() => setZoom((z) => Math.max(25, z - 25))}><ZoomOut size={15} /></button>
          <span className="text-xs w-8 sm:w-10 text-center font-medium" style={{ color: "var(--color-text-primary)" }}>{zoom}%</span>
          <button className="w-7 h-7 flex items-center justify-center rounded-md"
            style={{ color: "var(--color-text-primary)" }}
            onClick={() => setZoom((z) => Math.min(400, z + 25))}><ZoomIn size={15} /></button>

          <div className="w-px h-4 mx-0.5" style={{ background: "var(--color-border)" }} />

          <button className="w-7 h-7 flex items-center justify-center rounded-md disabled:opacity-30"
            style={{ color: "var(--color-text-primary)" }}
            disabled={currentPage <= 1} onClick={() => navigateToPage(Math.max(1, currentPage - 1))}><ChevronLeft size={15} /></button>
          <input id="page-number" name="pageNumber" type="number" min={1} max={document.pageCount || 1} value={currentPage}
            onChange={(e) => navigateToPage(Math.min(document.pageCount, Math.max(1, Number(e.target.value))))}
            className="w-8 text-center text-xs h-7 rounded-md font-medium"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
            aria-label="Page number" />
          <span className="text-xs font-medium hidden sm:inline" style={{ color: "var(--color-text-secondary)" }}>/ {document.pageCount}</span>
          <button className="w-7 h-7 flex items-center justify-center rounded-md disabled:opacity-30"
            style={{ color: "var(--color-text-primary)" }}
            disabled={currentPage >= (document.pageCount || 1)} onClick={() => navigateToPage(Math.min(document.pageCount || 1, currentPage + 1))}><ChevronRight size={15} /></button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {/* Always visible: Sign + Text */}
          <TbBtn icon={Pen} label="Sign" onClick={() => setShowSignature(true)} />
          <TbBtn icon={Type} label="Text" onClick={() => setShowTextStamp(true)} />

          {/* Desktop only */}
          <div className="hidden md:flex items-center gap-1">
            <TbBtn icon={Undo} label="Undo" onClick={handleUndo} />
            <TbBtn icon={RotateCw} label="Rotate" onClick={() => handleRotate(90)} />
            <TbBtn icon={MessageSquare} label="Comments" onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}
              active={showComments} />
            <TbBtn icon={FormInput} label="Fill form" onClick={() => setShowFormFiller(true)} />
            <div className="w-px h-5 mx-0.5" style={{ background: "var(--color-border)" }} />
            <TbBtn icon={Share2} label="Share" onClick={handleShare} />
            <TbBtn icon={Download} label="Download" onClick={handleDownload} />
          </div>

          {/* 3-dot menu (always visible, more items on mobile) */}
          <div className="relative">
            <button className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
              style={{ color: "var(--color-text-primary)", background: showTools ? "var(--color-surface-secondary)" : "transparent" }}
              onClick={() => setShowTools(!showTools)}>
              <MoreHorizontal size={18} />
            </button>
            {showTools && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTools(false)} />
                <div className="absolute right-0 top-full mt-1 w-56 py-1 rounded-lg z-50 max-h-[70vh] overflow-y-auto"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-lg)" }}>
                  {/* Mobile-only items */}
                  <div className="md:hidden">
                    <ToolItem icon={Undo} label="Undo" onClick={() => { handleUndo(); setShowTools(false); }} />
                    <ToolItem icon={RotateCw} label="Rotate 90°" onClick={() => { handleRotate(90); setShowTools(false); }} />
                    <ToolItem icon={MessageSquare} label="Comments" onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); setShowTools(false); }} />
                    <ToolItem icon={FormInput} label="Fill form" onClick={() => { setShowFormFiller(true); setShowTools(false); }} />
                    <ToolItem icon={Share2} label="Share link" onClick={() => { handleShare(); setShowTools(false); }} />
                    <ToolItem icon={Download} label="Download" onClick={() => { handleDownload(); setShowTools(false); }} />
                    <div className="my-1" style={{ borderTop: "1px solid var(--color-border-light)" }} />
                  </div>
                  {/* Always in menu */}
                  <ToolItem icon={Send} label="Send for Signature" onClick={() => { setShowSendSign(true); setShowTools(false); }} />
                  <div className="my-1" style={{ borderTop: "1px solid var(--color-border-light)" }} />
                  <ToolItem icon={Trash2} label="Delete current page" onClick={() => { handleDeletePage(); setShowTools(false); }} />
                  <ToolItem icon={Scissors} label="Split document" onClick={() => { handleSplit(); setShowTools(false); }} />
                  <ToolItem icon={Minimize2} label="Optimize / Compress" onClick={() => { handleOptimize(); setShowTools(false); }} />
                  <ToolItem icon={Lock} label="Password protect" onClick={() => { handleEncrypt(); setShowTools(false); }} />
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
            Drag to reposition. Click "Place" to save on page {currentPage}.
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary text-sm h-8" onClick={() => {
              setPlacingSignature(false); setSignatureImage(null); setSigPlaced(false);
            }}>Cancel</button>
            <button type="button" className="btn btn-primary text-sm h-8" onClick={async () => {
              if (!signatureImage || !pdfContainerRef.current || !pdfDoc) return;

              // Find the canvas for the current page
              const canvas = pageRefs.current[currentPage - 1];
              if (!canvas) return;
              const canvasRect = canvas.getBoundingClientRect();

              const page = await pdfDoc.getPage(currentPage);
              const viewport = page.getViewport({ scale: 1 });
              const scale = canvasRect.width / viewport.width;

              const relX = sigPos.x - canvasRect.left;
              const relY = sigPos.y - canvasRect.top;
              const pdfX = Math.max(0, relX / scale);
              const sigWidthPt = sigSize.w / scale;
              const sigHeightPt = sigSize.h / scale;
              const pdfY = Math.max(0, viewport.height - (relY + sigSize.h) / scale);

              try {
                // Save as editable annotation (not burned into PDF)
                const { data } = await api.post(`/documents/${docId}/annotations`, {
                  type: placingType === "text" ? "TEXT" : "SIGN",
                  pageNumber: currentPage,
                  x: pdfX, y: pdfY,
                  width: sigWidthPt, height: sigHeightPt,
                  imageData: signatureImage,
                  textContent: placingType === "text" ? (window as any).__lastTextContent : null,
                  textMeta: placingType === "text" ? (window as any).__lastTextMeta : null,
                });
                setAnnotations((prev) => [...prev, {
                  id: data.id, documentId: docId, type: placingType === "text" ? "TEXT" : "SIGN",
                  pageNumber: currentPage, x: pdfX, y: pdfY,
                  width: sigWidthPt, height: sigHeightPt, imageData: signatureImage,
                  textContent: placingType === "text" ? (window as any).__lastTextContent : null,
                  textMeta: placingType === "text" ? (window as any).__lastTextMeta : null,
                }]);
                setPlacingSignature(false); setSignatureImage(null); setSigPlaced(false);
              } catch (err: any) {
                alert("Failed: " + (err.response?.data?.error || err.message));
              }
            }}>Place</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF viewer */}
        <div ref={pdfContainerRef}
          className="flex-1 overflow-auto flex items-start justify-center p-2 sm:p-4 relative touch-pan-y"
          style={{ background: "#525659", cursor: placingSignature && !sigPlaced ? "crosshair" : "default" }}
          onClick={(e) => {
            // Close canvas menu if open
            if (canvasMenu) { setCanvasMenu(null); return; }
            if (placingSignature && !sigPlaced) {
              const target = e.target as HTMLElement;
              if (target.tagName === "CANVAS" || target.closest("[data-page]")) {
                setSigPos({ x: e.clientX - sigSize.w / 2, y: e.clientY - sigSize.h / 2 });
                setSigPlaced(true);
              }
            } else if (!placingSignature) {
              // Show context menu on canvas tap (for Sign/Text quick access)
              const target = e.target as HTMLElement;
              if (target.tagName === "CANVAS" || target.closest("[data-page]")) {
                setCanvasMenu({ x: e.clientX, y: e.clientY });
              }
            }
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              lastPinchDist.current = Math.hypot(dx, dy);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              const dist = Math.hypot(dx, dy);
              if (lastPinchDist.current > 0) {
                const delta = dist - lastPinchDist.current;
                if (Math.abs(delta) > 10) {
                  setZoom((z) => Math.min(400, Math.max(25, z + (delta > 0 ? 10 : -10))));
                  lastPinchDist.current = dist;
                }
              }
            }
          }}
          onTouchEnd={() => { lastPinchDist.current = 0; }}>
          <div className="flex flex-col items-center gap-4">
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i}
                ref={(el) => { pageWrapperRefs.current[i] = el; }}
                data-page={i + 1}
                className="relative"
              >
                <PdfPageCanvas
                  pdfDoc={pdfDoc}
                  pageNum={i + 1}
                  scale={(Math.min(816, typeof window !== "undefined" ? window.innerWidth - 16 : 816) / 612) * (zoom / 100)}
                  onRendered={(canvas, dims) => {
                    pageRefs.current[i] = canvas;
                    pageDims.current[i] = dims;
                  }}
                />
                {/* Render saved annotations for this page */}
                {annotations.filter((a) => a.pageNumber === i + 1).map((ann) => {
                  const canvasEl = pageRefs.current[i];
                  const dims = pageDims.current[i];
                  if (!canvasEl || !dims) return null;
                  const displayW = canvasEl.clientWidth || canvasEl.width;
                  const scale = displayW / dims.w; // CSS px per PDF pt
                  const left = ann.x * scale;
                  const top = (dims.h - ann.y - ann.height) * scale; // PDF Y is from bottom
                  const w = ann.width * scale;
                  const h = ann.height * scale;
                  const isSelected = selectedAnn === ann.id;
                  return (
                    <div key={ann.id} className="absolute" style={{ left, top, width: w, height: h, cursor: "pointer" }}
                      onClick={(e) => { e.stopPropagation(); setSelectedAnn(isSelected ? null : ann.id); setCanvasMenu(null); }}>
                      <img src={ann.imageData} alt="" style={{ width: "100%", height: "100%", objectFit: "fill" }}
                        draggable={false} />
                      {isSelected && (
                        <div className="absolute -top-8 left-0 flex gap-1" style={{ zIndex: 60 }}>
                          {ann.type === "TEXT" && ann.textContent && (
                            <button className="text-[11px] px-2 py-0.5 rounded whitespace-nowrap"
                              style={{ background: "var(--color-primary)", color: "white" }}
                              onClick={(e) => { e.stopPropagation(); setSelectedAnn(null);
                                // Pre-fill text modal with existing content
                                (window as any).__editAnnotation = ann;
                                setShowTextStamp(true);
                              }}>✏️ Edit</button>
                          )}
                          <button className="text-[11px] px-2 py-0.5 rounded whitespace-nowrap"
                            style={{ background: "var(--color-error)", color: "white" }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await api.delete(`/documents/${docId}/annotations/${ann.id}`);
                              setAnnotations((prev) => prev.filter((a) => a.id !== ann.id));
                              setSelectedAnn(null);
                            }}>🗑 Delete</button>
                        </div>
                      )}
                      {isSelected && <div className="absolute inset-0 border-2 rounded-sm" style={{ borderColor: "var(--color-primary)" }} />}
                    </div>
                  );
                })}
                {/* Page number badge */}
                <span className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.5)", color: "white" }}>
                  {i + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Canvas tap context menu - Sign / Text */}
          {canvasMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCanvasMenu(null)} />
              <div className="fixed z-50 py-1 rounded-lg min-w-[140px]"
                style={{
                  left: canvasMenu.x, top: canvasMenu.y,
                  transform: "translate(-50%, 8px)",
                  background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-lg)",
                }}>
                <ToolItem icon={Pen} label="Sign" onClick={() => { setCanvasMenu(null); setShowSignature(true); }} />
                <ToolItem icon={Type} label="Add Text" onClick={() => { setCanvasMenu(null); setShowTextStamp(true); }} />
              </div>
            </>
          )}

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
            <div className="fixed select-none" style={{ left: sigPos.x, top: sigPos.y, zIndex: 50, touchAction: "none" }}>
              {/* Signature image - pointer drag to move */}
              <img src={signatureImage} alt="placed signature"
                className="cursor-grab active:cursor-grabbing"
                draggable={false}
                style={{
                  width: sigSize.w, height: sigSize.h,
                  objectFit: "fill",
                  border: "1px dashed var(--color-primary)",
                  touchAction: "none",
                }}
                onPointerDown={onSigPointerDown}
                onPointerMove={onSigPointerMove}
                onPointerUp={onSigPointerUp}
                onPointerCancel={onSigPointerUp}
              />
              {/* Resize handle - bottom right corner */}
              <div
                className="absolute -bottom-5 -right-5 w-11 h-11 sm:w-5 sm:h-5 rounded-full cursor-se-resize flex items-center justify-center"
                style={{ background: "var(--color-primary)", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", touchAction: "none" }}
                onPointerDown={onHandlePointerDown}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerUp}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="sm:hidden">
                  <path d="M13 1L1 13M13 6L6 13M13 10L10 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              {/* Edit button - always same size regardless of signature size */}
              <button
                className="fixed text-[11px] px-2 py-1 rounded flex items-center gap-1 whitespace-nowrap"
                style={{ background: "var(--color-primary)", color: "white", border: "none", cursor: "pointer", left: sigPos.x, top: sigPos.y - 26, zIndex: 51 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  // Re-open the appropriate modal with current state
                  setPlacingSignature(false);
                  setSigPlaced(false);
                  if (placingType === "text") {
                    setShowTextStamp(true);
                  } else {
                    setShowSignature(true);
                  }
                }}
              >
                ✏️ {placingType === "text" ? "Edit text" : "Re-sign"}
              </button>
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
          const img = new Image();
          img.onload = () => {
            const ar = img.width / img.height;
            const w = Math.min(180, img.width);
            setSigSize({ w, h: w / ar });
            setSignatureImage(signatureData);
            setPlacingType("sign");
            setPlacingSignature(true);
            setSigPlaced(false);
          };
          img.src = signatureData;
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

      {/* Add Text Modal */}
      {showTextStamp && (
        <TextStampModal
          onClose={() => { setShowTextStamp(false); delete (window as any).__editAnnotation; }}
          onApply={async (imageData) => {
            const editAnn = (window as any).__editAnnotation;
            if (editAnn) {
              // Update existing annotation
              await api.patch(`/documents/${docId}/annotations/${editAnn.id}`, {
                imageData,
                textContent: (window as any).__lastTextContent,
                textMeta: (window as any).__lastTextMeta,
              });
              setAnnotations((prev) => prev.map((a) => a.id === editAnn.id ? {
                ...a, imageData,
                textContent: (window as any).__lastTextContent,
                textMeta: (window as any).__lastTextMeta,
              } : a));
              delete (window as any).__editAnnotation;
              setShowTextStamp(false);
            } else {
              // New text - enter placement mode
              const img = new Image();
              img.onload = () => {
                const ar = img.width / img.height;
                const w = Math.min(250, img.width);
                setSigSize({ w, h: w / ar });
                setSignatureImage(imageData);
                setPlacingType("text");
                setPlacingSignature(true);
                setSigPlaced(false);
              };
              img.src = imageData;
              setShowTextStamp(false);
            }
          }}
        />
      )}

      {/* Send for Signature Modal */}
      {showSendSign && (
        <SendForSignModal docId={docId!} onClose={() => setShowSendSign(false)} />
      )}
    </div>
  );
}

// Send for Signature modal
function SendForSignModal({ docId, onClose }: { docId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ signUrl: string } | null>(null);

  const handleSend = async () => {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/documents/${docId}/signature-requests`, {
        signerName: name.trim(), signerEmail: email.trim(), message: message.trim() || undefined,
      });
      setResult(data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-md rounded-t-xl sm:rounded-xl overflow-hidden"
        style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}>

        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3 className="text-base sm:text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Send for Signature
          </h3>
          <button onClick={onClose} className="btn-icon" aria-label="Close">✕</button>
        </div>

        <div className="px-4 sm:px-5 py-4">
          {result ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">✅</div>
              <p className="font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>Link created!</p>
              <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Send this link to <strong>{name}</strong>:
              </p>
              <div className="flex gap-2">
                <input className="input text-sm flex-1" value={result.signUrl} readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()} />
                <button className="btn btn-primary text-sm" onClick={() => {
                  navigator.clipboard.writeText(result.signUrl);
                  alert("Link copied!");
                }}>Copy</button>
              </div>
              <button className="btn btn-secondary text-sm mt-4 w-full" onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                    Signer name
                  </label>
                  <input className="input" placeholder="e.g. John Doe" value={name}
                    onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                    Signer email
                  </label>
                  <input className="input" type="email" placeholder="john@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                    Message (optional)
                  </label>
                  <textarea className="input resize-none" rows={2} placeholder="Please sign this document..."
                    value={message} onChange={(e) => setMessage(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end mt-4 pb-2 sm:pb-0">
                <button className="btn btn-primary text-sm w-full sm:w-auto" disabled={!name.trim() || !email.trim() || loading}
                  onClick={handleSend}>
                  {loading ? "Sending..." : "Create signing link"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
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

// Self-rendering PDF page canvas - each page handles its own rendering
function PdfPageCanvas({ pdfDoc, pageNum, scale, onRendered }: {
  pdfDoc: any; pageNum: number; scale: number;
  onRendered: (canvas: HTMLCanvasElement, dims: { w: number; h: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    const canvas = canvasRef.current;

    (async () => {
      try {
        // Cancel previous render
        if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch {} }

        const page = await pdfDoc.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;

        onRendered(canvas, { w: baseViewport.width, h: baseViewport.height });
      } catch (e) {
        // Render cancelled or failed - ignore
      }
    })();
  }, [pdfDoc, pageNum, scale]);

  return (
    <canvas ref={canvasRef} className="rounded-sm shadow-xl"
      style={{ background: "white", maxWidth: "100%", display: "block" }} />
  );
}

// Detect RTL from text content
function isRTL(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text.charAt(0));
}

const FONT_OPTIONS = [
  { value: "Arial", label: "Arial" },
  { value: "'Courier New'", label: "Courier New" },
  { value: "Georgia", label: "Georgia" },
  { value: "'Times New Roman'", label: "Times New Roman" },
  { value: "'David Libre', David, serif", label: "David (Hebrew)" },
  { value: "'Segoe UI'", label: "Segoe UI" },
];

// Text history helpers
function getTextHistory(): string[] {
  try { return JSON.parse(localStorage.getItem("pdfy-text-history") || "[]"); } catch { return []; }
}
function saveTextHistory(text: string) {
  const history = getTextHistory().filter((t) => t !== text);
  history.unshift(text); // most recent first
  localStorage.setItem("pdfy-text-history", JSON.stringify(history.slice(0, 50)));
}

function TextStampModal({ onClose, onApply }: { onClose: () => void; onApply: (data: string) => void }) {
  // Check if editing an existing annotation
  const editAnn = (window as any).__editAnnotation as any;
  const [text, setText] = useState(editAnn?.textContent || "");
  const [font, setFont] = useState(editAnn?.textMeta?.font || "Arial");
  const [fontSize, setFontSize] = useState(editAnn?.textMeta?.size || 24);
  const [color, setColor] = useState(editAnn?.textMeta?.color || "#000000");
  const [history] = useState(() => getTextHistory());
  const [showSuggestions, setShowSuggestions] = useState(!editAnn);

  // Clean up edit reference on unmount
  useEffect(() => { return () => { delete (window as any).__editAnnotation; }; }, []);

  const rtl = isRTL(text);

  // Filter suggestions based on current input
  const suggestions = text.trim()
    ? history.filter((h) => h.toLowerCase().includes(text.toLowerCase()) && h !== text)
    : history;

  const generateImage = (): string | null => {
    if (!text.trim()) return null;
    const lines = text.split("\n");
    const lineHeight = fontSize * 1.4;
    const pad = 8;

    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = `${fontSize}px ${font}`;
    let maxWidth = 0;
    lines.forEach((line: string) => {
      const w = measure.measureText(line).width;
      if (w > maxWidth) maxWidth = w;
    });

    const canvasWidth = Math.ceil(maxWidth + pad * 2);
    const canvasHeight = Math.ceil(lines.length * lineHeight + pad * 2);
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px ${font}`;
    ctx.textBaseline = "top";
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    const xStart = rtl ? canvasWidth - pad : pad;
    lines.forEach((line: string, i: number) => {
      ctx.fillText(line, xStart, pad + i * lineHeight);
    });
    return canvas.toDataURL("image/png");
  };

  const handleApply = () => {
    const d = generateImage();
    if (d) {
      saveTextHistory(text.trim());
      // Store text content + meta for re-editing later
      (window as any).__lastTextContent = text.trim();
      (window as any).__lastTextMeta = { font, size: fontSize, color };
      onApply(d);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-md rounded-t-xl sm:rounded-xl overflow-hidden"
        style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}>

        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3 className="text-base sm:text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Add Text
          </h3>
          <button onClick={onClose} className="btn-icon" aria-label="Close">✕</button>
        </div>

        <div className="px-4 sm:px-5 py-4">
          {/* Suggestions from history */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                  {text.trim() ? "Suggestions" : "Recent"}
                </span>
                {!text.trim() && (
                  <button className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}
                    onClick={() => { localStorage.removeItem("pdfy-text-history"); setShowSuggestions(false); }}>
                    Clear history
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {suggestions.slice(0, 12).map((s, i) => (
                  <button key={i}
                    className="px-2.5 py-1 text-xs rounded-full truncate max-w-[200px] transition-colors"
                    style={{ background: "var(--color-surface-secondary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-light)" }}
                    onClick={() => setText(s)}
                    title={s}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls row */}
          <div className="grid grid-cols-2 sm:grid-cols-[1fr_80px_40px] gap-2 mb-3">
            <select className="input text-sm h-9 col-span-2 sm:col-span-1" value={font}
              onChange={(e) => setFont(e.target.value)} aria-label="Font">
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <select className="input text-sm h-9" value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))} aria-label="Size">
              {[14, 18, 24, 30, 36, 42, 48].map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
            <input type="color" className="h-9 w-full rounded-md cursor-pointer" value={color}
              onChange={(e) => setColor(e.target.value)} aria-label="Color"
              style={{ border: "1px solid var(--color-border)" }} />
          </div>

          <textarea className="input resize-none w-full"
            style={{ fontFamily: font, fontSize: Math.min(fontSize, 32) + "px", minHeight: "100px", direction: rtl ? "rtl" : "ltr", color }}
            placeholder="Type text..."
            rows={3}
            value={text} onChange={(e) => { setText(e.target.value); setShowSuggestions(true); }} autoFocus
            aria-label="Text content" />

          {text && (
            <div className="mt-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {rtl ? "← RTL (עברית/ערבית)" : "LTR (English) →"}
            </div>
          )}

          <div className="flex justify-end mt-4 pb-2 sm:pb-0">
            <button className="btn btn-primary text-sm w-full sm:w-auto" disabled={!text.trim()}
              onClick={handleApply}>
              Place on PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
