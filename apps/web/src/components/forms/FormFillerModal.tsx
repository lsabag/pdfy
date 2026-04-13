"use client";

import { useEffect, useState } from "react";
import { X, Save, FileText, CheckSquare, List } from "lucide-react";
import { api } from "@/lib/api-client";

interface FormField {
  name: string;
  type: string;
}

interface FormFillerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  onFilled: () => void;
}

export function FormFillerModal({ isOpen, onClose, documentId, onFilled }: FormFillerModalProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/documents/${documentId}/form-fields`);
        setFields(data.fields || []);
        const initial: Record<string, any> = {};
        for (const f of data.fields || []) {
          initial[f.name] = f.type === "checkbox" ? false : "";
        }
        setValues(initial);
      } catch {
        setError("Failed to load form fields");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, documentId]);

  const handleFill = async () => {
    setFilling(true);
    try {
      const { data } = await api.post(`/documents/${documentId}/fill-form`, { fields: values });
      alert(`Filled ${data.filled} of ${data.total} fields!`);
      onFilled();
      onClose();
    } catch {
      alert("Failed to fill form");
    } finally {
      setFilling(false);
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case "checkbox": return CheckSquare;
      case "dropdown": case "radiogroup": return List;
      default: return FileText;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden max-h-[80vh] flex flex-col"
        style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Fill PDF Form
          </h3>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-error)" }}>{error}</p>
          ) : fields.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto mb-3" size={36} style={{ color: "var(--color-text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                No fillable form fields detected in this PDF.
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                The PDF may not contain interactive form fields.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {fields.length} field{fields.length !== 1 ? "s" : ""} found. Fill in the values below:
              </p>
              {fields.map((field) => {
                const Icon = getFieldIcon(field.type);
                return (
                  <div key={field.name}>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-primary)" }}>
                      <Icon size={14} style={{ color: "var(--color-text-tertiary)" }} />
                      {field.name}
                      <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: "var(--color-surface-secondary)", color: "var(--color-text-tertiary)" }}>
                        {field.type}
                      </span>
                    </label>
                    {field.type === "checkbox" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded"
                          checked={!!values[field.name]}
                          onChange={(e) => setValues({ ...values, [field.name]: e.target.checked })} />
                        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Checked</span>
                      </label>
                    ) : (
                      <input className="input text-sm"
                        value={values[field.name] || ""}
                        onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                        placeholder={`Enter ${field.name}...`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {fields.length > 0 && (
          <div className="flex justify-end gap-2 px-5 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid var(--color-border)" }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleFill} disabled={filling}>
              {filling ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Save size={14} /> Fill Form</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
