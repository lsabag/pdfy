"use client";

import Link from "next/link";
import {
  FileText,
  Star,
  MoreVertical,
  Download,
  Trash2,
  Share2,
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

export function DocumentCard({
  id,
  name,
  sizeBytes,
  pageCount,
  status,
  thumbnailKey,
  isFavorite,
  updatedAt,
}: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { toggleFavorite, deleteDocument } = useDocumentStore();

  const handleDownload = async () => {
    const { data } = await api.get(`/documents/${id}/download`);
    window.open(data.url, "_blank");
    setShowMenu(false);
  };

  return (
    <div
      className="group rounded-xl overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)]"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-light)",
      }}
    >
      {/* Thumbnail area */}
      <Link href={`/dashboard/view?id=${id}`}>
        <div
          className="h-44 flex items-center justify-center relative"
          style={{ background: "var(--color-surface-secondary)" }}
        >
          {status === "PROCESSING" ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <span
                className="text-xs"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Processing...
              </span>
            </div>
          ) : (
            <FileText
              size={48}
              strokeWidth={1}
              style={{ color: "var(--color-text-tertiary)" }}
            />
          )}

          {/* Page count badge */}
          {pageCount > 0 && (
            <span
              className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-text-secondary)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {pageCount} {pageCount === 1 ? "page" : "pages"}
            </span>
          )}
        </div>
      </Link>

      {/* Info area */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/dashboard/view?id=${id}`}
            className="flex-1 min-w-0"
          >
            <h3
              className="text-sm font-medium truncate"
              style={{ color: "var(--color-text-primary)" }}
              title={name}
            >
              {name}
            </h3>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {formatFileSize(sizeBytes)} &middot; {formatDate(updatedAt)}
            </p>
          </Link>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => toggleFavorite(id)}
              className="btn btn-ghost w-7 h-7 p-0"
            >
              <Star
                size={14}
                fill={isFavorite ? "var(--color-warning)" : "none"}
                style={{
                  color: isFavorite
                    ? "var(--color-warning)"
                    : "var(--color-text-tertiary)",
                }}
              />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="btn btn-ghost w-7 h-7 p-0"
              >
                <MoreVertical size={14} />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 w-40 py-1 rounded-lg z-50"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                      onClick={handleDownload}
                    >
                      <Download size={14} />
                      Download
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                      onClick={() => setShowMenu(false)}
                    >
                      <Share2 size={14} />
                      Share
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm"
                      style={{ color: "var(--color-error)" }}
                      onClick={() => {
                        deleteDocument(id);
                        setShowMenu(false);
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
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
