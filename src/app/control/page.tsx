import { ControlDashboard } from "@/components/control/control-dashboard";
import { buildControlPayload } from "@/lib/data/live";

export const dynamic = "force-dynamic";

export default async function ControlPage() {
  const initialData = await buildControlPayload();
  return <ControlDashboard initialData={initialData} />;
}
