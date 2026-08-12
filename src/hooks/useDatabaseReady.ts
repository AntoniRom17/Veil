import { useEffect, useState } from "react";
import { openDatabase } from "@/src/db/VeilDatabase";
import { toUserMessage } from "@/src/utils/errors";

type DatabaseState =
  | { status: "loading"; error?: undefined }
  | { status: "ready"; error?: undefined }
  | { status: "error"; error: string };

export function useDatabaseReady(): DatabaseState {
  const [state, setState] = useState<DatabaseState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    openDatabase()
      .then(() => {
        if (!cancelled) setState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", error: toUserMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
