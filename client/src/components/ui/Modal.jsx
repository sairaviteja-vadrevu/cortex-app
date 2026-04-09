import { useEffect, useRef } from "react";
import { cn } from "../../utils/cn";

export function Modal({ open, onClose, title, children, className }) {
  const overlayRef = useRef();

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn("w-full max-w-md", className)}
        style={{
          background: "var(--surface-1)",
          border: "3px solid var(--border)",
          borderRadius: 14,
          boxShadow: "6px 6px 0px var(--border)",
          padding: 24,
        }}
      >
        {title && <h2 className="text-base font-bold mb-4" style={{ color: "var(--text)" }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
