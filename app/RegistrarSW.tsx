"use client";

import { useEffect } from "react";

export function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.error("SW:", e));
    }
  }, []);
  return null;
}
