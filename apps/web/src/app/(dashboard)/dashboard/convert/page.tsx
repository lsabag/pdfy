"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, FileImage, FileSpreadsheet, Presentation, File,
  Minimize2, ScanText, ArrowRight, ArrowLeft,
} from "lucide-react";
import { api } from "@/lib/api-client";

interface ConvertTool {
  icon: any;
  title: string;
  description: string;
  format: string;
  color: string;
}

export default function ConvertPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFormatRef = useRef<string>("");

  const handleToolClick = (format: string) => {
    currentFormatRef.current = format;
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });

      if (currentFormatRef.current === "COMPRESS") {
        const res = await api.post(`/documents/${data.id}/optimize`);
        alert(`Compressed! Saved ${(res.data.savedBytes / 1024).toFixed(1)} KB (${res.data.savedPercent}%)`);
        router.push(`/dashboard/view?id=${data.id}`);
      } else if (currentFormatRef.current === "OCR") {
        await api.post(`/documents/${data.id}/ocr`);
        alert("OCR started! Text recognition in progress...");
        router.push(`/dashboard/view?id=${data.id}`);
      } else if (currentFormatRef.current === "TO_PDF") {
        await api.post(`/documents/${data.id}/convert-to-pdf`);
        router.push(`/dashboard/view?id=${data.id}`);
      } else {
        await api.post(`/documents/${data.id}/convert`, { format: currentFormatRef.current });
        alert(`Conversion started: ${currentFormatRef.current.replace("PDF_TO_", "PDF → ")}`);
        router.push(`/dashboard/view?id=${data.id}`);
      }
    } catch (err) {
      alert("Failed to process file");
    }
    e.target.value = "";
  };

  const convertFrom: ConvertTool[] = [
    { icon: FileText, title: "PDF to Word", description: "Convert PDFs to Microsoft Word files", format: "PDF_TO_DOCX", color: "#2B579A" },
    { icon: Presentation, title: "PDF to PPT", description: "Convert PDFs to Microsoft PowerPoint files", format: "PDF_TO_PPTX", color: "#D24726" },
    { icon: FileSpreadsheet, title: "PDF to Excel", description: "Convert PDFs to Microsoft Excel files", format: "PDF_TO_XLSX", color: "#217346" },
    { icon: FileImage, title: "PDF to JPG", description: "Convert PDFs to JPG or other image formats", format: "PDF_TO_JPG", color: "#FF6F00" },
    { icon: FileImage, title: "PDF to PNG", description: "Convert PDFs to PNG or other image formats", format: "PDF_TO_PNG", color: "#00ACC1" },
    { icon: File, title: "Export a PDF", description: "Convert PDFs to Microsoft Office files, images, and more", format: "PDF_TO_DOCX", color: "#7B61FF" },
  ];

  const convertTo: ConvertTool[] = [
    { icon: FileText, title: "Word to PDF", description: "Convert Microsoft Word files to PDF", format: "TO_PDF", color: "#2B579A" },
    { icon: Presentation, title: "PPT to PDF", description: "Convert Microsoft PowerPoint files to PDF", format: "TO_PDF", color: "#D24726" },
    { icon: FileSpreadsheet, title: "Excel to PDF", description: "Convert Microsoft Excel files to PDF", format: "TO_PDF", color: "#217346" },
    { icon: FileImage, title: "JPG to PDF", description: "Convert JPG, PNG, and other images to PDF", format: "TO_PDF", color: "#FF6F00" },
    { icon: File, title: "Convert to PDF", description: "Turn almost any file into a PDF", format: "TO_PDF", color: "#4CAF50" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-text-primary)" }}>Convert</h1>

      <input ref={fileInputRef} type="file" className="hidden" id="file-upload" name="fileUpload" aria-label="Upload file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.tiff,.bmp,.webp,.gif"
        onChange={handleFileSelect} />

      {/* Convert from PDF */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRight size={16} style={{ color: "var(--color-primary)" }} />
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Convert from PDF</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {convertFrom.map((tool) => (
            <ToolCard key={tool.title} tool={tool} onClick={() => handleToolClick(tool.format)} />
          ))}
        </div>
      </div>

      {/* Convert to PDF */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeft size={16} style={{ color: "var(--color-primary)" }} />
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Convert to PDF</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {convertTo.map((tool) => (
            <ToolCard key={tool.title} tool={tool} onClick={() => handleToolClick(tool.format)} />
          ))}
        </div>
      </div>

      {/* Reduce & OCR */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Minimize2 size={16} style={{ color: "var(--color-primary)" }} />
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Reduce file size & OCR</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ToolCard
            tool={{ icon: Minimize2, title: "Compress a PDF", description: "Reduce the size of your PDF for easier sharing", format: "COMPRESS", color: "#9C27B0" }}
            onClick={() => handleToolClick("COMPRESS")} />
          <ToolCard
            tool={{ icon: ScanText, title: "Recognize text with OCR", description: "Make text in your PDF searchable and editable", format: "OCR", color: "#00BCD4" }}
            onClick={() => handleToolClick("OCR")} />
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, onClick }: { tool: ConvertTool; onClick: () => void }) {
  const Icon = tool.icon;
  return (
    <button onClick={onClick} className="text-left rounded-xl p-5 transition-all hover:shadow-[var(--shadow-md)]"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: tool.color + "18" }}>
          <Icon size={20} style={{ color: tool.color }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{tool.title}</h3>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{tool.description}</p>
      <p className="text-xs mt-3 font-medium" style={{ color: "var(--color-primary)" }}>
        Drag and drop, or <span className="underline">select a file</span>
      </p>
    </button>
  );
}
