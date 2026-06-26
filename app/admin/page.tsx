import { cookies } from "next/headers";
import AdminDashboard from "@/components/AdminDashboard";
import AdminGate from "@/components/AdminGate";
import { fetchPendingPhotos, fetchAdminAnalyticsPhotos } from "@/lib/api";
import {
  ADMIN_COOKIE_NAME,
  getAdminEnv,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const LOADING_FALLBACK = (
  <div className="w-full min-h-screen flex items-center justify-center bg-[#F5F0E8] text-[#0F3460] font-sans font-bold">
    Loading System Control Deck Security Verification...
  </div>
);

async function readAdminToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? null;
  } catch (error) {
    console.error("[admin] cookies() unavailable in this context:", error);
    return null;
  }
}

export default async function AdminPage() {
  let authed = false;

  try {
    const { secret } = getAdminEnv();
    const token = await readAdminToken();
    if (token) {
      authed = verifyAdminSessionToken(token, secret);
    }
  } catch (error) {
    console.error("[admin] session verification failed:", error);
    authed = false;
  }

  if (!authed) {
    return <AdminGate loadingFallback={LOADING_FALLBACK} />;
  }

  try {
    const [initialPending, initialAll] = await Promise.all([
      fetchPendingPhotos(),
      fetchAdminAnalyticsPhotos(),
    ]);

    return (
      <AdminDashboard
        initialPending={initialPending}
        initialAll={initialAll}
      />
    );
  } catch (error) {
    console.error("[admin] dashboard data fetch failed:", error);
    return <AdminGate loadingFallback={LOADING_FALLBACK} />;
  }
}