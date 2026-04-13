"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Plus, MoreVertical, Trash2, Edit3 } from "lucide-react";
import { api } from "@/lib/api-client";
import Link from "next/link";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  documentCount: number;
  createdAt: string;
}

export default function FoldersPage() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const fetchFolders = async () => {
    try {
      const { data } = await api.get("/folders");
      setFolders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFolders(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await api.post("/folders", { name: newName.trim() });
    setNewName("");
    setShowCreate(false);
    fetchFolders();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/folders/${id}`);
    fetchFolders();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Folders
        </h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Folder
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="flex gap-2 mb-6">
          <input
            className="input flex-1"
            placeholder="Folder name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary">Create</button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : folders.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="mx-auto mb-3" size={48} style={{ color: "var(--color-text-tertiary)" }} />
          <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>No folders yet</h3>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Create a folder to organize your documents</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {folders.map((folder) => (
            <Link
              key={folder.id}
              href={`/dashboard/folder?id=${folder.id}`}
              className="group rounded-xl p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <FolderOpen size={32} style={{ color: folder.color || "var(--color-primary)" }} />
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(folder.id); }}
                  className="btn-icon opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                {folder.name}
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                {folder.documentCount} document{folder.documentCount !== 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
