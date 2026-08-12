import { useCallback, useEffect, useState } from "react";

export type PrimaryView = "today" | "routines" | "products" | "progress" | "more";

const VALID_VIEWS = new Set<PrimaryView>(["today", "routines", "products", "progress", "more"]);

function readView(): PrimaryView {
  if (typeof window === "undefined") return "today";
  const value = new URLSearchParams(window.location.search).get("view") as PrimaryView | null;
  return value && VALID_VIEWS.has(value) ? value : "today";
}

export function useViewRouter() {
  const [view, setView] = useState<PrimaryView>(readView);

  useEffect(() => {
    const handlePopState = () => setView(readView());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((nextView: PrimaryView) => {
    const url = new URL(window.location.href);
    if (nextView === "today") url.searchParams.delete("view");
    else url.searchParams.set("view", nextView);
    window.history.pushState({ view: nextView }, "", url);
    window.scrollTo({ top: 0 });
    setView(nextView);
  }, []);

  return { view, navigate };
}
