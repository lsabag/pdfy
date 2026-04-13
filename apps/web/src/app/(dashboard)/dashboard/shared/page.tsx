"use client";

import { Share2 } from "lucide-react";

export default function SharedPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-text-primary)" }}>
        Shared with me
      </h1>
      <div className="text-center py-20">
        <Share2 className="mx-auto mb-3" size={48} style={{ color: "var(--color-text-tertiary)" }} />
        <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>No shared documents</h3>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Documents shared with you will appear here</p>
      </div>
    </div>
  );
}
