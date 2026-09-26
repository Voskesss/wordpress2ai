"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { draaiGezondheid } from "@/lib/gezondheid";

export async function nuControleren() {
  await requireAdmin();
  await draaiGezondheid();
  revalidatePath("/admin/gezondheid");
}
