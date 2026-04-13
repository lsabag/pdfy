"use client";

import Link from "next/link";
import {
  FileText, Star, MoreVertical, Download, Trash2, Share2,
  Edit3, FolderInput, Copy, Lock, Minimize2, FileOutput,
  RotateCw, Scissors, Merge, FileImage, FileSpreadsheet, Pen,
} from "lucide-react";
import { useState } from "react";
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
  const [newName, setNewName] = useState(name);
  const [optimizing, setOptimizing] = useState(false);
  const { toggleFavorite, deleteDocument, fetchDocuments } = useDocumentStore();

  const closeMenu = () => { setShowMenu(false); setMenuPos(null); };

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
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}
      onContextMenu={handleContextMenu}
    >
      {/* Thumbnail */}
      <Link href={`/dashboard/view?id=${id}`}>
        <div className="h-44 flex items-center justify-center relative"
          style={{ background: "var(--color-surface-secondary)" }}>
          {status === "PROCESSING" || optimizing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                {optimizing ? "Optimizing..." : "Processing..."}
              </span>
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

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => toggleFavorite(id)} className="btn btn-ghost w-7 h-7 p-0">
              <Star size={14} fill={isFavorite ? "var(--color-warning)" : "none"}
                style={{ color: isFavorite ? "var(--color-warning)" : "var(--color-text-tertiary)" }} />
            </button>

            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="btn btn-ghost w-7 h-7 p-0">
                <MoreVertical size={14} />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={closeMenu} />
                  <div className="py-1 rounded-lg z-50 max-h-[70vh] overflow-y-auto w-52"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      boxShadow: "var(--shadow-lg)",
                      ...(menuPos
                        ? { position: "fixed", left: menuPos.x, top: menuPos.y }
                        : { position: "absolute", right: 0, top: "100%", marginTop: 4 }),
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
          </div>
        </div>
      </div>
    </div>
  );
}
