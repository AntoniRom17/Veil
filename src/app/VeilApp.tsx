"use client";

import { lazy, Suspense, useState } from "react";
import { AppError, AppLoading } from "@/src/components/common/AppState";
import { BottomNavigation } from "@/src/components/navigation/BottomNavigation";
import { TodayScreen } from "@/src/features/today/TodayScreen";
import { Onboarding } from "@/src/features/onboarding/Onboarding";
import { useDatabaseReady } from "@/src/hooks/useDatabaseReady";
import { usePwa } from "@/src/hooks/usePwa";
import { useViewRouter } from "@/src/hooks/useViewRouter";
import { ONBOARDING_STORAGE_KEY } from "@/src/lib/constants";

const RoutinesScreen = lazy(() => import("@/src/features/routines/RoutinesScreen").then((module) => ({ default: module.RoutinesScreen })));
const ProductsScreen = lazy(() => import("@/src/features/products/ProductsScreen").then((module) => ({ default: module.ProductsScreen })));
const ProgressScreen = lazy(() => import("@/src/features/progress/ProgressScreen").then((module) => ({ default: module.ProgressScreen })));
const MoreScreen = lazy(() => import("@/src/features/settings/MoreScreen").then((module) => ({ default: module.MoreScreen })));

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
  const { offline } = usePwa();
  const [onboardingComplete, setOnboardingComplete] = useState(hasCompletedOnboarding);
  const { view, navigate } = useViewRouter();

  if (database.status === "loading") return <AppLoading />;
  if (database.status === "error") return <AppError message={database.error} />;
  if (!onboardingComplete) return <Onboarding onComplete={() => setOnboardingComplete(true)} />;

  return (
    <div className="app-shell">
      {offline ? <div className="offline-banner" role="status">Offline · your local Veil data is still available</div> : null}
      <a className="skip-link" href="#veil-main">Skip to content</a>
      <main id="veil-main" className="app-shell__main" tabIndex={-1}>
        <Suspense fallback={<div className="screen-loading" role="status">Opening…</div>}>
          {view === "today" ? <TodayScreen onOpenRoutines={() => navigate("routines")} onOpenProducts={() => navigate("products")} /> : null}
          {view === "routines" ? <RoutinesScreen /> : null}
          {view === "products" ? <ProductsScreen /> : null}
          {view === "progress" ? <ProgressScreen /> : null}
          {view === "more" ? <MoreScreen onNavigate={navigate} /> : null}
        </Suspense>
      </main>
      <BottomNavigation activeView={view} onNavigate={navigate} />
    </div>
  );
}
