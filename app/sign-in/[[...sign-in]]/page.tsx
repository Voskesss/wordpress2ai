import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import InlogCodeTip from "@/app/InlogCodeTip";

/** Kale sign-in-pagina: door naar de homepage, waar het venster als pop-up opent (zie InlogVenster).
 * Tussenstappen van Clerk (/sign-in/...) en links met een uitnodiging blijven hier gewoon werken. */
export default async function Pagina({
  params,
  searchParams,
}: {
  params: Promise<{ "sign-in"?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const delen = (await params)["sign-in"] ?? [];
  const zoek = await searchParams;
  const eerste = (w: string | string[] | undefined) => (Array.isArray(w) ? w[0] : w);
  if (delen.length === 0 && !eerste(zoek.__clerk_ticket)) {
    const doel = eerste(zoek.redirect_url);
    redirect(`/?inloggen=1${doel ? `&redirect_url=${encodeURIComponent(doel)}` : ""}`);
  }
  return (
    <div className="clerk-pagina flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <SignIn />
      <InlogCodeTip />
    </div>
  );
}
