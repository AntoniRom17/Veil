import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/src/components/common/EmptyState";
import { ScreenHeader } from "@/src/components/navigation/ScreenHeader";

export function RoutinesScreen() {
  return (
    <div className="screen">
      <ScreenHeader eyebrow="Your rhythm" title="Routines" description="Build the steps that make your skincare feel automatic." />
      <EmptyState icon={<CalendarDays size={26} />} title="Build your first routine." description="Start with a calm morning or evening ritual, then schedule it for the days that suit you." />
    </div>
  );
}
