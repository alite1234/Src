import { ProjectorApp } from "@/components/projector/projector-app";
import { buildPublicLivePayload } from "@/lib/data/live";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Projector",
  description: "Audience-facing projection for the SRC Legislative Summit.",
};

export default async function ProjectPage() {
  const initialData = await buildPublicLivePayload();
  return <ProjectorApp initialData={initialData} />;
}
