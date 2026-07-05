"use client";

import { Lock } from "lucide-react";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/manager/actions";

const initial: LoginState = { error: null };

export function ManagerLogin() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#E7E7E2" }}>
      <form
        action={action}
        className="w-full max-w-sm rounded-2xl border bg-white p-7"
        style={{ borderColor: "#E4E4DF", boxShadow: "0 1px 3px rgba(0,0,0,.05),0 18px 44px rgba(0,0,0,.08)" }}
      >
        <div className="flex items-center gap-2" style={{ color: "#1D5FCB" }}>
          <Lock size={18} aria-hidden="true" />
          <span className="text-[12.5px] font-bold uppercase tracking-[0.09em]">Leadership access</span>
        </div>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-[-0.015em]" style={{ color: "#131311" }}>
          Creative Operations cockpit
        </h1>
        <p className="mt-1 text-[13.5px]" style={{ color: "#6A6A63" }}>
          Enter the shared password to continue.
        </p>
        <input
          type="password"
          name="password"
          autoFocus
          aria-label="Password"
          placeholder="Password"
          style={{ background: "#F5F5F2", borderColor: "#E6E6E1", color: "#1B1B19" }}
          className="mt-5 w-full rounded-[10px] border px-3.5 py-2.5 text-[15px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
        />
        {state.error && (
          <p className="mt-2 text-[13px] font-medium" style={{ color: "#DB3B3B" }}>{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-[10px] py-2.5 text-[15px] font-semibold text-white disabled:opacity-60"
          style={{ background: "#1B1B19" }}
        >
          {pending ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
