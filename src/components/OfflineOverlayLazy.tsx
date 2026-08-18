"use client";

import dynamic from "next/dynamic";

const OfflineOverlay = dynamic(() => import("@/components/OfflineOverlay"), { ssr: false });

export default function OfflineOverlayLazy() {
  return <OfflineOverlay />;
}
