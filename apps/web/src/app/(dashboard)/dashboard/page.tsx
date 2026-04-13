"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, MessageSquare, Merge, FileSignature, Scissors, FileOutput,
  RotateCw, Lock, ChevronRight, ChevronLeft, Star, Share2, Clock,
  FolderOpen, Plus, Upload, LayoutGrid, List,
} from "lucide-react";
import { useDocumentStore } from "@/stores/document-store";
import { useAuthStore } from "@/stores/auth-store";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDropzone } from "@/components/documents/UploadDropzone";
import { api } from "@/lib/api-client";
import Link from "next/link";

const quickTools = [
  { icon: FileText, title: "Edit text & Images", desc: "Modify or add text, images, pages, and more", color: "#E34F26", href: "/dashboard/edit" },
  { icon: FileOutput, title: "Export a PDF", desc: "Convert to other formats, images, and more", color: "#7B61FF", href: "/dashboard/convert" },
  { icon: Merge, title: "Combine files", desc: "Merge multiple files into a single PDF", color: "#4CAF50", href: "/dashboard/edit" },
  { icon: FileSignature, title: "Request e-signatures", desc: "Send a document to anyone to e-sign fast", color: "#2196F3", href: "/dashboard/esign" },
  { icon: Scissors, title: "Delete & reorder pages", desc: "Delete, rotate, extract, insert, or reorder", color: "#E91E63", href: "/dashboard/edit" },
  { icon: RotateCw, title: "Rotate pages", desc: "Rotate pages left or right", color: "#9C27B0", href: "/dashboard/edit" },
  { icon: Lock, title: "Protect a PDF", desc: "Set a password to protect a PDF", color: "#3F51B5", href: "/dashboard/edit" },
];

