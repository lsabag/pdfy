"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize,
} from "lucide-react";
import { api } from "@/lib/api-client";

interface DocumentData {
  id: string;
  name: string;
  pageCount: number;
  sizeBytes: number;
  status: string;
  storageKey: string;
}

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [docRes, urlRes] = await Promise.all([
          api.get(`/documents/${params.id}`),
          api.get(`/documents/${params.id}/download`),
        ]);
        setDocument(docRes.data);
        setPdfUrl(urlRes.data.url);
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!document || !pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: "var(--color-text-secondary)" }}>
          Document not found
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-48px)] -m-6">
      {/* Viewer toolbar */}
      <div
        className="flex items-center justify-between px-4 h-12 flex-shrink-0"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Left: back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="btn btn-ghost w-8 h-8 p-0"
          >
            <ArrowLeft size={18} />
          </button>
          <h2
            className="text-sm font-medium truncate max-w-md"
            style={{ color: "var(--color-text-primary)" }}
          >
            {document.name}
          </h2>
          <span
            className="text-xs"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {document.pageCount} pages
          </span>
        </div>

        {/* Center: page navigation + zoom */}
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost w-8 h-8 p-0"
            onClick={() => setZoom((z) => Math.max(25, z - 25))}
          >
            <ZoomOut size={16} />
          </button>
          <span
            className="text-xs w-12 text-center"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {zoom}%
          </span>
          <button
            className="btn btn-ghost w-8 h-8 p-0"
            onClick={() => setZoom((z) => Math.min(400, z + 25))}
          >
            <ZoomIn size={16} />
          </button>

          <div
            className="w-px h-5 mx-2"
            style={{ background: "var(--color-border)" }}
          />

          <button
            className="btn btn-ghost w-8 h-8 p-0"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {currentPage} / {document.pageCount || "?"}
          </span>
          <button
            className="btn btn-ghost w-8 h-8 p-0"
            disabled={currentPage >= (document.pageCount || 1)}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost w-8 h-8 p-0">
            <Maximize size={16} />
          </button>
          <button className="btn btn-ghost w-8 h-8 p-0">
            <Share2 size={16} />
          </button>
          <button
            className="btn btn-ghost w-8 h-8 p-0"
            onClick={() => window.open(pdfUrl, "_blank")}
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* PDF embed */}
      <div
        className="flex-1 overflow-auto flex items-start justify-center p-4"
        style={{ background: "#525659" }}
      >
        <iframe
          src={`${pdfUrl}#page=${currentPage}`}
          className="rounded-sm shadow-xl"
          style={{
            width: `${(816 * zoom) / 100}px`,
            height: `${(1056 * zoom) / 100}px`,
            maxWidth: "100%",
            border: "none",
            background: "white",
          }}
          title={document.name}
        />
      </div>
    </div>
  );
}
