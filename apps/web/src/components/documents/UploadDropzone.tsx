"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useDocumentStore } from "@/stores/document-store";

export function UploadDropzone() {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<
    { file: File; status: "pending" | "uploading" | "done" | "error" }[]
  >([]);
  const { uploadDocument } = useDocumentStore();

  useEffect(() => {
    const handler = () => setIsOpen(true);
    document.addEventListener("pdfy:open-upload", handler);
    return () => document.removeEventListener("pdfy:open-upload", handler);
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        file,
        status: "pending" as const,
      }));
      setFiles((prev) => [...prev, ...newFiles]);

      for (const item of newFiles) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === item.file ? { ...f, status: "uploading" } : f
          )
        );
        try {
          await uploadDocument(item.file);
          setFiles((prev) =>
            prev.map((f) =>
              f.file === item.file ? { ...f, status: "done" } : f
            )
          );
        } catch {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === item.file ? { ...f, status: "error" } : f
            )
          );
        }
      }
    },
    [uploadDocument]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png", ".tiff"],
    },
    multiple: true,
  });

  if (!isOpen) {
    return (
      <div
        {...getRootProps()}
        className="rounded-xl p-8 text-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${isDragActive ? "var(--color-primary)" : "var(--color-border)"}`,
          background: isDragActive
            ? "var(--color-primary-light)"
            : "var(--color-surface)",
        }}
      >
        <input {...getInputProps()} id="upload-dropzone-input" name="fileUpload" aria-label="Upload documents" />
        <Upload
          className="mx-auto mb-3"
          size={32}
          style={{
            color: isDragActive
              ? "var(--color-primary)"
              : "var(--color-text-tertiary)",
          }}
        />
        <p
          className="text-sm font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {isDragActive
            ? "Drop files here..."
            : "Drag & drop files here, or click to browse"}
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          PDF, JPG, PNG, TIFF up to 100MB
        </p>
      </div>
    );
  }

  // Modal mode
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsOpen(false);
            setFiles([]);
          }
        }}
      >
        <div
          className="w-full max-w-lg rounded-xl p-6"
          style={{
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-lg font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Upload Documents
            </h3>
            <button
              onClick={() => {
                setIsOpen(false);
                setFiles([]);
              }}
              className="btn-icon"
            >
              <X size={18} />
            </button>
          </div>

          <div
            {...getRootProps()}
            className="rounded-lg p-6 text-center cursor-pointer transition-all mb-4"
            style={{
              border: `2px dashed ${isDragActive ? "var(--color-primary)" : "var(--color-border)"}`,
              background: isDragActive
                ? "var(--color-primary-light)"
                : "var(--color-surface-secondary)",
            }}
          >
            <input {...getInputProps()} id="upload-modal-input" name="fileUploadModal" aria-label="Upload documents" />
            <Upload
              className="mx-auto mb-2"
              size={24}
              style={{ color: "var(--color-text-tertiary)" }}
            />
            <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
              Drag & drop or click to browse
            </p>
          </div>

          {files.length > 0 && (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ background: "var(--color-surface-secondary)" }}
                >
                  <FileText size={18} style={{ color: "var(--color-primary)" }} />
                  <span
                    className="flex-1 text-sm truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {f.file.name}
                  </span>
                  {f.status === "uploading" && (
                    <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                  )}
                  {f.status === "done" && (
                    <CheckCircle size={16} style={{ color: "var(--color-success)" }} />
                  )}
                  {f.status === "error" && (
                    <AlertCircle size={16} style={{ color: "var(--color-error)" }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