interface FolderItem { id: string; name: string; color: string | null; documentCount: number }

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { documents, isLoading, viewMode, setViewMode, fetchDocuments } = useDocumentStore();
  const [tab, setTab] = useState<"recent" | "starred" | "shared">("recent");
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const toolsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments({ sortBy: "updatedAt", sortOrder: "desc" });
    loadFolders();
  }, [fetchDocuments]);

  useEffect(() => {
    if (tab === "starred") fetchDocuments({ favorites: "true" });
    else if (tab === "shared") fetchDocuments({});
    else fetchDocuments({ sortBy: "updatedAt", sortOrder: "desc" });
  }, [tab, fetchDocuments]);

  const loadFolders = async () => {
    try { const { data } = await api.get("/folders"); setFolders(data); } catch {}
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await api.post("/folders", { name: newFolderName.trim() });
    setNewFolderName(""); setShowNewFolder(false); loadFolders();
  };

  const scrollTools = (dir: number) => {
    toolsScrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  const moveToFolder = async (docId: string, folderId: string) => {
    await api.patch(`/documents/${docId}`, { folderId });
    fetchDocuments(); loadFolders();
  };

  return (
    <div>
      {/* Hero banner */}
      <div className="rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #E8F0FE 0%, #D4E4FD 100%)", border: "1px solid #C4D7F5" }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
            Hi, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Your workspace for editing, converting, signing, and sharing PDFs.
          </p>
        </div>
        <button className="btn btn-primary h-10 px-5"
          onClick={() => document.dispatchEvent(new CustomEvent("pdfy:open-upload"))}>
          <Upload size={16} /> Upload PDF
        </button>
      </div>

      {/* Tools carousel */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Tools</h2>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/tools" className="text-xs font-medium" style={{ color: "var(--color-primary)" }}>
              All tools
            </Link>
            <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => scrollTools(-1)}>
              <ChevronLeft size={14} />
            </button>
            <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => scrollTools(1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div ref={toolsScrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: "none" }}>
          {quickTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.title} href={tool.href}
                className="flex-shrink-0 w-56 rounded-xl p-4 transition-all hover:shadow-[var(--shadow-md)]"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tool.color + "18" }}>
                    <Icon size={16} style={{ color: tool.color }} />
                  </div>
                  <h3 className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{tool.title}</h3>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{tool.desc}</p>
                <p className="text-[11px] mt-2 font-medium" style={{ color: "var(--color-primary)" }}>
                  Drag and drop, or <span className="underline">select a file</span>
                </p>
              </Link>
            );
          })}
          {/* CTA card */}
          <div className="flex-shrink-0 w-48 rounded-xl p-4 flex flex-col items-center justify-center text-center"
            style={{ background: "var(--color-primary)", color: "white" }}>
            <Upload size={24} className="mb-2 opacity-80" />
            <p className="text-xs font-medium">Drag and drop, or select files to convert, edit, and more</p>
          </div>
        </div>
      </div>

      {/* Upload dropzone - first */}
      <div className="mb-6"><UploadDropzone /></div>

      {/* Folders - second */}
      {(folders.length > 0 || showNewFolder) && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
              <FolderOpen size={15} /> Folders
            </h2>
            <button className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--color-primary)" }}
              onClick={() => setShowNewFolder(true)}>
              <Plus size={12} /> New
            </button>
          </div>
          {showNewFolder && (
            <div className="flex gap-2 mb-3">
              <input id="new-folder-name" name="newFolderName" className="input flex-1 h-9 text-sm"
                placeholder="Folder name..." value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFolder()} autoFocus />
              <button className="btn btn-primary text-xs h-9" onClick={createFolder}>Create</button>
              <button className="btn btn-secondary text-xs h-9" onClick={() => setShowNewFolder(false)}>Cancel</button>
            </div>
          )}
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {folders.map((f) => (
              <Link key={f.id} href={`/dashboard/folder?id=${f.id}`}
                className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all hover:shadow-[var(--shadow-sm)]"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--color-primary)"; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-light)"; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--color-border-light)"; const id = e.dataTransfer.getData("text/docId"); if (id) moveToFolder(id, f.id); }}>
                <FolderOpen size={18} style={{ color: f.color || "var(--color-primary)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{f.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{f.documentCount} files</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Recent / Starred / Shared */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1">
          {([
            { key: "recent" as const, icon: Clock, label: "Recent" },
            { key: "starred" as const, icon: Star, label: "Starred" },
            { key: "shared" as const, icon: Share2, label: "Shared" },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors"
              style={{
                color: tab === t.key ? "var(--color-primary)" : "var(--color-text-secondary)",
                borderBottom: tab === t.key ? "2px solid var(--color-primary)" : "2px solid transparent",
              }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg p-0.5" style={{ background: "var(--color-surface-secondary)" }}>
            <button className="p-1.5 rounded-md" onClick={() => setViewMode("grid")}
              style={{ background: viewMode === "grid" ? "var(--color-surface)" : "transparent", color: viewMode === "grid" ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
              <LayoutGrid size={16} /></button>
            <button className="p-1.5 rounded-md" onClick={() => setViewMode("list")}
              style={{ background: viewMode === "list" ? "var(--color-surface)" : "transparent", color: viewMode === "list" ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
              <List size={16} /></button>
          </div>
        </div>
      </div>

      {/* Documents */}
      {isLoading && documents.length === 0 && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && documents.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {tab === "starred" ? "No starred documents" : tab === "shared" ? "No shared documents" : "No documents yet. Upload a file to get started."}
          </p>
        </div>
      )}

      {viewMode === "grid" && documents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {documents.map((doc) => <DocumentCard key={doc.id} {...doc} />)}
        </div>
      )}

      {viewMode === "list" && documents.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                <th className="w-8 px-3 py-3"><input type="checkbox" className="w-4 h-4 rounded" /></th>
                {["NAME", "SHARING", "OPENED", "SIZE"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="cursor-pointer transition-colors" draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/docId", doc.id)}
                  style={{ borderBottom: "1px solid var(--color-border-light)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => router.push(`/dashboard/view?id=${doc.id}`)}>
                  <td className="px-3 py-3"><input type="checkbox" className="w-4 h-4 rounded" onClick={(e) => e.stopPropagation()} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#FDE8E8" }}>
                        <span className="text-[10px] font-bold" style={{ color: "#D7373F" }}>PDF</span>
                      </div>
                      <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-tertiary)" }}>Only you</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-tertiary)" }}>{new Date(doc.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-tertiary)" }}>{formatSize(doc.sizeBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
