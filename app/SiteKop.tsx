"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** De algemene sitekop, behalve in het portaal: daar staat een eigen vaste
 * balk met tabbladen (app/portal/PortaalSchil.tsx). Twee koppen boven elkaar
 * kosten ruimte en maken onduidelijk welke navigatie waarvoor is. */
export default function SiteKop({ children }: { children: ReactNode }) {
  const pad = usePathname();
  if (pad === "/portal" || pad?.startsWith("/portal/")) return null;
  return <>{children}</>;
}
