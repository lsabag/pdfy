"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import { DocumentCard } from "@/components/documents/DocumentCard";

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

  useEffect(() => {
    if (!folderId) { router.push("/dashboard/folders"); return; }
    async function load() {
      try {
        const { data } = await api.get(`/folders/${folderId}`);
        setFolder(data);
      } catch {
        router.push("/dashboard/folders");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [folderId, router]);

  if (loading || !folder) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/dashboard/folders")} className="btn btn-ghost w-8 h-8 p-0"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{folder.name}</h1>
        <span className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>{folder.documents?.length || 0} documents</span>
      </div>
      {folder.documents?.length === 0 ? (
        <div className="text-center py-20"><p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>This folder is empty</p></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {folder.documents?.map((doc: any) => <DocumentCard key={doc.id} {...doc} />)}
        </div>
      )}
    </div>
  );
}
