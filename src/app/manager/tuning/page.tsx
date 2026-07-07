import { cookies } from "next/headers";
import { ManagerLogin } from "@/features/cockpit/ManagerLogin";
import { TuningManager } from "@/features/cockpit/TuningManager";
import { MGR_COOKIE, isAuthed, managerConfigured } from "@/lib/auth";
import { getTuning } from "@/lib/queue/tuning-store";

export const dynamic = "force-dynamic";

export default async function TuningPage() {
  if (!managerConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#E7E7E2" }}>
        <div className="max-w-md rounded-2xl border bg-white px-6 py-5 text-center" style={{ borderColor: "#E4E4DF" }}>
          <p className="font-semibold" style={{ color: "#131311" }}>Not set up yet</p>
          <p className="mt-1 text-sm" style={{ color: "#6A6A63" }}>Set MANAGER_PASSWORD in the environment to manage tuning.</p>
        </div>
      </div>
    );
  }
  const store = await cookies();
  if (!isAuthed(store.get(MGR_COOKIE)?.value)) {
    return <ManagerLogin />;
  }
  const tuning = await getTuning();
  return <TuningManager tuning={tuning} />;
}
