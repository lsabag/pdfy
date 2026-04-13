"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, MessageSquare, Merge, LayoutGrid, Scissors, Trash2,
  FileOutput, ArrowUpDown, RotateCw, FilePlus, Lock, Crop,
  Hash, EyeOff,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useDocumentStore } from "@/stores/document-store";

interface Tool {
  icon: any;
  title: string;
  description: string;
  color: string;
  action: (file: File) => Promise<void>;
}

export default function EditToolsPage() {
  const router = useRouter();
  const { uploadDocument } = useDocumentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentActionRef = useRef<((file: File) => Promise<void>) | null>(null);

  const uploadAndOpen = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
    router.push(`/dashboard/view?id=${data.id}`);
  };

  const uploadAndAction = (action: string) => async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
    // Navigate to viewer with action hint
    router.push(`/dashboard/view?id=${data.id}&action=${action}`);
  };

  const tools: Tool[] = [
    {
      icon: FileText, title: "Edit text & images", color: "#E34F26",
      description: "Modify or add text, images, pages, and more",
      action: uploadAndOpen,
    },
    {
      icon: MessageSquare, title: "Add comments", color: "#F5A623",
      description: "Add comments, highlights, and other annotations",
      action: uploadAndAction("comments"),
    },
    {
      icon: Merge, title: "Combine files", color: "#7B61FF",
      description: "Merge multiple files into a single PDF",
      action: uploadAndAction("merge"),
    },
    {
      icon: LayoutGrid, title: "Organize pages", color: "#4CAF50",
      description: "Delete, rotate, extract, insert, or reorder pages",
      action: uploadAndAction("organize"),
    },
    {
      icon: Scissors, title: "Split a PDF", color: "#E91E63",
      description: "Separate a PDF into multiple files",
      action: uploadAndAction("split"),
    },
    {
      icon: Trash2, title: "Delete pages", color: "#FF5722",
      description: "Remove pages from your PDF",
      action: uploadAndAction("delete-pages"),
    },
    {
      icon: FileOutput, title: "Extract pages", color: "#2196F3",
      description: "Create a new PDF of selected pages",
      action: uploadAndAction("extract"),
    },
    {
      icon: ArrowUpDown, title: "Reorder pages", color: "#FF9800",
      description: "Rearrange pages in your PDF",
      action: uploadAndAction("reorder"),
    },
    {
      icon: RotateCw, title: "Rotate pages", color: "#9C27B0",
      description: "Rotate pages left or right",
      action: uploadAndAction("rotate"),
    },
    {
      icon: FilePlus, title: "Insert pages", color: "#00BCD4",
      description: "Add pages to your PDF",
      action: uploadAndAction("insert"),
    },
    {
      icon: Lock, title: "Protect a PDF", color: "#3F51B5",
      description: "Set a password to protect a PDF",
      action: uploadAndAction("encrypt"),
    },
    {
      icon: Crop, title: "Crop pages", color: "#795548",
      description: "Trim page content, adjust margins, or resize pages",
      action: uploadAndAction("crop"),
    },
    {
      icon: Hash, title: "Number pages", color: "#F5A623",
      description: "Add page numbers to your PDF",
      action: uploadAndAction("number"),
    },
    {
      icon: EyeOff, title: "Redact a PDF", color: "#E91E63",
      description: "Permanently delete sensitive content and hidden data",
      action: uploadAndAction("redact"),
    },
  ];

  const handleToolClick = (tool: Tool) => {
    currentActionRef.current = tool.action;
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentActionRef.current) return;
    try {
      await currentActionRef.current(file);
    } catch (err) {
      alert("Failed to process file");
    }
    e.target.value = "";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Edit</h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        Choose a tool and upload a PDF to get started
      </p>

      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,image/*"
        onChange={handleFileSelect} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button key={tool.title} onClick={() => handleToolClick(tool)}
              className="text-left rounded-xl p-5 transition-all hover:shadow-[var(--shadow-md)] group"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: tool.color + "18" }}>
                  <Icon size={20} style={{ color: tool.color }} />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{tool.title}</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {tool.description}
              </p>
              <p className="text-xs mt-3 font-medium" style={{ color: "var(--color-primary)" }}>
                Drag and drop, or <span className="underline">select a file</span>
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
