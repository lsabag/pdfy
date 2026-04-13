"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List, FolderOpen, Plus, FolderInput } from "lucide-react";
import { useDocumentStore } from "@/stores/document-store";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDropzone } from "@/components/documents/UploadDropzone";
import { api } from "@/lib/api-client";
import Link from "next/link";

interface FolderItem {
  id: string;
  name: string;
  color: string | null;
  documentCount: number;
}

export default function DashboardPage() {
  const { documents, isLoading, viewMode, setViewMode, fetchDocuments, pagination } = useDocumentStore();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingDocId, setMovingDocId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
    loadFolders();
  }, [fetchDocuments]);

  const loadFolders = async () => {
    try {
      const { data } = await api.get("/folders");
      setFolders(data);
    } catch {}
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await api.post("/folders", { name: newFolderName.trim() });
    setNewFolderName("");
    setShowNewFolder(false);
    loadFolders();
  };

  const moveToFolder = async (docId: string, folderId: string | null) => {
    await api.patch(`/documents/${docId}`, { folderId });
    setMovingDocId(null);
    fetchDocuments();
    loadFolders();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Documents</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {pagination ? `${pagination.total} document${pagination.total !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary text-sm h-9" onClick={() => setShowNewFolder(true)}>
            <Plus size={14} /> New Folder
          </button>
          <div className="flex items-center rounded-lg p-1" style={{ background: "var(--color-surface-secondary)" }}>
            <button className="p-1.5 rounded-md transition-colors"
              style={{ background: viewMode === "grid" ? "var(--color-surface)" : "transparent", color: viewMode === "grid" ? "var(--color-text-primary)" : "var(--color-text-tertiary)", boxShadow: viewMode === "grid" ? "var(--shadow-sm)" : "none" }}
              onClick={() => setViewMode("grid")}><LayoutGrid size={18} /></button>
            <button className="p-1.5 rounded-md transition-colors"
              style={{ background: viewMode === "list" ? "var(--color-surface)" : "transparent", color: viewMode === "list" ? "var(--color-text-primary)" : "var(--color-text-tertiary)", boxShadow: viewMode === "list" ? "var(--shadow-sm)" : "none" }}
              onClick={() => setViewMode("list")}><List size={18} /></button>
          </div>
        </div>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex gap-2 mb-4">
          <input id="new-folder-name" name="newFolderName" className="input flex-1" placeholder="Folder name..."
            value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFolder()} autoFocus />
          <button className="btn btn-primary text-sm" onClick={createFolder}>Create</button>
          <button className="btn btn-secondary text-sm" onClick={() => setShowNewFolder(false)}>Cancel</button>
        </div>
      )}

      {/* Folders section */}
      {folders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
            <FolderOpen size={15} /> Folders
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <Link key={folder.id} href={`/dashboard/folder?id=${folder.id}`}
                className="flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-[var(--shadow-md)]"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.background = "var(--color-primary-light)"; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-light)"; e.currentTarget.style.background = "var(--color-surface)"; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "var(--color-border-light)";
                  e.currentTarget.style.background = "var(--color-surface)";
                  const docId = e.dataTransfer.getData("text/docId");
                  if (docId) moveToFolder(docId, folder.id);
                }}>
                <FolderOpen size={20} style={{ color: folder.color || "var(--color-primary)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{folder.name}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{folder.documentCount} files</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upload */}
      <div className="mb-6">
        <UploadDropzone />
      </div>

      {/* Move to folder modal */}
      {movingDocId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setMovingDocId(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-xl p-5 z-50"
            style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Move to folder</h3>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              <button onClick={() => moveToFolder(movingDocId, null)}
                className="flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <FileIcon /> Root (no folder)
              </button>
              {folders.map((f) => (
                <button key={f.id} onClick={() => moveToFolder(movingDocId, f.id)}
                  className="flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors"
                  style={{ color: "var(--color-text-primary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <FolderOpen size={16} style={{ color: f.color || "var(--color-primary)" }} /> {f.name}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary w-full mt-3 text-sm" onClick={() => setMovingDocId(null)}>Cancel</button>
          </div>
        </>
      )}

      {/* Loading */}
      {isLoading && documents.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && documents.length === 0 && folders.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--color-surface-secondary)" }}>
            <LayoutGrid size={24} style={{ color: "var(--color-text-tertiary)" }} />
          </div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>No documents yet</h3>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Upload your first PDF to get started</p>
        </div>
      )}

      {/* Documents heading */}
      {documents.length > 0 && (
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
          <FileIcon /> Files
        </h2>
      )}

      {/* Document grid */}
      {viewMode === "grid" && documents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} {...doc} />
          ))}
        </div>
      )}

      {/* Document list */}
      {viewMode === "list" && documents.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                {["Name", "Size", "Pages", "Modified"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="cursor-pointer transition-colors"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/docId", doc.id)}
                  style={{ borderBottom: "1px solid var(--color-border-light)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => (window.location.href = `/dashboard/view?id=${doc.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileIcon />
                      <span className="text-sm font-medium truncate max-w-xs" style={{ color: "var(--color-text-primary)" }}>{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{formatSize(doc.sizeBytes)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{doc.pageCount || "-"}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-tertiary)" }}>{new Date(doc.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FileIcon() {
  return (
    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#FDE8E8" }}>
      <span className="text-xs font-bold" style={{ color: "#D7373F" }}>PDF</span>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
