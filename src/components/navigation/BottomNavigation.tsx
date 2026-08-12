import { Beaker, CalendarDays, CircleUserRound, Sparkles, SunMedium } from "lucide-react";
import type { PrimaryView } from "@/src/hooks/useViewRouter";

const items: Array<{
  view: PrimaryView;
  label: string;
  icon: typeof SunMedium;
}> = [
  { view: "today", label: "Today", icon: SunMedium },
  { view: "routines", label: "Routine", icon: CalendarDays },
  { view: "products", label: "Products", icon: Beaker },
  { view: "progress", label: "Progress", icon: Sparkles },
  { view: "more", label: "More", icon: CircleUserRound },
];

interface BottomNavigationProps {
  activeView: PrimaryView;
  onNavigate(view: PrimaryView): void;
}

export function BottomNavigation({ activeView, onNavigate }: BottomNavigationProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="bottom-nav__inner">
        {items.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            type="button"
            className="bottom-nav__item"
            aria-current={view === activeView ? "page" : undefined}
            onClick={() => onNavigate(view)}
          >
            <span className="bottom-nav__icon">
              <Icon size={22} strokeWidth={view === activeView ? 2.15 : 1.75} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
