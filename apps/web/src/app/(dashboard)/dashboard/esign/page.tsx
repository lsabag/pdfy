"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Pen, FileSignature, PenTool, FileCheck, Code, Users, Palette,
} from "lucide-react";
import { api } from "@/lib/api-client";

interface ESignTool {
  icon: any;
  title: string;
  description: string;
  color: string;
  action: string;
}

export default function ESignPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentActionRef = useRef<string>("");

  const handleToolClick = (action: string) => {
    currentActionRef.current = action;
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      router.push(`/dashboard/view?id=${data.id}&action=${currentActionRef.current}`);
    } catch {
      alert("Failed to upload file");
    }
    e.target.value = "";
  };

  const tools: ESignTool[] = [
    {
      icon: Pen, title: "Fill & Sign", color: "#7B61FF",
      description: "Complete a form and add your signature",
      action: "fill-sign",
    },
    {
      icon: FileSignature, title: "Request e-signatures", color: "#2196F3",
      description: "Send a document to anyone to e-sign online fast",
      action: "request-sign",
    },
    {
      icon: PenTool, title: "Add a signature", color: "#E91E63",
      description: "Sign a document yourself",
      action: "sign",
    },
    {
      icon: FileCheck, title: "Create e-sign template", color: "#4CAF50",
      description: "Create a reusable document to send for e-signature faster",
      action: "template",
    },
    {
      icon: Code, title: "Create a web form", color: "#00BCD4",
      description: "Add forms to your website and share links to collect data online",
      action: "webform",
    },
    {
      icon: Users, title: "Send in bulk", color: "#FF9800",
      description: "Send a document to many people at once to sign individually",
      action: "bulk-sign",
    },
    {
      icon: Palette, title: "Add e-sign branding", color: "#9C27B0",
      description: "Add your company name, logo, and a custom URL to e-sign agreements",
      action: "branding",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>E-Sign</h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        Sign documents, request signatures, and manage e-sign workflows
      </p>

      <input id="file-upload" name="fileUpload" ref={fileInputRef} type="file" className="hidden" aria-label="Upload file" accept=".pdf,image/*"
        onChange={handleFileSelect} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button key={tool.title} onClick={() => handleToolClick(tool.action)}
              className="text-left rounded-xl p-5 transition-all hover:shadow-[var(--shadow-md)]"
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
