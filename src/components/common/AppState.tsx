import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

export function AppLoading() {
  return (
    <main className="app-state" aria-busy="true">
      <div className="veil-mark" aria-hidden="true"><span /></div>
      <p className="app-state__brand">VEIL</p>
      <p role="status">Opening your private shelf…</p>
    </main>
  );
}

export function AppError({ message }: { message: string }) {
  return (
    <main className="app-state">
      <div className="app-state__error-icon" aria-hidden="true"><AlertCircle size={26} /></div>
      <h1>Veil couldn’t open</h1>
      <p>{message}</p>
      <Button onClick={() => window.location.reload()}>Try again</Button>
    </main>
  );
}
