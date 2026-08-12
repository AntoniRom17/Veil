import { Sparkles } from "lucide-react";
import { EmptyState } from "@/src/components/common/EmptyState";
import { ScreenHeader } from "@/src/components/navigation/ScreenHeader";

export function ProgressScreen() {
  return (
    <div className="screen">
      <ScreenHeader eyebrow="A gentler record" title="Progress" description="Notice patterns over time, without turning skincare into a score." />
      <EmptyState icon={<Sparkles size={26} />} title="Your history starts here." description="Complete a routine, write a journal entry, or add a photo when you’re ready." />
    </div>
  );
}
