"use client";

import { BottomNavigation } from "@/src/components/navigation/BottomNavigation";
import { ProductsScreen } from "@/src/features/products/ProductsScreen";
import { ProgressScreen } from "@/src/features/progress/ProgressScreen";
import { RoutinesScreen } from "@/src/features/routines/RoutinesScreen";
import { MoreScreen } from "@/src/features/settings/MoreScreen";
import { TodayScreen } from "@/src/features/today/TodayScreen";
import { useViewRouter } from "@/src/hooks/useViewRouter";

export function VeilApp() {
  const { view, navigate } = useViewRouter();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#veil-main">Skip to content</a>
      <main id="veil-main" className="app-shell__main" tabIndex={-1}>
        {view === "today" ? <TodayScreen onOpenRoutines={() => navigate("routines")} /> : null}
        {view === "routines" ? <RoutinesScreen /> : null}
        {view === "products" ? <ProductsScreen /> : null}
        {view === "progress" ? <ProgressScreen /> : null}
        {view === "more" ? <MoreScreen /> : null}
      </main>
      <BottomNavigation activeView={view} onNavigate={navigate} />
    </div>
  );
}
