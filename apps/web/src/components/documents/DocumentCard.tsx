"use client";

import Link from "next/link";
import {
  FileText, Star, MoreVertical, Download, Trash2, Share2,
  Edit3, FolderInput, Copy, Lock, Minimize2, FileOutput,
  RotateCw, Scissors, Merge, FileImage, FileSpreadsheet, Pen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useDocumentStore } from "@/stores/document-store";
import { api } from "@/lib/api-client";

interface DocumentCardProps {
  id: string;
  name: string;
  sizeBytes: number;
  pageCount: number;
  status: string;
  thumbnailKey: string | null;
  isFavorite: boolean;
  updatedAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function MenuItem({ icon: Icon, label, onClick, danger }: {
  icon: any; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
      style={{ color: danger ? "var(--color-error)" : "var(--color-text-secondary)" }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-secondary)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1" style={{ borderTop: "1px solid var(--color-border-light)" }} />;
}

export function DocumentCard({
  id, name, sizeBytes, pageCount, status, thumbnailKey, isFavorite, updatedAt,
}: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [newName, setNewName] = useState(name);
  const [optimizing, setOptimizing] = useState(false);
  const { toggleFavorite, deleteDocument, fetchDocuments } = useDocumentStore();

  const closeMenu = () => { setShowMenu(false); setMenuPos(null); };

  // Load PDF thumbnail preview
  useEffect(() => {
    if (status !== "READY") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/documents/${id}/download`, { responseType: "blob" });
        const blob = res.data as Blob;
        // Skip if response is an error (JSON, not PDF)
        if (blob.type === "application/json" || blob.size < 100) return;
        if (!cancelled) setThumbUrl(URL.createObjectURL(blob));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [id, status]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleDownload = async () => {
    closeMenu();
    const response = await api.get(`/documents/${id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === name) { setIsRenaming(false); return; }
    await api.patch(`/documents/${id}`, { name: newName.trim() });
    setIsRenaming(false);
    fetchDocuments();
  };

  const handleOptimize = async () => {
    closeMenu();
    setOptimizing(true);
    try {
      const { data } = await api.post(`/documents/${id}/optimize`);
      alert(`Optimized! Saved ${formatFileSize(data.savedBytes)} (${data.savedPercent}%)`);
      fetchDocuments();
    } catch {
      alert("Optimization failed");
    } finally {
      setOptimizing(false);
    }
  };

  const handleShare = async () => {
    closeMenu();
    try {
      const { data } = await api.post(`/documents/${id}/share`, { permission: "VIEW" });
      const shareUrl = `${window.location.origin}/share?token=${data.token}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("Share link copied to clipboard!");
    } catch {
      alert("Failed to create share link");
    }
  };

  const handleConvert = async (format: string) => {
    closeMenu();
    try {
      await api.post(`/documents/${id}/convert`, { format });
      alert(`Conversion to ${format.replace("PDF_TO_", "")} started!`);
    } catch {
      alert("Conversion failed");
    }
  };

  const handleEncrypt = async () => {
    closeMenu();
    const password = prompt("Enter password to protect this PDF:");
    if (!password) return;
    try {
      await api.post(`/documents/${id}/encrypt`, { userPassword: password });
      alert("PDF is now password-protected!");
      fetchDocuments();
    } catch {
      alert("Encryption failed");
    }
  };

  return (
    <div
      className="group rounded-xl overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)]"
      style={{ background: "var(--color-surface)", boxShadow: "0 0 0 1px var(--color-border-light)" }}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/docId", id); }}
    >
      {/* Thumbnail */}
      <Link href={`/dashboard/view?id=${id}`}>
        <div className="h-44 flex items-center justify-center"
          style={{ background: "white", overflow: "hidden", position: "relative" }}>
          {status === "PROCESSING" || optimizing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                {optimizing ? "Optimizing..." : "Processing..."}
              </span>
            </div>
          ) : thumbUrl ? (
            <div style={{
              width: "100%", height: "100%", overflow: "hidden", position: "relative", background: "white",
            }}>
              <div style={{
                width: "850px", height: "1100px",
                transform: "scale(0.22)", transformOrigin: "top left",
                position: "absolute", top: -8, left: -5,
              }}>
                <iframe src={thumbUrl + "#toolbar=0&navpanes=0&scrollbar=0&view=FitH"}
                  className="pointer-events-none"
                  style={{ border: "none", background: "white", width: "100%", height: "100%", margin: 0, padding: 0 }}
                  title={`Preview ${name}`} tabIndex={-1} />
              </div>
            </div>
          ) : (
            <FileText size={48} strokeWidth={1} style={{ color: "var(--color-text-tertiary)" }} />
          )}
          {pageCount > 0 && (
            <span className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "var(--color-surface)", color: "var(--color-text-secondary)", boxShadow: "var(--shadow-sm)" }}>
              {pageCount} {pageCount === 1 ? "page" : "pages"}
            </span>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <form onSubmit={(e) => { e.preventDefault(); handleRename(); }} className="flex gap-1">
                <input className="input text-sm h-7 px-2 flex-1" value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleRename} autoFocus />
              </form>
            ) : (
              <Link href={`/dashboard/view?id=${id}`}>
                <h3 className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }} title={name}>
                  {name}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                  {formatFileSize(sizeBytes)} &middot; {formatDate(updatedAt)}
                </p>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => toggleFavorite(id)}
              className="w-8 h-8 flex items-center justify-center rounded-md transition-all"
              style={{
                background: isFavorite ? "#FFF8E1" : "#F0F0F0",
                border: isFavorite ? "1px solid #FFD54F" : "1px solid #D5D5D5",
              }}>
              <Star size={14} fill={isFavorite ? "#F5A623" : "none"}
                style={{ color: isFavorite ? "#F5A623" : "#6E6E6E" }} />
            </button>

            <div className="relative">
              <button ref={(el) => { if (el) (el as any).__btnRef = el; }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuPos({ x: rect.right - 208, y: rect.bottom + 4 });
                  setShowMenu(!showMenu);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-md transition-all"
                style={{ background: "#F0F0F0", border: "1px solid #D5D5D5", color: "#2C2C2C" }}>
                <MoreVertical size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu - rendered as fixed portal outside the card */}
      {showMenu && menuPos && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={closeMenu} />
          <div className="fixed py-1 rounded-lg z-[9999] max-h-[70vh] overflow-y-auto w-52"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.16)",
              left: Math.min(menuPos.x, window.innerWidth - 220),
              top: Math.min(menuPos.y, window.innerHeight - 400),
            }}>

                    {/* Basic actions */}
                    <MenuItem icon={Edit3} label="Rename" onClick={() => { closeMenu(); setIsRenaming(true); }} />
                    <MenuItem icon={Download} label="Download" onClick={handleDownload} />
                    <MenuItem icon={Copy} label="Duplicate" onClick={async () => {
                      closeMenu();
                      const res = await api.get(`/documents/${id}/download`, { responseType: "arraybuffer" });
                      const formData = new FormData();
                      formData.append("file", new Blob([res.data], { type: "application/pdf" }), `${name} (copy).pdf`);
                      await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
                      fetchDocuments();
                    }} />
                    <MenuItem icon={Share2} label="Share link" onClick={handleShare} />
                    <MenuItem icon={FolderInput} label="Move to folder" onClick={async () => {
                      closeMenu();
                      const folder = prompt("Enter folder name to move to (or leave empty for root):");
                      if (folder === null) return;
                      if (!folder.trim()) {
                        await api.patch(`/documents/${id}`, { folderId: null });
                      } else {
                        // Find or create folder
                        const { data: folders } = await api.get("/folders");
                        let target = folders.find((f: any) => f.name.toLowerCase() === folder.toLowerCase());
                        if (!target) {
                          const { data: newF } = await api.post("/folders", { name: folder });
                          target = newF;
                        }
                        await api.patch(`/documents/${id}`, { folderId: target.id });
                      }
                      fetchDocuments();
                    }} />
                    <MenuItem icon={Star} label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                      onClick={() => { closeMenu(); toggleFavorite(id); }} />

                    <MenuDivider />

                    {/* PDF operations */}
                    <MenuItem icon={Minimize2} label="Optimize / Compress" onClick={handleOptimize} />
                    <MenuItem icon={Lock} label="Password protect" onClick={handleEncrypt} />
                    <MenuItem icon={Pen} label="Sign document" onClick={() => {
                      closeMenu();
                      window.location.href = `/dashboard/view?id=${id}`;
                    }} />

                    <MenuDivider />

                    {/* Convert */}
                    <MenuItem icon={FileOutput} label="Convert to Word" onClick={() => handleConvert("PDF_TO_DOCX")} />
                    <MenuItem icon={FileSpreadsheet} label="Convert to Excel" onClick={() => handleConvert("PDF_TO_XLSX")} />
                    <MenuItem icon={FileImage} label="Convert to Image (PNG)" onClick={() => handleConvert("PDF_TO_PNG")} />

                    <MenuDivider />

            {/* Danger zone */}
            <MenuItem icon={Trash2} label="Move to trash" danger onClick={() => { deleteDocument(id); closeMenu(); }} />
          </div>
        </>
      )}
    </div>
  );
}
