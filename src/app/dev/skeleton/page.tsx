import { notFound } from "next/navigation";
import { AppShellSkeleton } from "@/components/shell/app-shell-skeleton";

// Anteprima NON di produzione dello scheletro di caricamento (AppShell + shimmer). 404 in prod.
export const dynamic = "force-dynamic";

export default function SkeletonPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AppShellSkeleton />;
}
