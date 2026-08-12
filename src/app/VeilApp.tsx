"use client";

import { useState } from "react";
import { AppError, AppLoading } from "@/src/components/common/AppState";
import { BottomNavigation } from "@/src/components/navigation/BottomNavigation";
import { ProductsScreen } from "@/src/features/products/ProductsScreen";
import { ProgressScreen } from "@/src/features/progress/ProgressScreen";
import { RoutinesScreen } from "@/src/features/routines/RoutinesScreen";
import { MoreScreen } from "@/src/features/settings/MoreScreen";
import { TodayScreen } from "@/src/features/today/TodayScreen";
import { Onboarding } from "@/src/features/onboarding/Onboarding";
import { useDatabaseReady } from "@/src/hooks/useDatabaseReady";
import { useViewRouter } from "@/src/hooks/useViewRouter";
import { ONBOARDING_STORAGE_KEY } from "@/src/lib/constants";

function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "complete";
  } catch {
    return true;
  }
}

export function VeilApp() {
  const database = useDatabaseReady();
  const [onboardingComplete, setOnboardingComplete] = useState(hasCompletedOnboarding);
  const { view, navigate } = useViewRouter();

  if (database.status === "loading") return <AppLoading />;
  if (database.status === "error") return <AppError message={database.error} />;
  if (!onboardingComplete) return <Onboarding onComplete={() => setOnboardingComplete(true)} />;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#veil-main">Skip to content</a>
      <main id="veil-main" className="app-shell__main" tabIndex={-1}>
        {view === "today" ? <TodayScreen onOpenRoutines={() => navigate("routines")} onOpenProducts={() => navigate("products")} /> : null}
        {view === "routines" ? <RoutinesScreen /> : null}
        {view === "products" ? <ProductsScreen /> : null}
        {view === "progress" ? <ProgressScreen /> : null}
        {view === "more" ? <MoreScreen /> : null}
      </main>
      <BottomNavigation activeView={view} onNavigate={navigate} />
    </div>
  );
}
