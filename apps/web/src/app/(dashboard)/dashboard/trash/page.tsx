"use client";

import { useEffect, useState } from "react";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api-client";

interface TrashItem {
  id: string;
  name: string;
  sizeBytes: number;
  pageCount: number;
  deletedAt: string;
}

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchTrash = async () => {
    try {
      const { data } = await api.get("/trash");
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrash(); }, []);

  const handleRestore = async (ids: string[]) => {
    await api.post("/bulk/restore", { documentIds: ids });
    setSelected(new Set());
    fetchTrash();
  };

  const handlePermanentDelete = async (ids: string[]) => {
    await api.post("/bulk/permanent-delete", { documentIds: ids });
    setSelected(new Set());
    fetchTrash();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Trash</h1>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => handleRestore([...selected])}>
              <RotateCcw size={14} /> Restore ({selected.size})
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handlePermanentDelete([...selected])}
            >
              <Trash2 size={14} /> Delete permanently
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Trash2 className="mx-auto mb-3" size={48} style={{ color: "var(--color-text-tertiary)" }} />
          <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>Trash is empty</h3>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Deleted documents will appear here</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 px-4 py-3 transition-colors cursor-pointer"
              style={{ borderBottom: "1px solid var(--color-border-light)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <input
                id={`trash-select-${item.id}`}
                name="trashSelect"
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="w-4 h-4 rounded"
                aria-label={`Select ${item.name}`}
              />
              <AlertTriangle size={16} style={{ color: "var(--color-warning)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{item.name}</p>
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  Deleted {new Date(item.deletedAt!).toLocaleDateString()}
                </p>
              </div>
              <button className="btn btn-ghost text-xs" onClick={() => handleRestore([item.id])}>
                <RotateCcw size={14} /> Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
