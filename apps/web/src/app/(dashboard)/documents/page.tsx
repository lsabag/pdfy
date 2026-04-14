"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FolderOpen, Star, Share2, Users,
  Upload, LayoutGrid, List, ArrowDown, FileText,
  Plus,
} from "lucide-react";
import { useDocumentStore } from "@/stores/document-store";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDropzone } from "@/components/documents/UploadDropzone";
import { api } from "@/lib/api-client";
import Link from "next/link";

interface FolderItem { id: string; name: string; color: string | null; documentCount: number }

const sideFilters = [
  { key: "all", label: "Your documents", icon: FileText },
  { key: "starred", label: "Starred", icon: Star },
  { key: "shared-by-you", label: "Shared by you", icon: Share2 },
  { key: "shared-by-others", label: "Shared by others", icon: Users },
];

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>}>
      <DocumentsContent />
    </Suspense>
  );
}

function DocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const { documents, isLoading, viewMode, setViewMode, fetchDocuments, pagination } = useDocumentStore();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageQuota, setStorageQuota] = useState(53687091200);

  useEffect(() => {
    loadFolders();
    loadStorage();
  }, []);

  useEffect(() => {
    const params: Record<string, string> = { sortBy, sortOrder: "asc" };
    if (urlSearch) params.search = urlSearch;
    if (filter === "starred") params.favorites = "true";
    fetchDocuments(params);
  }, [filter, sortBy, urlSearch, fetchDocuments]);

  const loadFolders = async () => {
    try { const { data } = await api.get("/folders"); setFolders(data); } catch {}
  };

  const loadStorage = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setStorageUsed(data.storageUsedBytes || 0);
      setStorageQuota(data.storageQuotaBytes || 53687091200);
    } catch {}
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await api.post("/folders", { name: newFolderName.trim() });
    setNewFolderName(""); setShowNewFolder(false); loadFolders();
  };

  const moveToFolder = async (docId: string, folderId: string) => {
    await api.patch(`/documents/${docId}`, { folderId });
    fetchDocuments({ sortBy, sortOrder: "asc" }); loadFolders();
  };

  const formatBytes = (b: number) => {
    if (b < 1024 * 1024) return (b / 1024).toFixed(2) + " KB";
    if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + " MB";
    return (b / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const storagePercent = storageQuota > 0 ? Math.round((storageUsed / storageQuota) * 100) : 0;

  return (
    <div className="flex gap-6 min-h-[calc(100vh-80px)]">
      {/* Left sidebar filters */}
      <aside className="w-48 flex-shrink-0 hidden md:flex flex-col justify-between py-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-2"
            style={{ color: "var(--color-primary)" }}>FILES</p>
          <nav className="flex flex-col gap-0.5">
            {sideFilters.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors"
                style={{
                  color: filter === f.key ? "var(--color-primary)" : "var(--color-text-secondary)",
                  background: filter === f.key ? "var(--color-primary-light)" : "transparent",
                  borderLeft: filter === f.key ? "3px solid var(--color-primary)" : "3px solid transparent",
                }}>
                {f.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Storage usage - bottom */}
        <div className="px-2 pt-4" style={{ borderTop: "1px solid var(--color-border-light)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
            {formatBytes(storageUsed)} of {formatBytes(storageQuota)} used
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--color-border-light)" }}>
              <div className="h-full rounded-full" style={{ background: "var(--color-primary)", width: `${Math.min(100, storagePercent)}%` }} />
            </div>
            <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>{storagePercent}%</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Your documents</h1>
          <div className="flex items-center gap-2">
            <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => setShowNewFolder(true)} title="New folder">
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* New folder input */}
        {showNewFolder && (
          <div className="flex gap-2 mb-4">
            <input id="doc-new-folder" name="newFolderName" className="input flex-1 h-9 text-sm"
              placeholder="Folder name..." value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()} autoFocus />
            <button className="btn btn-primary text-xs h-9" onClick={createFolder}>Create</button>
            <button className="btn btn-secondary text-xs h-9" onClick={() => setShowNewFolder(false)}>Cancel</button>
          </div>
        )}

        {/* Sort + view controls */}
        <div className="flex items-center justify-between mb-4 pb-3"
          style={{ borderBottom: "1px solid var(--color-border-light)" }}>
          <div className="flex items-center gap-1">
            <input type="checkbox" className="w-4 h-4 rounded" id="select-all" aria-label="Select all" />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded"
              style={{ color: "var(--color-text-secondary)" }}
              onClick={() => setSortBy(sortBy === "name" ? "updatedAt" : "name")}>
              {sortBy === "name" ? "NAME" : "DATE"} <ArrowDown size={12} />
            </button>
            <div className="flex items-center rounded-lg p-0.5" style={{ background: "var(--color-surface-secondary)" }}>
              <button className="p-1 rounded" onClick={() => setViewMode("list")}
                style={{ background: viewMode === "list" ? "var(--color-surface)" : "transparent", color: viewMode === "list" ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
                <List size={16} /></button>
              <button className="p-1 rounded" onClick={() => setViewMode("grid")}
                style={{ background: viewMode === "grid" ? "var(--color-surface)" : "transparent", color: viewMode === "grid" ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
                <LayoutGrid size={16} /></button>
            </div>
          </div>
        </div>

        {/* Upload dropzone (hidden, activates via event or modal) */}
        <UploadDropzone />

        {/* Loading */}
        {isLoading && documents.length === 0 && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Grid view: folders + files mixed */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Folders first */}
            {folders.map((f) => (
              <Link key={f.id} href={`/dashboard/folder?id=${f.id}`}
                className="rounded-xl overflow-hidden transition-all hover:shadow-[var(--shadow-md)]"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--color-primary)"; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-light)"; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--color-border-light)"; const id = e.dataTransfer.getData("text/docId"); if (id) moveToFolder(id, f.id); }}>
                <div className="h-36 flex items-center justify-center" style={{ background: "var(--color-surface-secondary)" }}>
                  <FolderOpen size={48} strokeWidth={1} style={{ color: f.color || "var(--color-text-tertiary)" }} />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{f.name}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Folder</p>
                </div>
              </Link>
            ))}
            {/* Files */}
            {documents.map((doc) => <DocumentCard key={doc.id} {...doc} />)}
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && (
          <div>
            {/* Folder rows */}
            {folders.map((f) => (
              <Link key={f.id} href={`/dashboard/folder?id=${f.id}`}
                className="flex items-center gap-4 px-3 py-3 rounded-lg transition-colors"
                style={{ borderBottom: "1px solid var(--color-border-light)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = "var(--color-primary-light)"; }}
                onDragLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.background = "transparent"; const id = e.dataTransfer.getData("text/docId"); if (id) moveToFolder(id, f.id); }}>
                <input type="checkbox" className="w-4 h-4 rounded" onClick={(e) => e.preventDefault()} />
                <FolderOpen size={20} style={{ color: f.color || "var(--color-text-tertiary)" }} />
                <span className="text-sm font-medium flex-1" style={{ color: "var(--color-text-primary)" }}>{f.name}</span>
                <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Folder</span>
              </Link>
            ))}
            {/* File rows */}
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 px-3 py-3 rounded-lg transition-colors cursor-pointer"
                draggable onDragStart={(e) => e.dataTransfer.setData("text/docId", doc.id)}
                style={{ borderBottom: "1px solid var(--color-border-light)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => router.push(`/dashboard/view?id=${doc.id}`)}>
                <input type="checkbox" className="w-4 h-4 rounded" onClick={(e) => e.stopPropagation()} />
                <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: "#FDE8E8" }}>
                  <span className="text-[9px] font-bold" style={{ color: "#D7373F" }}>PDF</span>
                </div>
                <span className="text-sm font-medium flex-1 truncate" style={{ color: "var(--color-text-primary)" }}>{doc.name}</span>
                <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-text-tertiary)" }}>
                  <Users size={11} /> PDF
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && documents.length === 0 && folders.length === 0 && (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No documents yet. Upload a file to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
