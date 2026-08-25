import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireUser() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

export async function requireAdmin() {
  await requireUser();
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") redirect("/portal");
  return user;
}

/** Is de huidige gebruiker admin? (zonder redirect) */
export async function isBeheerder(): Promise<boolean> {
  const user = await currentUser();
  return user?.publicMetadata?.role === "admin";
}
