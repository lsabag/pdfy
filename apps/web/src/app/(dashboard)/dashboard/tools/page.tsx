"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, MessageSquare, Merge, LayoutGrid, Scissors, Trash2,
  FileOutput, ArrowUpDown, RotateCw, FilePlus, Lock, Crop,
  Hash, EyeOff, FileImage, FileSpreadsheet, Presentation, File,
  Minimize2, ScanText, Pen, FileSignature, PenTool, FileCheck,
  Code, Users, Palette, Monitor, Smartphone, Globe,
} from "lucide-react";
import { api } from "@/lib/api-client";

type ToolDef = { icon: any; title: string; desc: string; color: string; action: string };

const editTools: ToolDef[] = [
  { icon: FileText, title: "Edit text & images", desc: "Modify or add text, images, pages, and more", color: "#E34F26", action: "edit" },
  { icon: MessageSquare, title: "Add comments", desc: "Add comments, highlights, and other annotations", color: "#F5A623", action: "comments" },
  { icon: Merge, title: "Combine files", desc: "Merge multiple files into a single PDF", color: "#7B61FF", action: "merge" },
  { icon: LayoutGrid, title: "Organize pages", desc: "Delete, rotate, extract, insert, or reorder pages", color: "#4CAF50", action: "organize" },
  { icon: Scissors, title: "Split a PDF", desc: "Separate a PDF into multiple files", color: "#E91E63", action: "split" },
  { icon: Trash2, title: "Delete pages", desc: "Remove pages from your PDF", color: "#FF5722", action: "delete-pages" },
  { icon: FileOutput, title: "Extract pages", desc: "Create a new PDF of selected pages", color: "#2196F3", action: "extract" },
  { icon: ArrowUpDown, title: "Reorder pages", desc: "Rearrange pages in your PDF", color: "#FF9800", action: "reorder" },
  { icon: RotateCw, title: "Rotate pages", desc: "Rotate pages left or right", color: "#9C27B0", action: "rotate" },
  { icon: FilePlus, title: "Insert pages", desc: "Add pages to your PDF", color: "#00BCD4", action: "insert" },
  { icon: Lock, title: "Protect a PDF", desc: "Set a password to protect a PDF", color: "#3F51B5", action: "encrypt" },
  { icon: Crop, title: "Crop pages", desc: "Trim page content, adjust margins, or resize pages", color: "#795548", action: "crop" },
  { icon: Hash, title: "Number pages", desc: "Add page numbers to your PDF", color: "#F5A623", action: "number" },
  { icon: EyeOff, title: "Redact a PDF", desc: "Permanently delete sensitive content and hidden data", color: "#E91E63", action: "redact" },
];

const convertTools: ToolDef[] = [
  { icon: FileText, title: "PDF to Word", desc: "Convert PDFs to Microsoft Word files", color: "#2B579A", action: "PDF_TO_DOCX" },
  { icon: Presentation, title: "PDF to PPT", desc: "Convert PDFs to Microsoft PowerPoint files", color: "#D24726", action: "PDF_TO_PPTX" },
  { icon: FileSpreadsheet, title: "PDF to Excel", desc: "Convert PDFs to Microsoft Excel files", color: "#217346", action: "PDF_TO_XLSX" },
  { icon: FileImage, title: "PDF to JPG", desc: "Convert PDFs to JPG or other image formats", color: "#FF6F00", action: "PDF_TO_JPG" },
  { icon: File, title: "Export a PDF", desc: "Convert PDFs to Microsoft Office files, images, and more", color: "#7B61FF", action: "PDF_TO_DOCX" },
  { icon: FileText, title: "Word to PDF", desc: "Convert Microsoft Word files to PDF", color: "#2B579A", action: "TO_PDF" },
  { icon: Presentation, title: "PPT to PDF", desc: "Convert Microsoft PowerPoint files to PDF", color: "#D24726", action: "TO_PDF" },
  { icon: FileSpreadsheet, title: "Excel to PDF", desc: "Convert Microsoft Excel files to PDF", color: "#217346", action: "TO_PDF" },
  { icon: FileImage, title: "JPG to PDF", desc: "Convert JPG, PNG, and other images to PDF", color: "#FF6F00", action: "TO_PDF" },
  { icon: File, title: "Convert to PDF", desc: "Turn almost any file into a PDF", color: "#4CAF50", action: "TO_PDF" },
  { icon: Minimize2, title: "Compress a PDF", desc: "Reduce the size of your PDF for easier sharing", color: "#9C27B0", action: "COMPRESS" },
  { icon: ScanText, title: "Recognize text with OCR", desc: "Make text in your PDF searchable and editable", color: "#00BCD4", action: "OCR" },
];

