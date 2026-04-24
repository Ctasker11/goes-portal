import { cookies } from "next/headers";

export type Theme = "light" | "dark";

const THEME_COOKIE = "goes-theme";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === "dark" ? "dark" : "light";
}

export async function setThemeCookie(theme: Theme): Promise<void> {
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}
