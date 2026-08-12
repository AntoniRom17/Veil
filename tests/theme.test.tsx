import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTheme } from "@/src/hooks/useTheme";

describe("theme preferences", () => {
  it("persists an explicit dark theme and applies it to the document", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem("veil.theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("returns to system theme without leaving a stale override", () => {
    localStorage.setItem("veil.theme", "light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    act(() => result.current.setTheme("system"));
    expect(localStorage.getItem("veil.theme")).toBeNull();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
