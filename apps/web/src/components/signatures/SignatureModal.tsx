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

/** Auto-crop a canvas/dataURL to content bounds (removes transparent padding) */
function autoCropDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (d[(y * c.width + x) * 4 + 3] > 10) { // alpha > 10
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX <= minX || maxY <= minY) { resolve(dataUrl); return; }
      // Add small padding
      const pad = 4;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(c.width - 1, maxX + pad);
      maxY = Math.min(c.height - 1, maxY + pad);
      const cropped = document.createElement("canvas");
      cropped.width = maxX - minX + 1;
      cropped.height = maxY - minY + 1;
      cropped.getContext("2d")!.drawImage(c, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
      resolve(cropped.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

export function SignatureModal({ isOpen, onClose, onApply }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<"draw" | "type" | "saved">("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [sigFont, setSigFont] = useState("Georgia, serif");
  const [sigFontSize, setSigFontSize] = useState(36);

  const fontOptions = [
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Times New Roman", value: "'Times New Roman', serif" },
    { label: "Courier", value: "'Courier New', monospace" },
    { label: "Brush Script", value: "'Brush Script MT', cursive" },
    { label: "Verdana", value: "Verdana, sans-serif" },
  ];
  const [savedSigs, setSavedSigs] = useState<SavedSignature[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Lock body scroll when modal is open (prevents mobile page bounce)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  // Load saved signatures whenever modal opens (any tab)
  useEffect(() => {
    if (isOpen) loadSaved();
  }, [isOpen]);

  // Also reload when switching to saved tab
  useEffect(() => {
    if (isOpen && tab === "saved") loadSaved();
  }, [tab]);

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
    // Transparent background - only the signature strokes are visible on the PDF
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    // Scale from CSS display size to canvas buffer size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
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
    const lines = typedName.split("\n");
    const lineHeight = sigFontSize * 1.4;
    const pad = 8;

    // Measure actual text width first
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = `${sigFontSize}px ${sigFont}`;
    let maxWidth = 0;
    lines.forEach((line) => {
      const w = measure.measureText(line).width;
      if (w > maxWidth) maxWidth = w;
    });

    const canvasWidth = Math.ceil(maxWidth + pad * 2);
    const canvasHeight = Math.max(sigFontSize + pad * 2, Math.ceil(lines.length * lineHeight + pad * 2));
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "#000000";
    ctx.font = `${sigFontSize}px ${sigFont}`;
    ctx.textBaseline = "top";
    lines.forEach((line, i) => {
      ctx.fillText(line, pad, pad + i * lineHeight);
    });
    return canvas.toDataURL("image/png");
  };

  const handleApply = () => {
    const data = getCanvasData();
    if (data) onApply(data);
  };

  const handleSave = async () => {
    const data = getCanvasData();
    if (!data) { alert("Please draw or type a signature first"); return; }
    try {
      await api.post("/signatures", {
        name: saveName || "My Signature",
        type: tab === "draw" ? "DRAW" : "TYPE",
        data,
        isDefault: savedSigs.length === 0,
      });
      setShowSaveInput(false);
      setSaveName("");
      // Reload signatures and switch to Saved tab to show the result
      await loadSaved();
      setTab("saved");
      alert("Signature saved successfully!");
    } catch (err: any) {
      alert("Failed to save signature: " + (err.response?.data?.error || err.message));
    }
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
          <button onClick={onClose} className="btn-icon" aria-label="Close"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-1">
          {[
            { key: "draw" as const, icon: Pen, label: "Draw" },
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
                style={{ border: "2px dashed var(--color-border)", background: "white", touchAction: "none" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={(e) => { e.preventDefault(); startDraw(e); }}
                onTouchMove={(e) => { e.preventDefault(); draw(e); }}
                onTouchEnd={stopDraw} />
              <div className="flex flex-wrap justify-between mt-3 gap-2">
                <button className="btn btn-secondary text-xs sm:text-sm" onClick={clearCanvas}>Clear</button>
                <div className="flex gap-2">
                  <button className="btn btn-secondary text-xs sm:text-sm" onClick={() => setShowSaveInput(true)}>
                    <Save size={14} /> <span className="hidden sm:inline">Save</span><span className="sm:hidden">Save</span>
                  </button>
                  <button className="btn btn-primary text-xs sm:text-sm" onClick={handleApply}>Apply</button>
                </div>
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
                          <button className="btn-icon" style={{width:28,height:28}} title="Set as default"
                            onClick={() => handleSetDefault(sig.id)}><Check size={14} /></button>
                        )}
                        <button className="btn-icon" title="Use this signature"
                          onClick={() => onApply(sig.data)} style={{ width:28, height:28, color: "var(--color-primary)" }}>
                          <Pen size={14} />
                        </button>
                        <button className="btn-icon" title="Delete"
                          onClick={() => handleDeleteSaved(sig.id)} style={{ width:28, height:28, color: "var(--color-error)" }}>
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
              <input id="signature-save-name" name="signatureSaveName" className="input text-sm flex-1 h-9" placeholder="Signature name (e.g. My Signature)"
                value={saveName} onChange={(e) => setSaveName(e.target.value)} autoFocus aria-label="Signature name" />
              <button className="btn btn-primary text-sm h-9" onClick={handleSave}>Save</button>
              <button className="btn btn-secondary text-sm h-9" onClick={() => setShowSaveInput(false)}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
