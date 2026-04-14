"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { api } from "@/lib/api-client";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDropzone } from "@/components/documents/UploadDropzone";

export default function FolderDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>}>
      <FolderContent />
    </Suspense>
  );
}

function FolderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get("id");
  const [folder, setFolder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadFolder = async () => {
    if (!folderId) return;
    try {
      const { data } = await api.get(`/folders/${folderId}`);
      setFolder(data);
    } catch {
      router.push("/documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!folderId) { router.push("/documents"); return; }
    loadFolder();
  }, [folderId, router]);

  // After upload, move the new doc into this folder and reload
  useEffect(() => {
    const handler = async () => {
      // Small delay to let the upload complete
      setTimeout(loadFolder, 1000);
    };
    document.addEventListener("pdfy:upload-complete", handler);
    return () => document.removeEventListener("pdfy:upload-complete", handler);
  }, [folderId]);

  if (loading || !folder) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/documents")} className="btn-icon"><ArrowLeft size={18} /></button>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{folder.name}</h1>
          <span className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>{folder.documents?.length || 0} documents</span>
        </div>
        <button className="btn btn-primary text-sm h-9"
          onClick={() => document.dispatchEvent(new CustomEvent("pdfy:open-upload"))}>
          <Upload size={14} /> Upload to folder
        </button>
      </div>

      <div className="mb-6">
        <UploadDropzone />
      </div>

      {folder.documents?.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>This folder is empty. Upload files or drag documents here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {folder.documents?.map((doc: any) => <DocumentCard key={doc.id} {...doc} />)}
        </div>
      )}
    </div>
  );
}
