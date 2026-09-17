import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import InlogCodeTip from "@/app/InlogCodeTip";

/** Kale sign-up-pagina: door naar de homepage, waar het venster als pop-up opent (zie InlogVenster).
 * Tussenstappen van Clerk (/sign-up/...) en links met een uitnodiging blijven hier gewoon werken. */
export default async function Pagina({
  params,
  searchParams,
}: {
  params: Promise<{ "sign-up"?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const delen = (await params)["sign-up"] ?? [];
  const zoek = await searchParams;
  const eerste = (w: string | string[] | undefined) => (Array.isArray(w) ? w[0] : w);
  if (delen.length === 0 && !eerste(zoek.__clerk_ticket)) {
    const doel = eerste(zoek.redirect_url);
    redirect(`/?inloggen=aanmelden${doel ? `&redirect_url=${encodeURIComponent(doel)}` : ""}`);
  }
  return (
    <div className="clerk-pagina flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <SignUp />
      <InlogCodeTip />
    </div>
  );
}
