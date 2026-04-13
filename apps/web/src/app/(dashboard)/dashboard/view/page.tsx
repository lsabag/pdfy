"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Download, Share2, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Maximize, RotateCw,
  Trash2, Lock, Minimize2, FileOutput, FileImage,
  FileSpreadsheet, Pen, MessageSquare, Edit3,
  Scissors, Merge, MoreHorizontal, FormInput,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { SignatureModal } from "@/components/signatures/SignatureModal";
import { FormFillerModal } from "@/components/forms/FormFillerModal";

export default function DocumentViewPage() {
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
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (!docId) { router.push("/dashboard"); return; }
    (async () => {
      try {
        const { data } = await api.get(`/documents/${docId}`);
        setDocument(data);
      } catch { router.push("/dashboard"); }
      finally { setLoading(false); }
    })();
  }, [docId, router]);

  const loadComments = async () => {
    if (!docId) return;
    const { data } = await api.get(`/documents/${docId}/comments`);
    setComments(data);
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

  const downloadUrl = `${api.defaults.baseURL}/documents/${docId}/download`;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-48px)] -m-6">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 h-12 flex-shrink-0"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>

        {/* Left: back + title */}
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/dashboard")} className="btn btn-ghost w-8 h-8 p-0">
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
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost w-8 h-8 p-0" onClick={() => setZoom((z) => Math.max(25, z - 25))}><ZoomOut size={15} /></button>
          <span className="text-xs w-10 text-center" style={{ color: "var(--color-text-secondary)" }}>{zoom}%</span>
          <button className="btn btn-ghost w-8 h-8 p-0" onClick={() => setZoom((z) => Math.min(400, z + 25))}><ZoomIn size={15} /></button>
          <div className="w-px h-4 mx-1" style={{ background: "var(--color-border)" }} />
          <button className="btn btn-ghost w-7 h-7 p-0" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}><ChevronLeft size={15} /></button>
          <input type="number" min={1} max={document.pageCount || 1} value={currentPage}
            onChange={(e) => setCurrentPage(Math.min(document.pageCount, Math.max(1, Number(e.target.value))))}
            className="w-10 text-center text-xs h-7 rounded-md" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }} />
          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>/ {document.pageCount}</span>
          <button className="btn btn-ghost w-7 h-7 p-0" disabled={currentPage >= (document.pageCount || 1)} onClick={() => setCurrentPage((p) => p + 1)}><ChevronRight size={15} /></button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-0.5">
          <button className="btn btn-ghost w-8 h-8 p-0" onClick={() => handleRotate(90)} title="Rotate page"><RotateCw size={15} /></button>
          <button className="btn btn-ghost w-8 h-8 p-0" onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}
            title="Comments"><MessageSquare size={15} /></button>
          <button className="btn btn-ghost w-8 h-8 p-0" onClick={() => setShowSignature(true)} title="Sign"><Pen size={15} /></button>
          <button className="btn btn-ghost w-8 h-8 p-0" onClick={() => setShowFormFiller(true)} title="Fill form"><FormInput size={15} /></button>
          <button className="btn btn-ghost w-8 h-8 p-0" onClick={handleShare} title="Share"><Share2 size={15} /></button>
          <button className="btn btn-ghost w-8 h-8 p-0" onClick={handleDownload} title="Download"><Download size={15} /></button>

          {/* More tools dropdown */}
          <div className="relative">
            <button className="btn btn-ghost w-8 h-8 p-0" onClick={() => setShowTools(!showTools)}><MoreHorizontal size={15} /></button>
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

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF viewer */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-4" style={{ background: "#525659" }}>
          <iframe src={downloadUrl} className="rounded-sm shadow-xl"
            style={{ width: `${(816 * zoom) / 100}px`, height: `${(1056 * zoom) / 100}px`, maxWidth: "100%", border: "none", background: "white" }}
            title={document.name} />
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
              <button onClick={() => setShowComments(false)} className="btn btn-ghost w-7 h-7 p-0 text-xs">X</button>
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
                <input className="input text-sm h-9 flex-1" placeholder={`Comment on page ${currentPage}...`}
                  value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()} />
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
        onApply={async (signatureData) => {
          try {
            await api.post(`/documents/${docId}/apply-signature`, {
              signatureData,
              pageNumber: currentPage,
              x: 100, y: 600, width: 200, height: 60,
            });
            setShowSignature(false);
            alert(`Signature applied to page ${currentPage}!`);
          } catch {
            alert("Failed to apply signature");
          }
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
