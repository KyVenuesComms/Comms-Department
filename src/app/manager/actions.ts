"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MGR_COOKIE, checkPassword, sessionToken } from "@/lib/auth";

export interface LoginState {
  error: string | null;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const pw = String(formData.get("password") ?? "");
  if (!checkPassword(pw)) return { error: "Incorrect password." };
  (await cookies()).set(MGR_COOKIE, sessionToken()!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/manager");
}
