"use client";

import { useEffect, useState } from "react";
import { Share2, FileText } from "lucide-react";
import { api } from "@/lib/api-client";
import Link from "next/link";

interface SharedDoc {
  id: string;
  documentId: string;
  permission: string;
  token: string;
  createdAt: string;
  document?: { id: string; name: string; sizeBytes: number; pageCount: number };
  createdBy?: { name: string; email: string };
}

export default function SharedPage() {
  const [sharedByMe, setSharedByMe] = useState<SharedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Fetch all documents the user owns, then check which have shares
        const { data } = await api.get("/documents", { params: { limit: "100" } });
        const docsWithShares: SharedDoc[] = [];
        for (const doc of data.documents || []) {
          try {
            const { data: shares } = await api.get(`/documents/${doc.id}/shares`);
            if (shares.length > 0) {
              for (const share of shares) {
                docsWithShares.push({
                  ...share,
                  document: { id: doc.id, name: doc.name, sizeBytes: doc.sizeBytes, pageCount: doc.pageCount },
                });
              }
            }
          } catch {}
        }
        setSharedByMe(docsWithShares);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-text-primary)" }}>Shared</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sharedByMe.length === 0 ? (
        <div className="text-center py-20">
          <Share2 className="mx-auto mb-3" size={48} style={{ color: "var(--color-text-tertiary)" }} />
          <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>No shared documents</h3>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Documents you share will appear here. Use the Share button on any document.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                {["Document", "Permission", "Shared", "Link"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sharedByMe.map((share) => (
                <tr key={share.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/view?id=${share.document?.id}`} className="flex items-center gap-2">
                      <FileText size={16} style={{ color: "var(--color-primary)" }} />
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {share.document?.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: share.permission === "EDIT" ? "var(--color-badge-blue)" : share.permission === "COMMENT" ? "var(--color-badge-green)" : "var(--color-surface-secondary)",
                        color: share.permission === "EDIT" ? "var(--color-primary)" : share.permission === "COMMENT" ? "var(--color-success)" : "var(--color-text-secondary)",
                      }}>
                      {share.permission}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                    {new Date(share.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs font-medium" style={{ color: "var(--color-primary)" }}
                      onClick={async () => {
                        const url = `${window.location.origin}/share?token=${share.token}`;
                        await navigator.clipboard.writeText(url);
                        alert("Link copied!");
                      }}>
                      Copy link
                    </button>
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
