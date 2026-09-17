"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Opent het inlogvenster (pop-up van Clerk) op de pagina zelf bij ?inloggen=1, of het
 * aanmeldvenster bij ?inloggen=aanmelden. Zo landt niemand op een kale inlogpagina: de
 * links in mails en de doorverwijzing van /sign-in komen hier uit. Na het inloggen door
 * naar redirect_url (standaard het portaal); wie al is ingelogd gaat daar meteen heen.
 */
export default function InlogVenster() {
  const zoek = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const router = useRouter();
  const gedaan = useRef(false);
  const soort = zoek.get("inloggen");

  useEffect(() => {
    if (!soort || !isLoaded || gedaan.current) return;
    gedaan.current = true;
    const ruw = zoek.get("redirect_url") ?? "/portal";
    // Alleen doorsturen binnen onze eigen site
    let doel = "/portal";
    try {
      const u = new URL(ruw, window.location.origin);
      if (u.origin === window.location.origin) doel = u.pathname + u.search + u.hash;
    } catch {}
    if (isSignedIn) {
      router.replace(doel);
      return;
    }
    // Het ?inloggen uit het adres halen, zodat verversen het venster niet opnieuw opent
    window.history.replaceState(null, "", window.location.pathname);
    if (soort === "aanmelden") clerk.openSignUp({ forceRedirectUrl: doel });
    else clerk.openSignIn({ forceRedirectUrl: doel, signUpForceRedirectUrl: doel });
  }, [soort, isLoaded, isSignedIn, zoek, clerk, router]);

  return null;
}