const esignTools: ToolDef[] = [
  { icon: Pen, title: "Fill & Sign", desc: "Complete a form and add your signature", color: "#7B61FF", action: "fill-sign" },
  { icon: FileSignature, title: "Request e-signatures", desc: "Send a document to anyone to e-sign online fast", color: "#2196F3", action: "request-sign" },
  { icon: PenTool, title: "Add a signature", desc: "Sign a document yourself", color: "#E91E63", action: "sign" },
  { icon: FileCheck, title: "Create e-sign template", desc: "Create a reusable document to send for e-signature faster", color: "#4CAF50", action: "template" },
  { icon: Code, title: "Create a web form", desc: "Add forms to your website and share links to collect data online", color: "#00BCD4", action: "webform" },
  { icon: Users, title: "Send in bulk", desc: "Send a document to many people at once to sign individually", color: "#FF9800", action: "bulk-sign" },
  { icon: Palette, title: "Add e-sign branding", desc: "Add your company name, logo, and a custom URL to e-sign agreements", color: "#9C27B0", action: "branding" },
];

export default function AllToolsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentActionRef = useRef<string>("");
  const [filter, setFilter] = useState<"all" | "edit" | "convert" | "esign">("all");

  const handleToolClick = (action: string) => {
    currentActionRef.current = action;
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const action = currentActionRef.current;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });

      if (action === "COMPRESS") {
        const res = await api.post(`/documents/${data.id}/optimize`);
        alert(`Compressed! Saved ${(res.data.savedBytes / 1024).toFixed(1)} KB (${res.data.savedPercent}%)`);
      } else if (action === "OCR") {
        await api.post(`/documents/${data.id}/ocr`);
        alert("OCR started!");
      } else if (action === "TO_PDF") {
        await api.post(`/documents/${data.id}/convert-to-pdf`);
      } else if (action.startsWith("PDF_TO_")) {
        await api.post(`/documents/${data.id}/convert`, { format: action });
        alert(`Converting to ${action.replace("PDF_TO_", "")}...`);
      }
      router.push(`/dashboard/view?id=${data.id}&action=${action}`);
    } catch {
      alert("Failed to process file");
    }
    e.target.value = "";
  };

  const sections = [
    ...(filter === "all" || filter === "edit" ? [{ title: "Edit", tools: editTools }] : []),
    ...(filter === "all" || filter === "convert" ? [{ title: "Convert", tools: convertTools }] : []),
    ...(filter === "all" || filter === "esign" ? [{ title: "E-Sign", tools: esignTools }] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>All tools</h1>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--color-surface-secondary)" }}>
          {(["all", "edit", "convert", "esign"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize"
              style={{
                background: filter === f ? "var(--color-surface)" : "transparent",
                color: filter === f ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                boxShadow: filter === f ? "var(--shadow-sm)" : "none",
              }}>
              {f === "all" ? "View all" : f === "esign" ? "E-Sign" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <input ref={fileInputRef} type="file" className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.tiff,.bmp,.webp,.gif"
        onChange={handleFileSelect} />

      {sections.map((section) => (
        <div key={section.title} className="mb-10">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
            {section.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {section.tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button key={tool.title + tool.action} onClick={() => handleToolClick(tool.action)}
                  className="text-left rounded-xl p-5 transition-all hover:shadow-[var(--shadow-md)]"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: tool.color + "18" }}>
                      <Icon size={20} style={{ color: tool.color }} />
                    </div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{tool.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{tool.desc}</p>
                  <p className="text-xs mt-3 font-medium" style={{ color: "var(--color-primary)" }}>
                    Drag and drop, or <span className="underline">select a file</span>
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
