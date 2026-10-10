import React, { useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="responsive-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
        animation: "fadeIn 0.2s ease-out forwards",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="responsive-modal-content"
        style={{
          backgroundColor: "#fff",
          padding: "32px",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          transform: "scale(0.95)",
          animation: "scaleIn 0.2s ease-out forwards",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-title" style={{ marginTop: 0, marginBottom: "12px", fontSize: "1.125rem", fontWeight: 600, color: "#0f172a" }}>
          {title}
        </h3>
        <p style={{ marginBottom: "24px", color: "#64748b", fontSize: "0.95rem", lineHeight: 1.5 }}>
          {description}
        </p>
        <div className="responsive-modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <Button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "transparent",
              color: "#475569",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontWeight: 500,
            }}
            className="hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              padding: "8px 16px",
              background: isDestructive ? "#ef4444" : "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 500,
            }}
            className={isDestructive ? "hover:bg-red-600 transition-colors" : "hover:bg-emerald-600 transition-colors"}
          >
            {confirmText}
          </Button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
}
