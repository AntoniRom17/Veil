import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/src/components/common/EmptyState";
import { ScreenHeader } from "@/src/components/navigation/ScreenHeader";
import { formatCalendarDate } from "@/src/utils/dates";

interface TodayScreenProps {
  onOpenRoutines(): void;
}

export function TodayScreen({ onOpenRoutines }: TodayScreenProps) {
  return (
    <div className="screen screen--today">
      <ScreenHeader eyebrow={formatCalendarDate(new Date())} title="Today" description="Your next step, right where you need it." />
      <div className="day-part-card">
        <div><span className="day-part-card__sun" aria-hidden="true" /> <span>Morning</span></div>
        <span>No routine yet</span>
      </div>
      <EmptyState
        icon={<CalendarDays size={26} />}
        title="Your ritual starts here."
        description="Create a routine and Veil will bring the right steps to Today automatically."
        action={<button className="button button--primary" type="button" onClick={onOpenRoutines}>Create a routine</button>}
      />
    </div>
  );
}
