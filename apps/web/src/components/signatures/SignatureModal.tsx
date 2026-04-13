"use client";

import { useEffect, useRef, useState } from "react";
import { X, Pen, Type, Upload, Save, Trash2, Check } from "lucide-react";
import { api } from "@/lib/api-client";

interface SavedSignature {
  id: string;
  name: string;
  type: string;
  data: string;
  isDefault: boolean;
}

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (signatureData: string) => void;
}

export function SignatureModal({ isOpen, onClose, onApply }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<"draw" | "type" | "saved">("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [savedSigs, setSavedSigs] = useState<SavedSignature[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    if (isOpen && tab === "saved") loadSaved();
  }, [isOpen, tab]);

  useEffect(() => {
    if (isOpen && tab === "draw") initCanvas();
  }, [isOpen, tab]);

  const loadSaved = async () => {
    try {
      const { data } = await api.get("/signatures");
      setSavedSigs(data);
    } catch {}
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Transparent background - signature only, no white box
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => initCanvas();

  const getCanvasData = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  const getTypedSignatureData = (): string | null => {
    if (!typedName.trim()) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Transparent background - no white box
    ctx.clearRect(0, 0, 400, 120);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "italic 42px 'Georgia', 'Times New Roman', serif";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 20, 60);
    return canvas.toDataURL("image/png");
  };

  const handleApply = () => {
    let data: string | null = null;
    if (tab === "draw") data = getCanvasData();
    else if (tab === "type") data = getTypedSignatureData();
    if (data) onApply(data);
  };

  const handleSave = async () => {
    let data: string | null = null;
    if (tab === "draw") data = getCanvasData();
    else if (tab === "type") data = getTypedSignatureData();
    if (!data) return;
    await api.post("/signatures", {
      name: saveName || "My Signature",
      type: tab === "draw" ? "DRAW" : "TYPE",
      data,
      isDefault: savedSigs.length === 0,
    });
    setShowSaveInput(false);
    setSaveName("");
    alert("Signature saved!");
    loadSaved();
  };

  const handleDeleteSaved = async (id: string) => {
    await api.delete(`/signatures/${id}`);
    loadSaved();
  };

  const handleSetDefault = async (id: string) => {
    await api.patch(`/signatures/${id}/default`);
    loadSaved();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Sign Document
          </h3>
          <button onClick={onClose} className="btn btn-ghost w-8 h-8 p-0"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-1">
          {[
            { key: "draw" as const, icon: Pen, label: "Draw" },
            { key: "type" as const, icon: Type, label: "Type" },
            { key: "saved" as const, icon: Save, label: "Saved" },
          ].map((t) => (
            <button key={t.key}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
              style={{
                color: tab === t.key ? "var(--color-primary)" : "var(--color-text-secondary)",
                background: tab === t.key ? "var(--color-primary-light)" : "transparent",
              }}
              onClick={() => setTab(t.key)}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {tab === "draw" && (
            <div>
              <canvas ref={canvasRef} width={440} height={160}
                className="w-full rounded-lg cursor-crosshair"
                style={{ border: "2px dashed var(--color-border)", background: "white" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
              <div className="flex justify-between mt-3">
                <button className="btn btn-secondary text-sm" onClick={clearCanvas}>Clear</button>
                <div className="flex gap-2">
                  <button className="btn btn-secondary text-sm" onClick={() => setShowSaveInput(true)}>
                    <Save size={14} /> Save as permanent
                  </button>
                  <button className="btn btn-primary text-sm" onClick={handleApply}>Apply to document</button>
                </div>
              </div>
            </div>
          )}

          {tab === "type" && (
            <div>
              <input className="input text-2xl h-16 text-center"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
                placeholder="Type your name..."
                value={typedName} onChange={(e) => setTypedName(e.target.value)} autoFocus />
              <div className="mt-3 p-4 rounded-lg flex items-center justify-center" style={{ background: "white", border: "1px solid var(--color-border)", minHeight: "80px" }}>
                {typedName ? (
                  <span className="text-4xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", color: "#1a1a1a" }}>
                    {typedName}
                  </span>
                ) : (
                  <span className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>Preview</span>
                )}
              </div>
              <div className="flex justify-end mt-3 gap-2">
                <button className="btn btn-secondary text-sm" onClick={() => setShowSaveInput(true)}>
                  <Save size={14} /> Save as permanent
                </button>
                <button className="btn btn-primary text-sm" onClick={handleApply} disabled={!typedName.trim()}>
                  Apply to document
                </button>
              </div>
            </div>
          )}

          {tab === "saved" && (
            <div>
              {savedSigs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                    No saved signatures. Draw or type one and save it.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {savedSigs.map((sig) => (
                    <div key={sig.id} className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: "var(--color-surface-secondary)", border: sig.isDefault ? "2px solid var(--color-primary)" : "1px solid var(--color-border-light)" }}>
                      <img src={sig.data} alt={sig.name} className="h-12 flex-shrink-0 rounded"
                        style={{ maxWidth: "200px", background: "white" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                          {sig.name} {sig.isDefault && <span className="text-xs px-1.5 py-0.5 rounded-full ml-1"
                            style={{ background: "var(--color-badge-blue)", color: "var(--color-primary)" }}>Default</span>}
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{sig.type}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!sig.isDefault && (
                          <button className="btn btn-ghost w-7 h-7 p-0" title="Set as default"
                            onClick={() => handleSetDefault(sig.id)}><Check size={14} /></button>
                        )}
                        <button className="btn btn-ghost w-7 h-7 p-0" title="Use this signature"
                          onClick={() => onApply(sig.data)} style={{ color: "var(--color-primary)" }}>
                          <Pen size={14} />
                        </button>
                        <button className="btn btn-ghost w-7 h-7 p-0" title="Delete"
                          onClick={() => handleDeleteSaved(sig.id)} style={{ color: "var(--color-error)" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save name input */}
          {showSaveInput && (
            <div className="mt-3 flex gap-2 p-3 rounded-lg" style={{ background: "var(--color-surface-secondary)" }}>
              <input className="input text-sm flex-1 h-9" placeholder="Signature name (e.g. My Signature)"
                value={saveName} onChange={(e) => setSaveName(e.target.value)} autoFocus />
              <button className="btn btn-primary text-sm h-9" onClick={handleSave}>Save</button>
              <button className="btn btn-secondary text-sm h-9" onClick={() => setShowSaveInput(false)}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
