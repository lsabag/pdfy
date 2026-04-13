"use client";

import { useEffect } from "react";
import { LayoutGrid, List } from "lucide-react";
import { useDocumentStore } from "@/stores/document-store";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDropzone } from "@/components/documents/UploadDropzone";

export default function DashboardPage() {
  const {
    documents,
    isLoading,
    viewMode,
    setViewMode,
    fetchDocuments,
    pagination,
  } = useDocumentStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Documents
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {pagination
              ? `${pagination.total} document${pagination.total !== 1 ? "s" : ""}`
              : "Loading..."}
          </p>
        </div>

        {/* View mode toggle */}
        <div
          className="flex items-center rounded-lg p-1"
          style={{ background: "var(--color-surface-secondary)" }}
        >
          <button
            className="p-1.5 rounded-md transition-colors"
            style={{
              background:
                viewMode === "grid" ? "var(--color-surface)" : "transparent",
              color:
                viewMode === "grid"
                  ? "var(--color-text-primary)"
                  : "var(--color-text-tertiary)",
              boxShadow: viewMode === "grid" ? "var(--shadow-sm)" : "none",
            }}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className="p-1.5 rounded-md transition-colors"
            style={{
              background:
                viewMode === "list" ? "var(--color-surface)" : "transparent",
              color:
                viewMode === "list"
                  ? "var(--color-text-primary)"
                  : "var(--color-text-tertiary)",
              boxShadow: viewMode === "list" ? "var(--shadow-sm)" : "none",
            }}
            onClick={() => setViewMode("list")}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Upload area */}
      <div className="mb-6">
        <UploadDropzone />
      </div>

      {/* Loading */}
      {isLoading && documents.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && documents.length === 0 && (
        <div className="text-center py-20">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--color-surface-secondary)" }}
          >
            <LayoutGrid size={24} style={{ color: "var(--color-text-tertiary)" }} />
          </div>
          <h3
            className="text-lg font-semibold mb-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            No documents yet
          </h3>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Upload your first PDF to get started
          </p>
        </div>
      )}

      {/* Document grid */}
      {viewMode === "grid" && documents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              id={doc.id}
              name={doc.name}
              sizeBytes={doc.sizeBytes}
              pageCount={doc.pageCount}
              status={doc.status}
              thumbnailKey={doc.thumbnailKey}
              isFavorite={doc.isFavorite}
              updatedAt={doc.updatedAt}
            />
          ))}
        </div>
      )}

      {/* Document list */}
      {viewMode === "list" && documents.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-light)",
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Name
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Size
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Pages
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Modified
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: "1px solid var(--color-border-light)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--color-surface-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={() =>
                    (window.location.href = `/dashboard/documents/${doc.id}`)
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileIcon />
                      <span
                        className="text-sm font-medium truncate max-w-xs"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {formatSize(doc.sizeBytes)}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {doc.pageCount || "-"}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </td>
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
    <div
      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
      style={{ background: "#FDE8E8" }}
    >
      <span className="text-xs font-bold" style={{ color: "#D7373F" }}>
        PDF
      </span>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
