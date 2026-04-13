"use client";

import { useEffect } from "react";
import { Clock } from "lucide-react";
import { useDocumentStore } from "@/stores/document-store";
import { DocumentCard } from "@/components/documents/DocumentCard";

export default function RecentPage() {
  const { documents, isLoading, fetchDocuments } = useDocumentStore();

  useEffect(() => {
    fetchDocuments({ sortBy: "updatedAt", sortOrder: "desc", limit: "20" });
  }, [fetchDocuments]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-text-primary)" }}>
        Recent Documents
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="mx-auto mb-3" size={48} style={{ color: "var(--color-text-tertiary)" }} />
          <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>No recent documents</h3>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Your recently accessed documents will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} {...doc} />
          ))}
        </div>
      )}
    </div>
  );
}
