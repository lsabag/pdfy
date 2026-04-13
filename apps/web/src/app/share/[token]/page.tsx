"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Download, Lock, Eye } from "lucide-react";
import { api } from "@/lib/api-client";

interface SharedDoc {
  id: string;
  document: { id: string; name: string; pageCount: number; sizeBytes: number; storageKey: string };
  createdBy: { name: string };
  permission: string;
  hasPassword: boolean;
}

export default function PublicSharePage() {
  const params = useParams();
  const [share, setShare] = useState<SharedDoc | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/share/${params.token}`);
        setShare(data);
        if (data.hasPassword) {
          setNeedsPassword(true);
        } else {
          await loadPdf();
        }
      } catch {
        setError("This share link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.token]);

  const loadPdf = async () => {
    const { data } = await api.get(`/share/${params.token}/download`);
    setPdfUrl(data.url);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/share/${params.token}/verify`, { password });
      setVerified(true);
      setNeedsPassword(false);
      await loadPdf();
    } catch {
      setError("Incorrect password");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--color-background)" }}>
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !share) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--color-background)" }}>
        <div className="text-center p-8 rounded-xl max-w-md" style={{ background: "var(--color-surface)" }}>
          <FileText className="mx-auto mb-4" size={48} style={{ color: "var(--color-text-tertiary)" }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Link unavailable</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (needsPassword && !verified) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--color-background)" }}>
        <div className="p-8 rounded-xl max-w-sm w-full" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}>
          <Lock className="mx-auto mb-4" size={32} style={{ color: "var(--color-primary)" }} />
          <h1 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--color-text-primary)" }}>Password required</h1>
          <p className="text-sm text-center mb-6" style={{ color: "var(--color-text-secondary)" }}>
            This document is protected. Enter the password to view it.
          </p>
          {error && <p className="text-sm text-center mb-4" style={{ color: "var(--color-error)" }}>{error}</p>}
          <form onSubmit={handleVerify} className="flex flex-col gap-3">
            <input type="password" className="input" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <button type="submit" className="btn btn-primary w-full h-11">Verify</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#525659" }}>
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 flex-shrink-0" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: "var(--color-primary)" }}>P</div>
          <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{share?.document.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-badge-blue)", color: "var(--color-primary)" }}>
            <Eye size={12} className="inline mr-1" />{share?.permission}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Shared by {share?.createdBy.name}</span>
          {pdfUrl && (
            <button className="btn btn-primary h-8 text-sm" onClick={() => window.open(pdfUrl, "_blank")}>
              <Download size={14} /> Download
            </button>
          )}
        </div>
      </header>

      {/* PDF viewer */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            className="rounded-sm shadow-xl"
            style={{ width: "816px", height: "1056px", maxWidth: "100%", border: "none", background: "white" }}
            title={share?.document.name}
          />
        )}
      </div>
    </div>
  );
}
