import { VeilApp } from "@/src/app/VeilApp";
import { VeilErrorBoundary } from "@/src/app/VeilErrorBoundary";

export default function HomePage() {
  return (
    <VeilErrorBoundary>
      <VeilApp />
    </VeilErrorBoundary>
  );
}
