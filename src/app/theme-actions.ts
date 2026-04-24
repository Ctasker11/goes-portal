"use server";

import { revalidatePath } from "next/cache";
import { setThemeCookie, type Theme } from "@/lib/theme";

export async function setTheme(theme: Theme): Promise<void> {
  await setThemeCookie(theme);
  revalidatePath("/", "layout");
}
