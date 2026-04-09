import { useEffect } from "react";

export function useBlockPinchZoom() {
  useEffect(() => {
    const b = (e) => { if (e.ctrlKey) e.preventDefault(); };
    document.addEventListener("wheel", b, { passive: false });
    return () => document.removeEventListener("wheel", b);
  }, []);
}
